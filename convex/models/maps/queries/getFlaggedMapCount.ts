import { zQuery } from "../../../helpers/zod";
import { z } from "zod";

/**
 * Get the count of maps with flags.
 * NOTE: This query needs to scan all maps to check for non-empty flags arrays.
 * Consider adding a separate boolean field `hasFlagsToReview` to the schema
 * for better performance at scale.
 */
export const getFlaggedMapCount = zQuery({
    args: {},
    returns: z.number(),
    handler: async ({ db }) => {
        // Unfortunately, Convex doesn't support indexes on array length
        // So we still need to collect and filter in memory
        // For better performance at scale, consider:
        // 1. Adding a `hasFlagsToReview: boolean` field to schema
        // 2. Using that field with an index: .index("by_hasFlagsToReview", ["hasFlagsToReview"])
        const allMaps = await db.query("maps").collect();
        const flaggedMaps = allMaps.filter((map) => map.flags && map.flags.length > 0);
        return flaggedMaps.length;
    },
});

