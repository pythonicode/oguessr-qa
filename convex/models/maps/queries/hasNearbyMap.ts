import { zInternalQuery } from "../../../helpers/zod";
import { z } from "zod";

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in kilometers.
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const MIN_DISTANCE_KM = 0.5;

/**
 * Internal query to check if there's an existing map within MIN_DISTANCE_KM of the given location
 * or with the exact same map name.
 * Used to skip processing entire classes that are too close to existing maps or duplicates.
 * 
 * OPTIMIZATION NOTE: This query scans all maps for distance calculations.
 * For large datasets (thousands of maps), consider implementing:
 * 1. Geohashing or S2 cell indexing for spatial queries
 * 2. Bounding box pre-filtering using lat/lng indexes
 * 3. Moving this logic to an action that can use external geospatial services
 * 
 * Current implementation is acceptable for small to medium datasets (< 10,000 maps).
 */
export const hasNearbyMap = zInternalQuery({
    args: {
        latitude: z.number(),
        longitude: z.number(),
        mapName: z.string().optional(),
    },
    returns: z.object({
        hasNearby: z.boolean(),
        nearbyMapName: z.string().optional(),
        distance: z.number().optional(),
        reason: z.enum(["distance", "duplicate_name"]).optional(),
    }),
    handler: async ({ db }, args) => {
        // OPTIMIZED: Use async iteration instead of .collect() to be more memory-efficient
        // This allows early return without loading all maps into memory at once

        // Check for duplicate name and nearby maps in a single pass
        for await (const existingMap of db.query("maps")) {
            // First check for duplicate name
            if (args.mapName && existingMap.name === args.mapName) {
                return {
                    hasNearby: true,
                    nearbyMapName: existingMap.name ?? existingMap._id,
                    reason: "duplicate_name" as const,
                };
            }

            // Then check distance
            const distance = calculateDistanceKm(
                args.latitude,
                args.longitude,
                existingMap.location.latitude,
                existingMap.location.longitude
            );

            if (distance < MIN_DISTANCE_KM) {
                return {
                    hasNearby: true,
                    nearbyMapName: existingMap.name ?? existingMap._id,
                    distance,
                    reason: "distance" as const,
                };
            }
        }

        return { hasNearby: false };
    },
});

