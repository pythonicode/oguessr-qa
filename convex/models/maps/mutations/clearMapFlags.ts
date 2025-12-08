import { zMutation } from "../../../helpers/zod";
import { z } from "zod";
import { zid } from "convex-helpers/server/zod4";

/**
 * Clear a map's flags (set it back to an empty array).
 * Used when keeping a flagged map after review.
 */
export const clearMapFlags = zMutation({
    args: {
        mapId: zid("maps"),
    },
    returns: z.null(),
    handler: async ({ db }, args) => {
        await db.patch(args.mapId, { flags: [] });
        return null;
    },
});

