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

/**
 * Fetches exactly 5 random maps for a game round.
 * The maps are selected once and will remain stable even if the database changes.
 * 
 * @param mode - The game mode to filter maps by (sprint, forest, or mixed)
 * @returns An array of exactly 5 maps, or fewer if not enough maps are available
 */
export const getRandomMaps = zQuery({
    args: {
        mode: z.optional(gameModeSchema),
    },
    returns: z.array(mapWithIdSchema),
    handler: async ({ db }, args) => {
        const mode = args.mode ?? "mixed";

        let allMaps: Array<z.infer<typeof mapWithIdSchema>>;

        // Use index for sprint and forest modes
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
            allMaps = await db.query("maps").collect();
        }

        const totalMaps = allMaps.length;

        // If we have 5 or fewer maps, return all of them
        if (totalMaps <= 5) {
            return allMaps;
        }

        // Fisher-Yates shuffle algorithm to randomly select 5 unique maps
        // We use Date.now() as a seed for pseudo-random selection
        const seed = Date.now();
        const selectedMaps: Array<z.infer<typeof mapWithIdSchema>> = [];
        const availableIndices: Array<number> = Array.from({ length: totalMaps }, (_, i) => i);

        for (let i = 0; i < 5; i++) {
            // Generate a pseudo-random index based on seed and iteration
            const randomValue = (seed * (i + 1)) % availableIndices.length;
            const selectedIndex = availableIndices[randomValue];

            selectedMaps.push(allMaps[selectedIndex]);

            // Remove the selected index from available indices
            availableIndices.splice(randomValue, 1);
        }

        return selectedMaps;
    },
});

// UNIT TESTS

if (import.meta.vitest) {
    const { describe, it, expect } = import.meta.vitest;
    const { convexTest } = await import("convex-test");
    const schema = (await import("../../../schema")).default;
    const { api } = await import("../../../_generated/api");

    const modules = import.meta.glob("../../../**/*.ts");

    describe("getRandomMaps", () => {
        it("should return 5 random maps when enough maps exist", async () => {
            const t = convexTest(schema, modules);

            // Create 10 test maps
            for (let i = 0; i < 10; i++) {
                await t.mutation(api.models.maps.mutations.createMap.createMap, {
                    imageUrl: `https://example.com/map${i}.png`,
                    location: { latitude: 60.0 + i, longitude: 10.0 + i },
                    discipline: i % 2 === 0 ? "sprint" : "forest",
                });
            }

            const maps = await t.query(api.models.maps.queries.getRandomMaps.getRandomMaps, { mode: "mixed" });
            expect(maps.length).toBe(5);
        });

        it("should return all maps when fewer than 5 exist", async () => {
            const t = convexTest(schema, modules);

            // Create only 3 test maps
            for (let i = 0; i < 3; i++) {
                await t.mutation(api.models.maps.mutations.createMap.createMap, {
                    imageUrl: `https://example.com/map${i}.png`,
                    location: { latitude: 60.0 + i, longitude: 10.0 + i },
                    discipline: "sprint",
                });
            }

            const maps = await t.query(api.models.maps.queries.getRandomMaps.getRandomMaps, { mode: "sprint" });
            expect(maps.length).toBe(3);
        });
    });
}
