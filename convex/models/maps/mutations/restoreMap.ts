import { zMutation } from "../../../helpers/zod";
import { mapSchema } from "../schema";
import { z } from "zod";

/**
 * Restore a deleted map by recreating it with all its original data.
 * Used in the undo process to restore a deleted map.
 */
export const restoreMap = zMutation({
    args: mapSchema,
    returns: z.string(),
    handler: async ({ db }, args) => {
        const mapId = await db.insert("maps", args);
        return mapId;
    },
});

