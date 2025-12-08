import { zMutation } from "../../../helpers/zod";
import { z } from "zod";
import { zid } from "convex-helpers/server/zod4";

/**
 * Clear a map's discipline (set it back to undefined).
 * Used in the undo process to revert a sprint/forest marking.
 */
export const clearMapDiscipline = zMutation({
    args: {
        mapId: zid("maps"),
    },
    returns: z.null(),
    handler: async ({ db }, args) => {
        await db.patch(args.mapId, { discipline: undefined });
        return null;
    },
});

