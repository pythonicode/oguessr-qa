"use node";

import { v } from "convex/values";
import { internalAction } from "../../../_generated/server";
import { internal } from "../../../_generated/api";

// Response types for the Livelox SearchEvents API
interface LiveloxEventClass {
    id: number;
    name: string;
    participantCount: number;
}

interface LiveloxOrganiser {
    id: number;
    name: string;
    iconUrl: string;
}

interface LiveloxEvent {
    id: number;
    name: string;
    classes: LiveloxEventClass[];
    boundingPolygonVertices: number[]; // [lat1, lon1, lat2, lon2, lat3, lon3, lat4, lon4]
    organisers: LiveloxOrganiser[];
}

/**
 * Converts flat array of coordinates to array of points
 * [lat1, lon1, lat2, lon2, ...] -> [{lat: lat1, lon: lon1}, {lat: lat2, lon: lon2}, ...]
 */
function parsePolygonVertices(vertices: number[]): Array<{ lat: number; lon: number }> {
    const points: Array<{ lat: number; lon: number }> = [];
    for (let i = 0; i < vertices.length; i += 2) {
        points.push({ lat: vertices[i], lon: vertices[i + 1] });
    }
    return points;
}

/**
 * Calculates the area of a polygon using the Shoelace formula
 * Input coordinates should be in lat/lon (degrees)
 */
function calculatePolygonArea(points: Array<{ lat: number; lon: number }>): number {
    if (points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].lon * points[j].lat;
        area -= points[j].lon * points[i].lat;
    }
    return Math.abs(area / 2);
}

/**
 * Calculates the intersection area between two polygons using the Sutherland-Hodgman algorithm
 */
function calculatePolygonIntersection(
    poly1: Array<{ lat: number; lon: number }>,
    poly2: Array<{ lat: number; lon: number }>
): number {
    // Simplified approach: calculate bounding box overlap as an approximation
    // This is more efficient and works well for roughly rectangular bounding boxes

    const getBounds = (points: Array<{ lat: number; lon: number }>) => {
        const lats = points.map(p => p.lat);
        const lons = points.map(p => p.lon);
        return {
            minLat: Math.min(...lats),
            maxLat: Math.max(...lats),
            minLon: Math.min(...lons),
            maxLon: Math.max(...lons),
        };
    };

    const bounds1 = getBounds(poly1);
    const bounds2 = getBounds(poly2);

    // Calculate intersection of bounding boxes
    const intersectMinLat = Math.max(bounds1.minLat, bounds2.minLat);
    const intersectMaxLat = Math.min(bounds1.maxLat, bounds2.maxLat);
    const intersectMinLon = Math.max(bounds1.minLon, bounds2.minLon);
    const intersectMaxLon = Math.min(bounds1.maxLon, bounds2.maxLon);

    // Check if there's an intersection
    if (intersectMinLat >= intersectMaxLat || intersectMinLon >= intersectMaxLon) {
        return 0;
    }

    // Calculate intersection area
    const intersectionArea = (intersectMaxLat - intersectMinLat) * (intersectMaxLon - intersectMinLon);
    return intersectionArea;
}

/**
 * Calculates the overlap percentage between two polygons
 * Returns the percentage based on the smaller polygon (to detect if either is mostly contained)
 */
function calculateOverlapPercentage(
    vertices1: number[],
    vertices2: number[]
): number {
    const poly1 = parsePolygonVertices(vertices1);
    const poly2 = parsePolygonVertices(vertices2);

    const area1 = calculatePolygonArea(poly1);
    const area2 = calculatePolygonArea(poly2);

    if (area1 === 0 || area2 === 0) return 0;

    const intersectionArea = calculatePolygonIntersection(poly1, poly2);

    // Use the smaller area as the denominator to detect if either polygon
    // is mostly contained within the other
    const smallerArea = Math.min(area1, area2);
    const overlapPercentage = (intersectionArea / smallerArea) * 100;

    // Cap at 100% to handle any calculation edge cases
    return Math.min(overlapPercentage, 100);
}

/**
 * Fetches events from Livelox for a given country and extracts the class with
 * the largest participant count from each event, then processes each class
 * to upload maps to the database.
 */
export const batchProcessLiveloxClasses = internalAction({
    args: {
        countryId: v.number(),
        competitionsOnly: v.optional(v.boolean()),
    },
    returns: v.object({
        totalClasses: v.number(),
        successCount: v.number(),
        failureCount: v.number(),
        skippedCount: v.number(),
    }),
    handler: async (ctx, args) => {
        const { countryId, competitionsOnly = false } = args;

        const payload = {
            organisedByMyOrganisationsOnly: false,
            countryId,
            timePeriod: "allTime",
            from: null,
            to: null,
            text: "",
            competitionsOnly,
            orderBy: "participantCount",
            properties: null,
            maxNumberOfResults: 500,
        };

        const response = await fetch("https://www.livelox.com/Home/SearchEvents", {
            method: "POST",
            headers: {
                "accept": "application/json, text/javascript, */*; q=0.01",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                "content-type": "application/json",
                "pragma": "no-cache",
                "x-requested-with": "XMLHttpRequest",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
        }

        const events: LiveloxEvent[] = await response.json();

        const classIds: number[] = [];
        const selectedEventVertices: number[][] = [];
        const organiserClassCount: Record<number, number> = {};
        const OVERLAP_THRESHOLD = 40; // 40% overlap threshold
        const MAX_CLASSES_PER_ORGANISER = 10; // Maximum classes per organizer

        // Track skip reasons for summary
        let skippedNoClasses = 0;
        let skippedNoPolygon = 0;
        let skippedOrganiserLimit = 0;
        let skippedOverlap = 0;

        for (const event of events) {
            // Skip events with no classes
            if (!event.classes || event.classes.length === 0) {
                skippedNoClasses++;
                continue;
            }

            // Skip events without bounding polygon vertices
            if (!event.boundingPolygonVertices || event.boundingPolygonVertices.length === 0) {
                skippedNoPolygon++;
                continue;
            }

            // Check organizer limits - skip if any organizer has reached the limit
            let organiserLimitReached = false;
            if (event.organisers && event.organisers.length > 0) {
                for (const organiser of event.organisers) {
                    const currentCount = organiserClassCount[organiser.id] || 0;
                    if (currentCount >= MAX_CLASSES_PER_ORGANISER) {
                        organiserLimitReached = true;
                        break;
                    }
                }
            }

            if (organiserLimitReached) {
                skippedOrganiserLimit++;
                continue;
            }

            // Check if this event overlaps significantly with any already selected event
            let hasSignificantOverlap = false;
            for (const selectedVertices of selectedEventVertices) {
                const overlapPercentage = calculateOverlapPercentage(
                    event.boundingPolygonVertices,
                    selectedVertices
                );

                if (overlapPercentage > OVERLAP_THRESHOLD) {
                    hasSignificantOverlap = true;
                    break;
                }
            }

            // Skip this event if it overlaps too much with an already selected event
            if (hasSignificantOverlap) {
                skippedOverlap++;
                continue;
            }

            // Find the class with the largest participant count
            const largestClass = event.classes.reduce((max, current) =>
                current.participantCount > max.participantCount ? current : max
            );

            classIds.push(largestClass.id);
            selectedEventVertices.push(event.boundingPolygonVertices);

            // Increment the count for all organisers associated with this event
            if (event.organisers && event.organisers.length > 0) {
                for (const organiser of event.organisers) {
                    organiserClassCount[organiser.id] = (organiserClassCount[organiser.id] || 0) + 1;
                }
            }
        }

        const uniqueOrganiserCount = Object.keys(organiserClassCount).length;
        const totalSkipped = skippedNoClasses + skippedNoPolygon + skippedOrganiserLimit + skippedOverlap;

        console.log(`\n=== Event Selection Summary ===`);
        console.log(`Total events from API: ${events.length}`);
        console.log(`Selected for processing: ${classIds.length}`);
        console.log(`Skipped: ${totalSkipped}`);
        console.log(`  - No classes: ${skippedNoClasses}`);
        console.log(`  - No bounding polygon: ${skippedNoPolygon}`);
        console.log(`  - Organiser limit (${MAX_CLASSES_PER_ORGANISER} per organiser): ${skippedOrganiserLimit}`);
        console.log(`  - Geographic overlap (>${OVERLAP_THRESHOLD}%): ${skippedOverlap}`);
        console.log(`Selected events from ${uniqueOrganiserCount} unique organiser(s)`);

        const MAX_CLASSES_TO_PROCESS = 100;

        console.log(`\nStarting batch processing... ${MAX_CLASSES_TO_PROCESS} classes`);

        let successCount = 0;
        let failureCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < Math.min(classIds.length, MAX_CLASSES_TO_PROCESS); i++) {
            const classId = classIds[i];
            const progress = `[${i + 1}/${classIds.length}]`;

            try {
                const result = await ctx.runAction(
                    internal.models.maps.actions.processLiveloxClassInternal.processLiveloxClassInternal,
                    { classId }
                );

                if (result.success) {
                    if (result.tilesCreated > 0) {
                        console.log(`${progress} ✓ Class ${classId}: Created ${result.tilesCreated} tiles for "${result.mapName}"`);
                        successCount++;
                    } else {
                        console.log(`${progress} ○ Class ${classId}: Skipped (no tiles created, likely duplicate location)`);
                        skippedCount++;
                    }
                } else {
                    console.log(`${progress} ✗ Class ${classId}: Failed - ${result.error}`);
                    failureCount++;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.log(`${progress} ✗ Class ${classId}: Error - ${errorMessage}`);
                failureCount++;
            }
        }

        console.log(`\nBatch processing complete:`);
        console.log(`  Total classes: ${Math.min(classIds.length, MAX_CLASSES_TO_PROCESS)}`);
        console.log(`  Successful: ${successCount}`);
        console.log(`  Skipped: ${skippedCount}`);
        console.log(`  Failed: ${failureCount}`);

        return {
            totalClasses: Math.min(classIds.length, MAX_CLASSES_TO_PROCESS),
            successCount,
            failureCount,
            skippedCount,
        };
    },
});

