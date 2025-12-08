import { useState } from "react";
import { useAction } from "convex/react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";

export function meta() {
    return [
        { title: "Add Map - OGuessr" },
        { name: "description", content: "Add a new orienteering map from Livelox" },
    ];
}

interface TileInfo {
    imageUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ProcessResult {
    classId: number;
    success: boolean;
    mapName?: string;
    tilesCreated: number;
    error?: string;
    tiles: TileInfo[];
    mapLocation?: {
        latitude: number;
        longitude: number;
    };
}

export default function AddMapRoute() {
    const [classIdInput, setClassIdInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<ProcessResult | null>(null);
    const [selectedTile, setSelectedTile] = useState<TileInfo | null>(null);

    const processLiveloxClass = useAction(api.models.maps.actions.processLiveloxClass.processLiveloxClass);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const classId = parseInt(classIdInput, 10);
        if (isNaN(classId)) {
            return;
        }

        setIsProcessing(true);
        setResult(null);

        try {
            const processResult = await processLiveloxClass({ classId });
            setResult(processResult);
        } catch (error) {
            setResult({
                classId,
                success: false,
                tilesCreated: 0,
                error: error instanceof Error ? error.message : String(error),
                tiles: [],
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const previewTiles = result?.tiles.slice(0, 6) ?? [];

    return (
        <main className="min-h-full p-6 md:p-10">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Add Map from Livelox</h1>
                    <p className="text-muted-foreground">
                        Enter a Livelox class ID to import map tiles into OGuessr.
                    </p>
                </div>

                {/* Input Form */}
                <Card className="border-2 border-dashed border-muted-foreground/25 bg-gradient-to-br from-background to-muted/20">
                    <CardHeader>
                        <CardTitle className="text-lg">Livelox Class ID</CardTitle>
                        <CardDescription>
                            Find the class ID in the Livelox URL (e.g., livelox.com/Viewer/Class/123456 → 123456)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex gap-3">
                            <Input
                                type="number"
                                placeholder="Enter class ID (e.g., 866782)"
                                value={classIdInput}
                                onChange={(e) => setClassIdInput(e.target.value)}
                                className="flex-1 font-mono text-lg h-12"
                                disabled={isProcessing}
                            />
                            <Button
                                type="submit"
                                disabled={isProcessing || !classIdInput}
                                className="h-12 px-6 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white font-semibold"
                            >
                                {isProcessing ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    "Import Map"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Results */}
                {result && (
                    <Card className={result.success
                        ? "border-green-500/50 bg-green-500/5"
                        : "border-red-500/50 bg-red-500/5"
                    }>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {result.success ? (
                                    <>
                                        <span className="text-2xl">✅</span>
                                        <span className="text-green-600 dark:text-green-400">Import Successful</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xl">❌</span>
                                        <span className="text-red-600 dark:text-red-400">Import Failed</span>
                                    </>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-background/50 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold">{result.classId}</div>
                                    <div className="text-sm text-muted-foreground">Class ID</div>
                                </div>
                                {result.mapName && (
                                    <div className="bg-background/50 rounded-lg p-4 text-center col-span-2 md:col-span-1">
                                        <div className="text-lg font-bold truncate" title={result.mapName}>
                                            {result.mapName}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Map Name</div>
                                    </div>
                                )}
                                <div className="bg-background/50 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {result.tilesCreated}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Tiles Created</div>
                                </div>
                                {result.mapLocation && (
                                    <div className="bg-background/50 rounded-lg p-4 text-center">
                                        <div className="text-sm font-mono">
                                            {result.mapLocation.latitude.toFixed(4)}, {result.mapLocation.longitude.toFixed(4)}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Location</div>
                                    </div>
                                )}
                            </div>

                            {/* Error Message */}
                            {result.error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                                    <p className="text-red-600 dark:text-red-400 font-medium">Error</p>
                                    <p className="text-sm text-red-500/80 mt-1">{result.error}</p>
                                </div>
                            )}

                            {/* Tile Preview Grid */}
                            {previewTiles.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-lg">
                                        Tile Preview {result.tiles.length > 6 && `(showing 6 of ${result.tiles.length})`}
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {previewTiles.map((tile, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setSelectedTile(tile)}
                                                className="group relative aspect-square overflow-hidden rounded-lg border-2 border-transparent hover:border-green-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                            >
                                                <img
                                                    src={tile.imageUrl}
                                                    alt={`Tile ${index + 1}`}
                                                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                                <div className="absolute bottom-2 left-2 right-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <div className="font-mono bg-black/50 rounded px-2 py-1 inline-block">
                                                        {tile.width}×{tile.height}
                                                    </div>
                                                </div>
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <span className="bg-white/90 dark:bg-black/90 rounded-full p-1.5 inline-flex">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                        </svg>
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Click on a tile to view it in full size
                                    </p>
                                </div>
                            )}

                            {/* Review Link */}
                            {result.success && result.tilesCreated > 0 && (
                                <div className="pt-4 border-t">
                                    <Link to="/review">
                                        <Button variant="outline" className="w-full gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                            </svg>
                                            Review Uploaded Tiles
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Expanded Tile Dialog */}
                <Dialog open={selectedTile !== null} onOpenChange={() => setSelectedTile(null)}>
                    <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                Tile Preview
                                {selectedTile && (
                                    <span className="text-sm font-normal text-muted-foreground font-mono">
                                        ({selectedTile.width}×{selectedTile.height} at position {selectedTile.x},{selectedTile.y})
                                    </span>
                                )}
                            </DialogTitle>
                        </DialogHeader>
                        {selectedTile && (
                            <div className="overflow-auto max-h-[calc(90vh-100px)]">
                                <img
                                    src={selectedTile.imageUrl}
                                    alt="Full tile"
                                    className="max-w-full h-auto rounded-lg"
                                    style={{ maxHeight: "calc(90vh - 120px)" }}
                                />
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </main>
    );
}

