import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useCallback, useState, useRef } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";

// Type for storing undo history
type UndoAction = {
    type: "delete" | "sprint" | "forest" | "deleteClass";
    mapData: Omit<Doc<"maps">, "_id" | "_creationTime">;
    mapId?: Id<"maps">; // Only for sprint/forest actions (to clear discipline)
    deletedCount?: number; // For deleteClass actions
};

export default function ReviewRoute() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [priorityMapId, setPriorityMapId] = useState<Id<"maps"> | null>(null);
    const undoStackRef = useRef<UndoAction[]>([]);

    const nextUnreviewedMap = useQuery(api.models.maps.queries.getNextUnreviewedMap.getNextUnreviewedMap, {});
    const priorityMap = useQuery(
        api.models.maps.queries.getMapById.getMapById,
        priorityMapId ? { mapId: priorityMapId } : "skip"
    );
    const remainingCount = useQuery(api.models.maps.queries.getUnreviewedMapCount.getUnreviewedMapCount, {});

    // Use priority map if set, otherwise use next unreviewed map
    const currentMap = priorityMapId ? priorityMap : nextUnreviewedMap;

    const deleteMap = useMutation(api.models.maps.mutations.deleteMap.deleteMap);
    const deleteMapsByClassId = useMutation(api.models.maps.mutations.deleteMapsByClassId.deleteMapsByClassId);
    const setDiscipline = useMutation(api.models.maps.mutations.setMapDiscipline.setMapDiscipline);
    const clearDiscipline = useMutation(api.models.maps.mutations.clearMapDiscipline.clearMapDiscipline);
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

    const handleSprint = useCallback(async () => {
        if (!currentMap || isProcessing) return;
        setIsProcessing(true);

        // Store map data for potential undo
        const { _id, _creationTime, ...mapData } = currentMap;
        pushUndoAction({ type: "sprint", mapData, mapId: currentMap._id });

        // Clear priority map since we're moving on
        setPriorityMapId(null);

        setLastAction("Marked as Sprint");
        await setDiscipline({ mapId: currentMap._id, discipline: "sprint" });
        setIsProcessing(false);
    }, [currentMap, setDiscipline, isProcessing, pushUndoAction]);

    const handleForest = useCallback(async () => {
        if (!currentMap || isProcessing) return;
        setIsProcessing(true);

        // Store map data for potential undo
        const { _id, _creationTime, ...mapData } = currentMap;
        pushUndoAction({ type: "forest", mapData, mapId: currentMap._id });

        // Clear priority map since we're moving on
        setPriorityMapId(null);

        setLastAction("Marked as Forest");
        await setDiscipline({ mapId: currentMap._id, discipline: "forest" });
        setIsProcessing(false);
    }, [currentMap, setDiscipline, isProcessing, pushUndoAction]);

    const handleDeleteClass = useCallback(async () => {
        if (!currentMap || isProcessing || !currentMap.liveloxClassId) return;
        setIsProcessing(true);

        // Store map data for potential undo
        const { _id, _creationTime, ...mapData } = currentMap;

        // Clear priority map since we're moving on
        setPriorityMapId(null);

        setLastAction("Deleting all maps from class...");
        const deletedCount = await deleteMapsByClassId({ liveloxClassId: currentMap.liveloxClassId });

        pushUndoAction({ type: "deleteClass", mapData, deletedCount });
        setLastAction(`Deleted ${deletedCount} maps from class`);
        setIsProcessing(false);
    }, [currentMap, deleteMapsByClassId, isProcessing, pushUndoAction]);

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
        } else if (lastUndoAction.type === "deleteClass") {
            // Restore one map from the deleted class and show it
            setLastAction(`Cannot undo class deletion (deleted ${lastUndoAction.deletedCount} maps)`);
            // Note: We can't restore all deleted maps, so we just show a message
            // If you want to restore one map, uncomment the lines below:
            // const newMapId = await restoreMap(lastUndoAction.mapData);
            // setPriorityMapId(newMapId as Id<"maps">);
        } else {
            // Clear the discipline (sprint or forest) and show the map again
            if (lastUndoAction.mapId) {
                setLastAction(`Undid ${lastUndoAction.type} marking`);
                await clearDiscipline({ mapId: lastUndoAction.mapId });
                setPriorityMapId(lastUndoAction.mapId);
            }
        }

        setIsProcessing(false);
    }, [isProcessing, restoreMap, clearDiscipline]);

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
                    handleSprint();
                    break;
                case "3":
                    handleForest();
                    break;
                case "4":
                    handleUndo();
                    break;
                case "5":
                    handleDeleteClass();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleDelete, handleSprint, handleForest, handleUndo, handleDeleteClass]);

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
                    <div className="text-2xl font-bold">All maps reviewed!</div>
                    <div className="text-neutral-600 dark:text-neutral-400">
                        No more maps to review.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900 relative overflow-auto">
            {/* Stats panel - top left */}
            <div className="fixed top-16 left-6 z-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-4 space-y-2">
                <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    Maps Remaining
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
            </div>

            {/* Controls panel - top right */}
            <div className="fixed top-16 right-6 z-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-4 space-y-3">
                <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-3">
                    Keyboard Controls
                </div>
                <button
                    onClick={handleDelete}
                    disabled={isProcessing}
                    className="flex items-center gap-3 w-full hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg p-1 -m-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <kbd className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-mono font-bold text-lg min-w-[40px] text-center">
                        1
                    </kbd>
                    <span className="text-sm">Delete</span>
                </button>
                <button
                    onClick={handleSprint}
                    disabled={isProcessing}
                    className="flex items-center gap-3 w-full hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg p-1 -m-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <kbd className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg font-mono font-bold text-lg min-w-[40px] text-center">
                        2
                    </kbd>
                    <span className="text-sm">Sprint</span>
                </button>
                <button
                    onClick={handleForest}
                    disabled={isProcessing}
                    className="flex items-center gap-3 w-full hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg p-1 -m-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <kbd className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-mono font-bold text-lg min-w-[40px] text-center">
                        3
                    </kbd>
                    <span className="text-sm">Forest</span>
                </button>
                <button
                    onClick={handleUndo}
                    disabled={isProcessing}
                    className="flex items-center gap-3 w-full hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg p-1 -m-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <kbd className="px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg font-mono font-bold text-lg min-w-[40px] text-center">
                        4
                    </kbd>
                    <span className="text-sm">Undo</span>
                </button>
                <button
                    onClick={handleDeleteClass}
                    disabled={isProcessing}
                    className="flex items-center gap-3 w-full hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg p-1 -m-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <kbd className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg font-mono font-bold text-lg min-w-[40px] text-center">
                        5
                    </kbd>
                    <span className="text-sm">Delete Class</span>
                </button>
            </div>

            {/* Action feedback toast */}
            {lastAction && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-neutral-800 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 rounded-lg shadow-lg font-semibold animate-pulse">
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
                        alt="Map to review"
                        className="w-full h-full object-cover object-center"
                    />
                </div>
            </div>
        </div>
    );
}

