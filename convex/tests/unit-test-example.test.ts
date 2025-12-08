import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

describe("maps", () => {
    describe("createMap", () => {
        it("creates a map successfully with all required fields", async () => {
            const t = convexTest(schema, modules);

            const mapId = await t.mutation(api.models.maps.mutations.createMap.createMap, {
                imageUrl: "https://example.com/map1.png",
                location: {
                    latitude: 59.3293,
                    longitude: 18.0686,
                    name: "Stockholm",
                },
            });

            expect(mapId).toBeDefined();
            expect(typeof mapId).toBe("string");

            const map = await t.run(async (ctx) => {
                return await ctx.db.get(mapId);
            });

            expect(map).toBeDefined();
            expect(map?.imageUrl).toBe("https://example.com/map1.png");
            expect(map?.location.latitude).toBe(59.3293);
            expect(map?.location.longitude).toBe(18.0686);
            expect(map?.location.name).toBe("Stockholm");
        });
    });
});

