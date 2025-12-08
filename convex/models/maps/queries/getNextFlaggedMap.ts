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
 * Get the next map that has flags.
 * Used in the flags review process to iterate through flagged maps.
 * NOTE: This query needs to check for non-empty flags arrays, which can't be
 * efficiently indexed. Consider adding a `hasFlagsToReview` boolean field for better performance.
 */
export const getNextFlaggedMap = zQuery({
    args: {},
    returns: z.nullable(mapWithIdSchema),
    handler: async ({ db }) => {
        // Unfortunately, checking for non-empty arrays can't use an index efficiently
        // We need to iterate through maps to find one with actual flags
        // For better performance at scale, consider adding a boolean field like `hasFlagsToReview`
        
        // Use async iteration to avoid loading all maps at once
        // This is more memory-efficient than .collect()
        for await (const map of db.query("maps")) {
            if (map.flags && map.flags.length > 0) {
                return map;
            }
        }
        
        return null;
    },
});

