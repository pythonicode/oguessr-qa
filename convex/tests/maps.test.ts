import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import type { Id } from "../_generated/dataModel";

const modules = import.meta.glob("../**/*.ts");

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
            return await ctx.db.get(mapId as Id<"maps">);
        });

        expect(map).toBeDefined();
        expect(map?.imageUrl).toBe("https://example.com/map1.png");
        expect(map?.location.latitude).toBe(59.3293);
        expect(map?.location.longitude).toBe(18.0686);
        expect(map?.location.name).toBe("Stockholm");
    });
});

describe("maps part 2", () => {
    /**
     * TEST 1: Flagging Logic
     * Verifies that we can add flags to a map and that the mutation 
     * handles deduplication (adding the same flag twice shouldn't duplicate it).
     */
    it("can flag a map and prevents duplicate flags", async () => {
        const t = convexTest(schema, modules);

        // 1. Create a map
        const mapId = await t.mutation(api.models.maps.mutations.createMap.createMap, {
            imageUrl: "https://example.com/bad-map.png",
            location: { latitude: 0, longitude: 0 },
        });

        // 2. Add a 'bad_image' flag
        await t.mutation(api.models.maps.mutations.addMapFlag.addMapFlag, {
            mapId,
            flag: "bad_image",
        });

        // 3. Add the SAME flag again (to test deduplication logic in addMapFlag.ts)
        await t.mutation(api.models.maps.mutations.addMapFlag.addMapFlag, {
            mapId,
            flag: "bad_image",
        });

        // 4. Add a different flag
        await t.mutation(api.models.maps.mutations.addMapFlag.addMapFlag, {
            mapId,
            flag: "too_hard",
        });

        // 5. Verify results
        const map = await t.run(async (ctx) => await ctx.db.get(mapId as Id<"maps">));

        // Should have 2 flags, not 3
        expect(map?.flags).toHaveLength(2);
        expect(map?.flags).toContain("bad_image");
        expect(map?.flags).toContain("too_hard");
    });

    /**
     * TEST 2: Review Queue Logic
     * Verifies the "Unreviewed Maps" logic. 
     * It checks that setting a discipline removes the map from the "unreviewed" count.
     */
    it("correctly updates unreviewed counts when discipline is set", async () => {
        const t = convexTest(schema, modules);

        // 1. Create two unreviewed maps (discipline is undefined by default)
        const map1 = await t.mutation(api.models.maps.mutations.createMap.createMap, {
            imageUrl: "https://example.com/1.png",
            location: { latitude: 0, longitude: 0 },
        });
        await t.mutation(api.models.maps.mutations.createMap.createMap, {
            imageUrl: "https://example.com/2.png",
            location: { latitude: 0, longitude: 0 },
        });

        // 2. Verify initial count is 2
        const initialCount = await t.query(api.models.maps.queries.getUnreviewedMapCount.getUnreviewedMapCount, {});
        expect(initialCount).toBe(2);

        // 3. Mark map1 as 'sprint' (reviewing it)
        await t.mutation(api.models.maps.mutations.setMapDiscipline.setMapDiscipline, {
            mapId: map1,
            discipline: "sprint",
        });

        // 4. Verify count dropped to 1
        const newCount = await t.query(api.models.maps.queries.getUnreviewedMapCount.getUnreviewedMapCount, {});
        expect(newCount).toBe(1);

        // 5. Verify the map was actually updated
        const updatedMap = await t.run(async (ctx) => await ctx.db.get(map1 as Id<"maps">));
        expect(updatedMap?.discipline).toBe("sprint");
    });

    /**
     * TEST 3: Deletion Logic
     * Verifies that the delete mutation actually removes data from the database.
     */
    it("successfully deletes a map", async () => {
        const t = convexTest(schema, modules);

        // 1. Create a map
        const mapId = await t.mutation(api.models.maps.mutations.createMap.createMap, {
            imageUrl: "https://example.com/delete-me.png",
            location: { latitude: 0, longitude: 0 },
        });

        // 2. Verify it exists
        const mapBefore = await t.run(async (ctx) => await ctx.db.get(mapId as Id<"maps">));
        expect(mapBefore).not.toBeNull();

        // 3. Delete it
        await t.mutation(api.models.maps.mutations.deleteMap.deleteMap, {
            mapId,
        });

        // 4. Verify it is gone
        const mapAfter = await t.run(async (ctx) => await ctx.db.get(mapId as Id<"maps">));
        expect(mapAfter).toBeNull();
    });

});

//TEST 1 map does exist
describe("getMapById", () => {
    it("returns the map when it exists", async () => {
        const t = convexTest(schema, modules);

        // Create a map
        const mapId = await t.mutation(
            api.models.maps.mutations.createMap.createMap,
            {
                imageUrl: "https://example.com/map-get.png",
                location: {
                    latitude: 59.3293,
                    longitude: 18.0686,
                    name: "Stockholm",
                },
            }
        );

        // Query it by id
        const map = await t.query(
            api.models.maps.queries.getMapById.getMapById,
            { mapId }
        );

        // Assertions
        expect(map).toBeDefined();
        expect(map?._id).toBe(mapId);
        expect(map?.imageUrl).toBe("https://example.com/map-get.png");
        expect(map?.location.latitude).toBe(59.3293);
        expect(map?.location.longitude).toBe(18.0686);
        expect(map?.location.name).toBe("Stockholm");
    });

    //TEST 2 map doesn't exist
    it("returns null when the map does not exist", async () => {
        const t = convexTest(schema, modules);

        // Create a map to get a valid ID
        const mapId = await t.mutation(
            api.models.maps.mutations.createMap.createMap,
            {
                imageUrl: "https://example.com/map-deleted.png",
                location: {
                    latitude: 59.3293,
                    longitude: 18.0686,
                    name: "Temp",
                },
            }
        );

        // Delete the map directly via db in the test context
        await t.run(async (ctx) => {
            await ctx.db.delete(mapId as Id<"maps">);
        });

        //  Query by id again
        const map = await t.query(
            api.models.maps.queries.getMapById.getMapById,
            { mapId }
        );

        expect(map).toBeNull();
    });
});