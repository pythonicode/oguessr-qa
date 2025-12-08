import { zQuery } from "../../../helpers/zod";
import { z } from "zod";

/**
 * Get the count of remaining unreviewed maps.
 * OPTIMIZED: Uses index on discipline field to efficiently find undefined values.
 */
export const getUnreviewedMapCount = zQuery({
    args: {},
    returns: z.number(),
    handler: async ({ db }) => {
        // OPTIMIZED: Use index to efficiently query maps without discipline
        const unreviewedMaps = await db
            .query("maps")
            .withIndex("by_discipline", (q) => q.eq("discipline", undefined))
            .collect();

        return unreviewedMaps.length;
    },
});

