"use node";

import { z } from "zod";
import { zAction } from "../../../helpers/zod";
import { processClass, tileInfoSchema, type ProcessResult } from "./helpers";

/**
 * Process a single Livelox class ID and create map entries for each tile.
 * Returns tile URLs for preview in the UI.
 */
export const processLiveloxClass = zAction({
    args: {
        classId: z.number(),
    },
    returns: z.object({
        classId: z.number(),
        success: z.boolean(),
        mapName: z.string().optional(),
        tilesCreated: z.number(),
        error: z.string().optional(),
        tiles: z.array(tileInfoSchema),
        mapLocation: z.object({
            latitude: z.number(),
            longitude: z.number(),
        }).optional(),
    }),
    handler: async (ctx, args): Promise<ProcessResult> => {
        return await processClass(ctx, args.classId);
    },
});

