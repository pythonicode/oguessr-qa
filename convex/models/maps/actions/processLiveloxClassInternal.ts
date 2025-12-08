"use node";

import { z } from "zod";
import { zInternalAction } from "../../../helpers/zod";
import { processClass, tileInfoSchema, type ProcessResult } from "./helpers";

/**
 * Internal action to process a single Livelox class ID.
 * Used for batch processing.
 */
export const processLiveloxClassInternal = zInternalAction({
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

