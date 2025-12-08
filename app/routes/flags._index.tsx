import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useCallback, useState, useRef } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";

// Type for storing undo history
type UndoAction = {
    type: "delete" | "keep" | "sprint" | "forest";
    mapData: Omit<Doc<"maps">, "_id" | "_creationTime">;
    mapId?: Id<"maps">; // Only for keep/sprint/forest actions (to restore flags or discipline)
};

// Map flag types to human-readable labels
const FLAG_LABELS: Record<string, string> = {
    too_easy: "Too Easy",
    too_hard: "Too Hard",
    wrong_discipline: "Wrong Discipline",
    inappropriate: "Inappropriate",
    bad_image: "Bad Image",
    other: "Other",
};

export default function FlagsRoute() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [priorityMapId, setPriorityMapId] = useState<Id<"maps"> | null>(null);
    const undoStackRef = useRef<UndoAction[]>([]);

    const nextFlaggedMap = useQuery(api.models.maps.queries.getNextFlaggedMap.getNextFlaggedMap, {});
    const priorityMap = useQuery(
        api.models.maps.queries.getMapById.getMapById,
        priorityMapId ? { mapId: priorityMapId } : "skip"
    );
    const remainingCount = useQuery(api.models.maps.queries.getFlaggedMapCount.getFlaggedMapCount, {});

    // Use priority map if set, otherwise use next flagged map
    const currentMap = priorityMapId ? priorityMap : nextFlaggedMap;

    const deleteMap = useMutation(api.models.maps.mutations.deleteMap.deleteMap);
    const setDiscipline = useMutation(api.models.maps.mutations.setMapDiscipline.setMapDiscipline);
    const clearFlags = useMutation(api.models.maps.mutations.clearMapFlags.clearMapFlags);
    const restoreMap = useMutation(api.models.maps.mutations.restoreMap.restoreMap);

    // Helper to add action to undo stack (max 3)
    const pushUndoAction = useCallback((action: UndoAction) => {
        undoStackRef.current = [...undoStackRef.current.slice(-2), action];
    }, []);

    const handleDelete = useCallback(async () => {
        if (!currentMap || isProcessing) return;
        setIsProcessing(true);

        // Store map data for potential undo (excluding system fields)
        const { _id, _creationTime, ...mapData } = currentMap;
        pushUndoAction({ type: "delete", mapData });

        // Clear priority map since we're moving on
        setPriorityMapId(null);

        setLastAction("Deleted");
        await deleteMap({ mapId: currentMap._id });
        setIsProcessing(false);
    }, [currentMap, deleteMap, isProcessing, pushUndoAction]);

    const handleKeep = useCallback(async () => {
        if (!currentMap || isProcessing) return;
        setIsProcessing(true);

        // Store map data for potential undo
        const { _id, _creationTime, ...mapData } = currentMap;
        pushUndoAction({ type: "keep", mapData, mapId: currentMap._id });

        // Clear priority map since we're moving on
        setPriorityMapId(null);

        setLastAction("Kept (flags cleared)");
        await clearFlags({ mapId: currentMap._id });
        setIsProcessing(false);
    }, [currentMap, clearFlags, isProcessing, pushUndoAction]);

    const handleSprint = useCallback(async () => {
        if (!currentMap || isProcessing) return;
        setIsProcessing(true);

        // Store map data for potential undo
        const { _id, _creationTime, ...mapData } = currentMap;
        pushUndoAction({ type: "sprint", mapData, mapId: currentMap._id });

        // Clear priority map since we're moving on
        setPriorityMapId(null);

        setLastAction("Set to Sprint (flags cleared)");
        await setDiscipline({ mapId: currentMap._id, discipline: "sprint" });
        await clearFlags({ mapId: currentMap._id });
        setIsProcessing(false);
    }, [currentMap, setDiscipline, clearFlags, isProcessing, pushUndoAction]);

    const handleForest = useCallback(async () => {
        if (!currentMap || isProcessing) return;
        setIsProcessing(true);

        // Store map data for potential undo
        const { _id, _creationTime, ...mapData } = currentMap;
        pushUndoAction({ type: "forest", mapData, mapId: currentMap._id });

        // Clear priority map since we're moving on
        setPriorityMapId(null);

        setLastAction("Set to Forest (flags cleared)");
        await setDiscipline({ mapId: currentMap._id, discipline: "forest" });
        await clearFlags({ mapId: currentMap._id });
        setIsProcessing(false);
    }, [currentMap, setDiscipline, clearFlags, isProcessing, pushUndoAction]);

    const handleUndo = useCallback(async () => {
        if (isProcessing || undoStackRef.current.length === 0) return;

        const lastUndoAction = undoStackRef.current.pop();
        if (!lastUndoAction) return;

        setIsProcessing(true);

        if (lastUndoAction.type === "delete") {
            // Restore the deleted map and show it immediately
            setLastAction("Restored deleted map");
            const newMapId = await restoreMap(lastUndoAction.mapData);
            setPriorityMapId(newMapId as Id<"maps">);
        } else {
            // For keep/sprint/forest actions, restore the original flags
            if (lastUndoAction.mapId) {
                setLastAction(`Undid ${lastUndoAction.type} action`);

                // Delete the map and restore it with original data
                await deleteMap({ mapId: lastUndoAction.mapId });
                const newMapId = await restoreMap(lastUndoAction.mapData);
                setPriorityMapId(newMapId as Id<"maps">);
            }
        }

        setIsProcessing(false);
    }, [isProcessing, restoreMap, deleteMap]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (event.key) {
                case "1":
                    handleDelete();
                    break;
                case "2":
                    handleKeep();
                    break;
                case "3":
                    handleSprint();
                    break;
                case "4":
                    handleForest();
                    break;
                case "5":
                    handleUndo();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleDelete, handleKeep, handleSprint, handleForest, handleUndo]);

    // Clear last action after a short delay
    useEffect(() => {
        if (lastAction) {
            const timer = setTimeout(() => setLastAction(null), 1500);
            return () => clearTimeout(timer);
        }
    }, [lastAction]);

    if (currentMap === undefined || remainingCount === undefined) {
        return (
            <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (currentMap === null) {
        return (
            <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="text-4xl">🎉</div>
                    <div className="text-2xl font-bold">All flagged maps reviewed!</div>
                    <div className="text-neutral-600 dark:text-neutral-400">
                        No more maps with flags to review.
                    </div>
                </div>
            </div>
        );
    }

    // Get unique flags and count
    const flags = currentMap.flags ?? [];
    const uniqueFlags = Array.from(new Set(flags));
    const flagCount = flags.length;

    return (
        <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900 relative overflow-auto">
            {/* Stats panel - top left */}
            <div className="fixed top-16 left-6 z-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-4 space-y-2">
                <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    Flagged Maps Remaining
                </div>
                <div className="text-3xl font-bold text-orange-500">
                    {remainingCount}
                </div>
                {currentMap.name && (
                    <div className="text-sm text-neutral-500 dark:text-neutral-400 max-w-48 truncate">
                        {currentMap.name}
                    </div>
                )}
                {currentMap.country && (
                    <div className="text-xs text-neutral-400 dark:text-neutral-500">
                        {currentMap.country}
                    </div>
                )}
                {currentMap.discipline && (
                    <div className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 inline-block">
                        {currentMap.discipline}
                    </div>
                )}
            </div>

            {/* Flags panel - top center */}
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-4 min-w-[300px]">
                <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                    Flags ({flagCount} total, {uniqueFlags.length} unique)
                </div>
                <div className="flex flex-wrap gap-2">
                    {uniqueFlags.map((flag) => (
                        <div
                            key={flag}
                            className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium"
                        >
                            {FLAG_LABELS[flag] || flag}
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls panel - top right */}
            <div className="fixed top-16 right-6 z-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-4 space-y-3">
                <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-3">
                    Keyboard Controls
                </div>
                <div className="flex items-center gap-3">
                    <kbd className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-mono font-bold text-lg min-w-[40px] text-center">
                        1
                    </kbd>
                    <span className="text-sm">Delete</span>
                </div>
                <div className="flex items-center gap-3">
                    <kbd className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-mono font-bold text-lg min-w-[40px] text-center">
                        2
                    </kbd>
                    <span className="text-sm">Keep (clear flags)</span>
                </div>
                <div className="flex items-center gap-3">
                    <kbd className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg font-mono font-bold text-lg min-w-[40px] text-center">
                        3
                    </kbd>
                    <span className="text-sm">Sprint</span>
                </div>
                <div className="flex items-center gap-3">
                    <kbd className="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-mono font-bold text-lg min-w-[40px] text-center">
                        4
                    </kbd>
                    <span className="text-sm">Forest</span>
                </div>
                <div className="flex items-center gap-3">
                    <kbd className="px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg font-mono font-bold text-lg min-w-[40px] text-center">
                        5
                    </kbd>
                    <span className="text-sm">Undo</span>
                </div>
            </div>

            {/* Action feedback toast */}
            {lastAction && (
                <div className="fixed top-[200px] left-1/2 -translate-x-1/2 z-50 bg-neutral-800 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 rounded-lg shadow-lg font-semibold animate-pulse">
                    {lastAction}
                </div>
            )}

            {/* Processing overlay */}
            {isProcessing && (
                <div className="fixed inset-0 bg-black/20 z-30 flex items-center justify-center">
                    <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-lg">
                        Processing...
                    </div>
                </div>
            )}

            {/* Main content - cropped center 1024x1024 of the map image */}
            <div className="min-h-full w-full flex items-center justify-center p-4">
                <div className="w-[1024px] h-[1024px] max-w-full max-h-[calc(100vh-120px)] overflow-hidden rounded-lg shadow-lg aspect-square">
                    <img
                        src={currentMap.imageUrl}
                        alt="Flagged map to review"
                        className="w-full h-full object-cover object-center"
                    />
                </div>
            </div>
        </div>
    );
}

