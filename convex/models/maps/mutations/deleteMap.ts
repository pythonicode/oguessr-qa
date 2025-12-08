import { zMutation, zInternalMutation } from "../../../helpers/zod";
import { z } from "zod";
import { zid } from "convex-helpers/server/zod4";

/**
 * Delete a map from the database.
 * Used in the review process to remove inadequate maps.
 */
export const deleteMap = zMutation({
    args: {
        mapId: zid("maps"),
    },
    returns: z.null(),
    handler: async ({ db }, args) => {
        await db.delete(args.mapId);
        return null;
    },
});

/**
 * Internal mutation for deleting maps from actions.
 * Used by batch processing actions like clearWhiteMapTiles.
 */
export const deleteMapInternal = zInternalMutation({
    args: {
        mapId: zid("maps"),
    },
    returns: z.null(),
    handler: async ({ db }, args) => {
        await db.delete(args.mapId);
        return null;
    },
});

