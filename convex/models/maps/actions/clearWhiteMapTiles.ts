"use node";

import { v } from "convex/values";
import { internalAction } from "../../../_generated/server";
import { internal } from "../../../_generated/api";
import Jimp from "jimp";

/**
 * Analyzes an image to determine if it's predominantly white.
 * A pixel is considered "white" if R, G, and B are all >= 0xF0 (240).
 * Returns true if >99% of pixels are white.
 */
async function isImagePredominantlyWhite(imageUrl: string): Promise<boolean> {
    try {
        // Fetch and load the image using Jimp
        const image = await Jimp.read(imageUrl);

        const width = image.getWidth();
        const height = image.getHeight();
        const totalPixels = width * height;
        let whitePixels = 0;
        const WHITE_THRESHOLD = 0xF0; // 240 in decimal

        // Analyze each pixel
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const color = image.getPixelColor(x, y);

                // Extract RGB values from the color
                // Jimp stores colors as 32-bit integers in RGBA format
                const r = (color >> 24) & 0xFF;
                const g = (color >> 16) & 0xFF;
                const b = (color >> 8) & 0xFF;
                // Alpha is (color & 0xFF), but we don't need it

                // Check if all RGB channels are >= 0xF0
                if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
                    whitePixels++;
                }
            }
        }

        const whitePercentage = (whitePixels / totalPixels) * 100;

        // Return true if more than 99% of pixels are white
        return whitePercentage > 99;
    } catch (error) {
        console.warn(`Error analyzing image ${imageUrl}:`, error);
        return false;
    }
}

/**
 * Internal action to clear map tiles that are predominantly white (>99% white pixels).
 * A pixel is considered white if R, G, and B are all >= 0xF0 (240).
 * 
 * This is useful for removing blank/empty map tiles that don't provide value
 * for the game.
 * 
 * OPTIMIZED: Now uses cursor-based pagination instead of offset/limit.
 */
export const clearWhiteMapTiles = internalAction({
    args: {
        batchSize: v.optional(v.number()),
        cursor: v.optional(v.string()),
        dryRun: v.optional(v.boolean()),
    },
    returns: v.object({
        totalChecked: v.number(),
        whiteImagesFound: v.number(),
        deleted: v.number(),
        isDone: v.boolean(),
        continueCursor: v.string(),
    }),
    handler: async (ctx, args) => {
        const { batchSize = 100, cursor, dryRun = false } = args;

        console.log(`\n=== Clearing White Map Tiles ===`);
        console.log(`Batch size: ${batchSize}`);
        console.log(`Cursor: ${cursor ?? 'null (starting from beginning)'}`);
        console.log(`Dry run: ${dryRun ? 'YES (no deletions will occur)' : 'NO (will delete white tiles)'}`);
        console.log(`Threshold: >99% pixels with RGB >= 0xF0\n`);

        // OPTIMIZED: Fetch maps using cursor-based pagination
        const result: {
            maps: Array<any>;
            isDone: boolean;
            continueCursor: string;
        } = await ctx.runQuery(internal.models.maps.queries.getMapById.getAllMaps, {
            limit: batchSize,
            cursor: cursor,
        });

        if (!result.maps || result.maps.length === 0) {
            console.log("No maps found to check.");
            return {
                totalChecked: 0,
                whiteImagesFound: 0,
                deleted: 0,
                isDone: true,
                continueCursor: result.continueCursor,
            };
        }

        let totalChecked = 0;
        let whiteImagesFound = 0;
        let deleted = 0;

        for (const map of result.maps) {
            totalChecked++;
            const progress = `[${totalChecked}/${result.maps.length}]`;

            try {
                const isWhite = await isImagePredominantlyWhite(map.imageUrl);

                if (isWhite) {
                    whiteImagesFound++;
                    console.log(`${progress} ⚪ Found white tile: "${map.name || 'Unnamed'}" (${map._id})`);

                    if (!dryRun) {
                        await ctx.runMutation(
                            internal.models.maps.mutations.deleteMap.deleteMapInternal,
                            { mapId: map._id }
                        );
                        deleted++;
                        console.log(`${progress} ✓ Deleted map ${map._id}`);
                    }
                } else {
                    console.log(`${progress} ✓ "${map.name || 'Unnamed'}" - OK`);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn(`${progress} ✗ Error processing map ${map._id}: ${errorMessage}`);
            }
        }

        console.log(`\n=== Summary ===`);
        console.log(`Total checked: ${totalChecked}`);
        console.log(`White images found: ${whiteImagesFound}`);
        console.log(`Deleted: ${deleted}`);
        console.log(`Is done: ${result.isDone}`);
        if (!result.isDone) {
            console.log(`Continue with cursor: ${result.continueCursor}`);
        }
        if (dryRun && whiteImagesFound > 0) {
            console.log(`\nNote: This was a dry run. Run with dryRun=false to actually delete white tiles.`);
        }

        return {
            totalChecked,
            whiteImagesFound,
            deleted,
            isDone: result.isDone,
            continueCursor: result.continueCursor,
        };
    },
});

