"use node";

import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { ActionCtx } from "../../../_generated/server";

// Livelox API response types
interface LiveloxTile {
    x: number;
    y: number;
    width: number;
    height: number;
    url: string;
}

interface LiveloxMapData {
    map: {
        identifier: {
            system: number;
            id: string;
        };
        name: string;
        center: {
            latitude: number;
            longitude: number;
        };
        // Full map dimensions and URL
        width: number;
        height: number;
        url: string;
        tiles: LiveloxTile[];
    };
}

// Minimum tile dimension threshold - tiles smaller than this are discarded
const MIN_TILE_DIMENSION = 512;
// Maximum map dimension for using full image instead of tiles
const MAX_FULL_MAP_DIMENSION = 2048;
// Maximum number of tiles to keep after processing
const MAX_TILES_TO_SAMPLE = 10;

export interface TileInfo {
    imageUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ProcessResult {
    classId: number;
    success: boolean;
    mapName?: string;
    tilesCreated: number;
    error?: string;
    tiles: TileInfo[];
    mapLocation?: {
        latitude: number;
        longitude: number;
    };
}

// Schema for tile info returned to the client
export const tileInfoSchema = z.object({
    imageUrl: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
});

/**
 * Processes a grid of tiles by:
 * 1. Removing edge tiles if the grid is 3x3 or larger
 * 2. Sampling up to MAX_TILES_TO_SAMPLE from the remaining tiles
 */
function processTileGrid(tiles: LiveloxTile[]): LiveloxTile[] {
    if (tiles.length === 0) {
        return tiles;
    }

    // Determine grid dimensions by finding unique x and y positions
    const uniqueX = [...new Set(tiles.map(t => t.x))].sort((a, b) => a - b);
    const uniqueY = [...new Set(tiles.map(t => t.y))].sort((a, b) => a - b);

    const gridWidth = uniqueX.length;
    const gridHeight = uniqueY.length;

    let processedTiles = tiles;

    // If grid is 3x3 or larger, remove edge tiles
    if (gridWidth >= 3 && gridHeight >= 3) {
        // Get the edge positions to exclude
        const minX = uniqueX[0];
        const maxX = uniqueX[uniqueX.length - 1];
        const minY = uniqueY[0];
        const maxY = uniqueY[uniqueY.length - 1];

        // Keep only tiles that are not on the edges
        processedTiles = tiles.filter(tile =>
            tile.x !== minX && tile.x !== maxX &&
            tile.y !== minY && tile.y !== maxY
        );
    }

    // If we still have more than MAX_TILES_TO_SAMPLE, randomly sample
    if (processedTiles.length > MAX_TILES_TO_SAMPLE) {
        // Shuffle and take first MAX_TILES_TO_SAMPLE
        const shuffled = [...processedTiles];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        processedTiles = shuffled.slice(0, MAX_TILES_TO_SAMPLE);
    }

    return processedTiles;
}

/**
 * Fetches class data from Livelox ClassBlob API for a given classId.
 * This single API call returns all map data including tiles.
 */
async function fetchLiveloxClassBlob(classId: number): Promise<LiveloxMapData> {
    const classBlobUrl = "https://www.livelox.com/Data/ClassBlob";

    const payload = {
        eventId: null,
        classIds: [classId],
        courseIds: null,
        relayLegs: [],
        relayLegGroupIds: [],
        routeReductionProperties: {
            distanceTolerance: 1,
            speedTolerance: 0.1,
        },
        includeMap: true,
        includeCourses: true,
        skipStoreInCache: false,
    };

    const response = await fetch(classBlobUrl, {
        method: "POST",
        headers: {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json",
            "pragma": "no-cache",
            "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch class blob: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Helper function to process a single Livelox class.
 * This is shared between the single and batch actions.
 * Checks for nearby maps at the class level to skip entire classes
 * rather than individual tiles.
 */
export async function processClass(ctx: ActionCtx, classId: number): Promise<ProcessResult> {
    try {
        // Fetch data from Livelox ClassBlob API
        const data = await fetchLiveloxClassBlob(classId);

        const mapData = data.map;
        const mapName = mapData.name;
        const mapId = mapData.identifier.id;
        const center = mapData.center;
        const mapWidth = mapData.width;
        const mapHeight = mapData.height;
        const fullMapUrl = mapData.url;
        const tiles = mapData.tiles;

        // Check if there's already a map near this location before processing any tiles
        const nearbyCheck = await ctx.runQuery(
            internal.models.maps.queries.hasNearbyMap.hasNearbyMap,
            { latitude: center.latitude, longitude: center.longitude, mapName }
        );

        if (nearbyCheck.hasNearby) {
            const errorMessage = nearbyCheck.reason === "duplicate_name"
                ? `Skipped: map with name "${nearbyCheck.nearbyMapName}" already exists`
                : `Skipped: existing map "${nearbyCheck.nearbyMapName}" is ${nearbyCheck.distance?.toFixed(2)}km away`;

            return {
                classId,
                success: true,
                mapName,
                tilesCreated: 0,
                error: errorMessage,
                tiles: [],
                mapLocation: {
                    latitude: center.latitude,
                    longitude: center.longitude,
                },
            };
        }

        const createdTiles: TileInfo[] = [];

        // If the full map is small enough, use it directly instead of tiles
        if (mapWidth < MAX_FULL_MAP_DIMENSION && mapHeight < MAX_FULL_MAP_DIMENSION) {
            await ctx.runMutation(internal.models.maps.mutations.createMapInternal.createMapInternal, {
                name: mapName,
                location: {
                    latitude: center.latitude,
                    longitude: center.longitude,
                },
                imageUrl: fullMapUrl,
                liveloxClassId: classId,
                liveloxMapId: mapId,
                tile: {
                    x: 0,
                    y: 0,
                    width: mapWidth,
                    height: mapHeight,
                },
            });

            createdTiles.push({
                imageUrl: fullMapUrl,
                x: 0,
                y: 0,
                width: mapWidth,
                height: mapHeight,
            });

            return {
                classId,
                success: true,
                mapName,
                tilesCreated: 1,
                tiles: createdTiles,
                mapLocation: {
                    latitude: center.latitude,
                    longitude: center.longitude,
                },
            };
        }

        if (!tiles || tiles.length === 0) {
            return {
                classId,
                success: false,
                mapName,
                tilesCreated: 0,
                error: "No tiles found in the map data",
                tiles: [],
            };
        }

        // Filter out tiles that are too small (width or height < MIN_TILE_DIMENSION)
        const validTiles = tiles.filter(
            (tile) => tile.width >= MIN_TILE_DIMENSION && tile.height >= MIN_TILE_DIMENSION
        );

        if (validTiles.length === 0) {
            return {
                classId,
                success: false,
                mapName,
                tilesCreated: 0,
                error: `All ${tiles.length} tiles were filtered out (dimensions below ${MIN_TILE_DIMENSION}px threshold)`,
                tiles: [],
            };
        }

        // Process tiles: remove edge tiles if grid is 3x3 or larger, then sample up to 10
        const processedTiles = processTileGrid(validTiles);

        // Create a map entry for each processed tile
        let tilesCreated = 0;
        for (const tile of processedTiles) {
            await ctx.runMutation(internal.models.maps.mutations.createMapInternal.createMapInternal, {
                name: mapName,
                location: {
                    latitude: center.latitude,
                    longitude: center.longitude,
                },
                imageUrl: tile.url,
                liveloxClassId: classId,
                liveloxMapId: mapId,
                tile: {
                    x: tile.x,
                    y: tile.y,
                    width: tile.width,
                    height: tile.height,
                },
            });
            createdTiles.push({
                imageUrl: tile.url,
                x: tile.x,
                y: tile.y,
                width: tile.width,
                height: tile.height,
            });
            tilesCreated++;
        }

        return {
            classId,
            success: true,
            mapName,
            tilesCreated,
            tiles: createdTiles,
            mapLocation: {
                latitude: center.latitude,
                longitude: center.longitude,
            },
        };
    } catch (error) {
        return {
            classId,
            success: false,
            tilesCreated: 0,
            error: error instanceof Error ? error.message : String(error),
            tiles: [],
        };
    }
}

