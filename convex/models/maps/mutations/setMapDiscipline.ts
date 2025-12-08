import { zMutation } from "../../../helpers/zod";
import { z } from "zod";
import { zid } from "convex-helpers/server/zod4";

/**
 * Update a map's discipline (sprint or forest).
 * Used in the review process to categorize maps.
 */
export const setMapDiscipline = zMutation({
    args: {
        mapId: zid("maps"),
        discipline: z.enum(["sprint", "forest"]),
    },
    returns: z.null(),
    handler: async ({ db }, args) => {
        await db.patch(args.mapId, { discipline: args.discipline });
        return null;
    },
});

