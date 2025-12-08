import { LocationPickerMap } from "~/components/location-picker-map";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { useSearchParams } from "react-router";
import { ReportProblemPopover } from "~/components/report-problem-popover";
import { Spinner } from "~/components/ui/spinner";

type GameMode = "sprint" | "forest" | "mixed";

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}

// Calculate GeoGuessr-style score based on distance
// 5000 points for perfect guess, approaching 0 for 5000+ km away
function calculateScore(distanceKm: number): number {
    if (distanceKm === 0) return 5000;

    // Using exponential decay: score = 5000 * e^(-distance/scaleFactor)
    // We want the score to be very close to 0 at maxDistance
    // When distance = maxDistance, we want score ≈ 0
    // Solving: 5000 * e^(-5000/scaleFactor) ≈ 0
    // Let's use scaleFactor = 2000 for a good curve
    const scaleFactor = 2000;
    const score = 5000 * Math.exp(-distanceKm / scaleFactor);

    return Math.round(score);
}

interface RoundGuess {
    mapId: string;
    imageUrl: string;
    distance: number;
    score: number;
    guessPosition: [number, number];
    actualPosition: [number, number];
}

export default function PlayRoute() {
    const [searchParams] = useSearchParams();
    const modeParam = searchParams.get("mode");
    const mode: GameMode = (modeParam === "sprint" || modeParam === "forest" || modeParam === "mixed")
        ? modeParam
        : "mixed";

    const [selectedLat, setSelectedLat] = useState<number | null>(null);
    const [selectedLng, setSelectedLng] = useState<number | null>(null);
    const [guessResult, setGuessResult] = useState<{
        distance: number;
        score: number;
        actualLat: number;
        actualLng: number;
    } | null>(null);
    const [resetTrigger, setResetTrigger] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Round state - 5 guesses per round
    const [currentRound, setCurrentRound] = useState<RoundGuess[]>([]);
    const [roundComplete, setRoundComplete] = useState(false);
    const [currentMapIndex, setCurrentMapIndex] = useState(0);

    // Fetch 5 random maps once at the start of the round
    // This query will not be reactive - maps stay the same even if DB changes
    const roundMaps = useQuery(
        api.models.maps.queries.getRandomMaps.getRandomMaps,
        { mode }
    );

    // The number of maps in this round (up to 5)
    const GUESSES_PER_ROUND = roundMaps ? roundMaps.length : 5;

    // Get the current map from the round
    const currentMap = roundMaps && roundMaps.length > 0 ? roundMaps[currentMapIndex] : undefined;

    const handleLocationSelect = (lat: number, lng: number) => {
        setSelectedLat(lat);
        setSelectedLng(lng);
    };

    const handleGuess = () => {
        if (selectedLat === null || selectedLng === null || !currentMap) {
            return;
        }

        const distance = calculateDistance(
            selectedLat,
            selectedLng,
            currentMap.location.latitude,
            currentMap.location.longitude
        );

        const score = calculateScore(distance);

        setGuessResult({
            distance,
            score,
            actualLat: currentMap.location.latitude,
            actualLng: currentMap.location.longitude,
        });

        // Note: We don't add to currentRound here - that happens when clicking "Next Map"
    };

    const handleNextMap = () => {
        // Add the current guess to the round
        if (guessResult && selectedLat !== null && selectedLng !== null && currentMap) {
            const newGuess: RoundGuess = {
                mapId: currentMap._id,
                imageUrl: currentMap.imageUrl,
                distance: guessResult.distance,
                score: guessResult.score,
                guessPosition: [selectedLat, selectedLng],
                actualPosition: [guessResult.actualLat, guessResult.actualLng],
            };

            const updatedRound = [...currentRound, newGuess];
            setCurrentRound(updatedRound);

            // Check if this was the final guess (5th guess)
            if (updatedRound.length >= GUESSES_PER_ROUND) {
                setRoundComplete(true);
                return;
            }

            // Briefly activate transition state to collapse the map
            setIsTransitioning(true);

            // Move to next map
            setTimeout(() => {
                setCurrentMapIndex(prev => prev + 1);
                setIsTransitioning(false);
            });
        }

        setSelectedLat(null);
        setSelectedLng(null);
        setGuessResult(null);
        setResetTrigger(prev => prev + 1);
    };

    const handleNewRound = () => {
        setCurrentRound([]);
        setRoundComplete(false);
        setSelectedLat(null);
        setSelectedLng(null);
        setGuessResult(null);
        setCurrentMapIndex(0);
        setResetTrigger(prev => prev + 1);

        // Force re-fetch by navigating to the same route (will trigger a new query)
        window.location.reload();
    };

    // Show loading state while fetching maps
    if (roundMaps === undefined) {
        return (
            <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Spinner className="size-8" />
                    <div className="text-xl">Loading maps...</div>
                </div>
            </div>
        );
    }

    // Show "no maps" if we have no maps available
    if (roundMaps.length === 0) {
        return (
            <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="text-4xl">🗺️</div>
                    <div className="text-2xl font-bold">No maps available</div>
                    <div className="text-neutral-600 dark:text-neutral-400">
                        Try a different game mode or add some maps first.
                    </div>
                </div>
            </div>
        );
    }

    // Show round summary when complete
    if (roundComplete) {
        const totalScore = currentRound.reduce((sum, guess) => sum + guess.score, 0);
        const averageDistance = currentRound.reduce((sum, guess) => sum + guess.distance, 0) / currentRound.length;

        return (
            <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900 overflow-auto">
                <div className="max-w-4xl mx-auto p-6 space-y-6">
                    {/* Round Summary Header */}
                    <div className="text-center space-y-4 py-8">
                        <h1 className="text-4xl font-bold">Round Complete!</h1>
                        <div className="text-6xl font-bold text-orange-500">
                            {totalScore.toLocaleString()} points
                        </div>
                        <div className="text-xl text-neutral-600 dark:text-neutral-400">
                            Average distance: {averageDistance.toFixed(2)} km
                        </div>
                    </div>

                    {/* Individual Guess Results */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold">Your Guesses</h2>
                        {currentRound.map((guess, index) => (
                            <div
                                key={guess.mapId}
                                className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-4 flex items-center gap-4"
                            >
                                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                                    {index + 1}
                                </div>
                                <img
                                    src={guess.imageUrl}
                                    alt={`Guess ${index + 1}`}
                                    className="w-32 h-24 object-cover rounded"
                                />
                                <div className="flex-1 space-y-1">
                                    <div className="text-2xl font-bold text-orange-500">
                                        {guess.score.toLocaleString()} pts
                                    </div>
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Distance: {guess.distance.toFixed(2)} km
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* New Round Button */}
                    <div className="flex justify-center pt-6">
                        <Button
                            onClick={handleNewRound}
                            size="lg"
                            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg transition-all duration-200"
                        >
                            Play New Round
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const currentGuessNumber = currentRound.length + 1;
    const totalRoundScore = currentRound.reduce((sum, guess) => sum + guess.score, 0);
    // Include current guess score in display if guess has been made
    const displayScore = totalRoundScore + (guessResult?.score ?? 0);

    return (
        <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900 relative overflow-auto">
            {/* Round Progress Indicator - absolute within parent container */}
            <div className="absolute top-6 left-6 z-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-3">
                <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    Round Progress
                </div>
                <div className="text-2xl font-bold">
                    {currentGuessNumber} / {GUESSES_PER_ROUND}
                </div>
                <div className="text-sm text-orange-500 font-semibold">
                    {displayScore.toLocaleString()} pts
                </div>
            </div>

            {/* Main game content - cropped center 1024x1024 of the image */}
            <div className="min-h-full w-full flex items-center justify-center p-4">
                <div className="w-[1024px] h-[1024px] max-w-full max-h-[calc(100vh-120px)] overflow-hidden rounded-lg shadow-lg aspect-square bg-white dark:bg-neutral-800 flex items-center justify-center">
                    {currentMap ? (
                        <img
                            src={currentMap.imageUrl}
                            alt="Guess this location"
                            className="w-full h-full object-cover object-center"
                        />
                    ) : null}
                </div>
            </div>

            {/* Guess button - absolute in top right */}
            {!guessResult && selectedLat !== null && selectedLng !== null && (
                <div className="absolute top-6 right-6 z-40">
                    <Button
                        onClick={handleGuess}
                        size="lg"
                        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg transition-all duration-200"
                    >
                        Make Guess
                    </Button>
                </div>
            )}

            {/* Next Map button when result is shown - absolute in top right */}
            {guessResult && selectedLat !== null && selectedLng !== null && (
                <div className="absolute top-6 right-6 z-40">
                    <Button
                        onClick={handleNextMap}
                        size="lg"
                        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg transition-all duration-200"
                    >
                        {currentRound.length < GUESSES_PER_ROUND - 1 ? 'Next Map' : 'Finish Round'}
                    </Button>
                </div>
            )}

            {/* Report Problem button - absolute in bottom left */}
            {currentMap && (
                <div className="absolute bottom-6 left-6 z-40">
                    <ReportProblemPopover mapId={currentMap._id} />
                </div>
            )}

            {/* Floating location picker map - automatically adapts to light/dark theme */}
            <LocationPickerMap
                onLocationSelect={handleLocationSelect}
                initialCenter={[59.3293, 18.0686]}
                initialZoom={3}
                resetTrigger={resetTrigger}
                forceCollapsed={isTransitioning}
                guessedLocation={
                    guessResult && selectedLat !== null && selectedLng !== null
                        ? {
                            guessPosition: [selectedLat, selectedLng],
                            actualPosition: [guessResult.actualLat, guessResult.actualLng],
                            distance: guessResult.distance,
                            score: guessResult.score,
                        }
                        : undefined
                }
            />
        </div>
    );
}

