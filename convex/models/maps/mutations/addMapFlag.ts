import { zMutation } from "../../../helpers/zod";
import { z } from "zod";
import { zid } from "convex-helpers/server/zod4";

/**
 * Add a flag to a map's flags array.
 * Used to report problems with maps (too easy, too hard, wrong discipline, etc.)
 */
export const addMapFlag = zMutation({
    args: {
        mapId: zid("maps"),
        flag: z.enum(["too_easy", "too_hard", "wrong_discipline", "inappropriate", "bad_image", "other"]),
    },
    returns: z.null(),
    handler: async ({ db }, args) => {
        const map = await db.get(args.mapId);
        if (!map) {
            throw new Error("Map not found");
        }
        const existingFlags = map.flags ?? [];
        if (!existingFlags.includes(args.flag)) {
            await db.patch(args.mapId, { flags: [...existingFlags, args.flag] });
        }
        return null;
    },
});

