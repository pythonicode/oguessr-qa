import { zQuery } from "../../../helpers/zod";
import { mapSchema } from "../schema";
import { z } from "zod";
import { zid } from "convex-helpers/server/zod4";

// Extended schema that includes system fields
const mapWithIdSchema = mapSchema.extend({
    _id: zid("maps"),
    _creationTime: z.number(),
});

// Game mode schema - sprint, forest, or mixed (either)
const gameModeSchema = z.enum(["sprint", "forest", "mixed"]);

export const getNextMap = zQuery({
    args: {
        excludeMapId: z.optional(zid("maps")),
        mode: z.optional(gameModeSchema),
    },
    returns: z.nullable(mapWithIdSchema),
    handler: async ({ db }, args) => {
        const mode = args.mode ?? "mixed";

        let allMaps: Array<z.infer<typeof mapWithIdSchema>>;

        // OPTIMIZED: Use index for sprint and forest modes instead of filter
        if (mode === "sprint") {
            allMaps = await db
                .query("maps")
                .withIndex("by_discipline", (q) => q.eq("discipline", "sprint"))
                .collect();
        } else if (mode === "forest") {
            allMaps = await db
                .query("maps")
                .withIndex("by_discipline", (q) => q.eq("discipline", "forest"))
                .collect();
        } else {
            // For "mixed" mode, we need both sprint and forest maps
            // We can't use a single index query for this, so we collect all
            // This is acceptable since we need the full set for random selection
            allMaps = await db.query("maps").collect();
        }

        const totalMaps = allMaps.length;

        if (totalMaps === 0) {
            return null;
        }

        if (totalMaps === 1) {
            return allMaps[0];
        }

        // Use current timestamp for pseudorandom selection
        const now = Date.now();
        let randomIndex = now % totalMaps;

        // Get the map at the random index
        let selectedMap = allMaps[randomIndex];

        // If it's the excluded map, try the next one
        if (args.excludeMapId && selectedMap._id === args.excludeMapId) {
            randomIndex = (randomIndex + 1) % totalMaps;
            selectedMap = allMaps[randomIndex];
        }

        return selectedMap;
    },
});

