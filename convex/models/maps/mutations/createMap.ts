import { zMutation } from "../../../helpers/zod";
import { mapSchema } from "../schema";
import { z } from "zod";

export const createMap = zMutation({
    args: mapSchema,
    returns: z.string(),
    handler: async ({ db }, args) => {
        const mapId = await db.insert("maps", args);
        return mapId;
    },
});

