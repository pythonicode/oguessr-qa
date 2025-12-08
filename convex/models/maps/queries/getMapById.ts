import { zQuery, zInternalQuery } from "../../../helpers/zod";
import { mapSchema } from "../schema";
import { z } from "zod";
import { zid } from "convex-helpers/server/zod4";

// Extended schema that includes system fields
const mapWithIdSchema = mapSchema.extend({
    _id: zid("maps"),
    _creationTime: z.number(),
});

/**
 * Get a specific map by ID.
 * Used to fetch a restored map after undo.
 */
export const getMapById = zQuery({
    args: {
        mapId: zid("maps"),
    },
    returns: z.nullable(mapWithIdSchema),
    handler: async ({ db }, args) => {
        return await db.get(args.mapId);
    },
});

/**
 * Internal query to get all maps with pagination support.
 * Used by internal actions for batch processing.
 * OPTIMIZED: Uses proper pagination instead of offset/limit pattern.
 */
export const getAllMaps = zInternalQuery({
    args: {
        limit: z.number().optional(),
        cursor: z.string().optional(),
    },
    returns: z.object({
        maps: z.array(mapWithIdSchema),
        isDone: z.boolean(),
        continueCursor: z.string(),
    }),
    handler: async ({ db }, args) => {
        // OPTIMIZED: Use pagination instead of inefficient offset/limit
        // This is much more efficient for large datasets
        const result = await db
            .query("maps")
            .paginate({
                cursor: args.cursor ?? null,
                numItems: args.limit ?? 100, // Default page size of 100
            });

        return {
            maps: result.page,
            isDone: result.isDone,
            continueCursor: result.continueCursor,
        };
    },
});

