import { z } from "zod";
import { defineTable } from "convex/server";
import { zodOutputToConvex } from "convex-helpers/server/zod";
import { countryCodes } from "../../helpers/countries";

export const mapSchema = z.object({
    name: z.string().optional(),
    contribution: z.string().optional(),
    location: z.object({
        latitude: z.number(),
        longitude: z.number(),
        name: z.string().optional(),
    }),
    discipline: z.enum(["sprint", "forest"]).optional(),
    country: z.enum(countryCodes).optional(),
    imageUrl: z.url(),
    // Livelox-specific fields
    liveloxClassId: z.number().optional(),
    liveloxMapId: z.string().optional(),
    tile: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
    }).optional(),
    averageScore: z.number().optional(),
    flags: z.array(z.enum(["too_easy", "too_hard", "wrong_discipline", "inappropriate", "bad_image", "other"])).optional().default([]),
})

export type Map = z.infer<typeof mapSchema>;

export const convexMapsTableSchema = defineTable(zodOutputToConvex(mapSchema))
    .index("by_liveloxClassId", ["liveloxClassId"])
    .index("by_liveloxMapId", ["liveloxMapId"])
    .index("by_discipline", ["discipline"]);