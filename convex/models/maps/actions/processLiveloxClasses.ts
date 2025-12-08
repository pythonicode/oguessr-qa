"use node";

import { z } from "zod";
import { zInternalAction } from "../../../helpers/zod";
import { processClass, tileInfoSchema, type ProcessResult } from "./helpers";

/**
 * Process multiple Livelox class IDs and create map entries for each tile.
 */
export const processLiveloxClasses = zInternalAction({
    args: {
        classIds: z.array(z.number()),
    },
    returns: z.object({
        totalProcessed: z.number(),
        totalTilesCreated: z.number(),
        results: z.array(z.object({
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
        })),
    }),
    handler: async (ctx, args) => {
        const results: Array<ProcessResult> = [];
        let totalTilesCreated = 0;

        for (const classId of args.classIds) {
            const result = await processClass(ctx, classId);
            results.push(result);

            if (result.success) {
                totalTilesCreated += result.tilesCreated;
            }
        }

        return {
            totalProcessed: args.classIds.length,
            totalTilesCreated,
            results,
        };
    },
});

