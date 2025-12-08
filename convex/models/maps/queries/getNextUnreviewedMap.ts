import { zQuery } from "../../../helpers/zod";
import { mapSchema } from "../schema";
import { z } from "zod";
import { zid } from "convex-helpers/server/zod4";

// Extended schema that includes system fields
const mapWithIdSchema = mapSchema.extend({
    _id: zid("maps"),
    _creationTime: z.number(),
});

/**
 * Get the next map that hasn't been reviewed yet (no discipline set).
 * Used in the review process to iterate through unreviewed maps.
 * OPTIMIZED: Uses index on discipline field for efficient querying.
 */
export const getNextUnreviewedMap = zQuery({
    args: {},
    returns: z.nullable(mapWithIdSchema),
    handler: async ({ db }) => {
        // OPTIMIZED: Use index to efficiently query maps without discipline
        const unreviewedMap = await db
            .query("maps")
            .withIndex("by_discipline", (q) => q.eq("discipline", undefined))
            .first();

        return unreviewedMap;
    },
});

