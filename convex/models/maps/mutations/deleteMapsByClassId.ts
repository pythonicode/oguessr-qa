import { zMutation } from "../../../helpers/zod";
import { z } from "zod";

/**
 * Delete all maps with the same liveloxClassId.
 * Used in the review process to remove all maps from a problematic class.
 */
export const deleteMapsByClassId = zMutation({
    args: {
        liveloxClassId: z.number(),
    },
    returns: z.number(),
    handler: async ({ db }, args) => {
        // Find all maps with this classId
        const maps = await db
            .query("maps")
            .withIndex("by_liveloxClassId", (q) => 
                q.eq("liveloxClassId", args.liveloxClassId)
            )
            .collect();
        
        // Delete each map
        for (const map of maps) {
            await db.delete(map._id);
        }
        
        // Return the count of deleted maps
        return maps.length;
    },
});

