import { zInternalMutation } from "../../../helpers/zod";
import { mapSchema } from "../schema";
import { zid } from "convex-helpers/server/zod4";

/**
 * Internal mutation for creating maps from actions.
 * This is used by the Livelox processing actions.
 * Note: Distance checking is done at the class level in helpers.ts
 * to skip entire classes rather than individual tiles.
 */
export const createMapInternal = zInternalMutation({
    args: mapSchema,
    returns: zid("maps"),
    handler: async ({ db }, args) => {
        const mapId = await db.insert("maps", args);
        return mapId;
    },
});

