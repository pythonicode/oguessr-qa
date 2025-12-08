import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMapEvents, Marker, useMap, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useTheme } from "./theme/theme-provider";

// Fix for default marker icon in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Create custom icons for actual and guess locations (for result display)
const actualLocationIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const guessLocationIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number) => void;
    selectedPosition: [number, number] | null;
    setSelectedPosition: (position: [number, number]) => void;
    disabled?: boolean; // Disable clicking when showing results
}

function LocationPicker({ onLocationSelect, selectedPosition, setSelectedPosition, disabled }: LocationPickerProps) {
    useMapEvents({
        click(e) {
            if (disabled) return;
            const { lat, lng } = e.latlng;
            setSelectedPosition([lat, lng]);
            onLocationSelect(lat, lng);
        },
    });

    return selectedPosition ? <Marker position={selectedPosition} /> : null;
}

interface MapControllerProps {
    isHovered: boolean;
    selectedPosition: [number, number] | null;
    guessedLocation?: {
        guessPosition: [number, number];
        actualPosition: [number, number];
        score?: number;
    };
}

function MapController({ isHovered, selectedPosition, guessedLocation }: MapControllerProps) {
    const map = useMap();

    useEffect(() => {
        if (isHovered) {
            map.scrollWheelZoom.enable();
            map.dragging.enable();
            map.doubleClickZoom.enable();

            // Wait for the CSS transition to complete, then invalidate size
            // This ensures Leaflet recalculates the map dimensions after expansion
            setTimeout(() => {
                map.invalidateSize();
            }, 300); // Match the transition duration in the CSS
        } else {
            map.scrollWheelZoom.disable();
            map.dragging.disable();
            map.doubleClickZoom.disable();

            // Also invalidate size when shrinking
            setTimeout(() => {
                map.invalidateSize();
            }, 300);
        }
    }, [isHovered, map]);

    // Center map on selected position when not hovered and not showing results
    useEffect(() => {
        if (!isHovered && selectedPosition && !guessedLocation) {
            map.setView(selectedPosition, 5, { animate: true });
        }
    }, [isHovered, selectedPosition, guessedLocation, map]);

    // Fit bounds to show both markers when displaying results
    useEffect(() => {
        if (guessedLocation) {
            const bounds = L.latLngBounds([
                guessedLocation.actualPosition,
                guessedLocation.guessPosition,
            ]);
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 10,
            });
        }
    }, [guessedLocation, map]);

    return null;
}

type TileLayerStyle = 'voyager' | 'positron' | 'dark' | 'streets' | 'satellite';

interface LocationPickerMapProps {
    onLocationSelect?: (lat: number, lng: number) => void;
    initialCenter?: [number, number];
    initialZoom?: number;
    tileLayerStyle?: TileLayerStyle;
    resetTrigger?: number; // Increment this to reset the selected position
    forceCollapsed?: boolean; // Force the map to be collapsed (shrunk)
    guessedLocation?: {
        guessPosition: [number, number];
        actualPosition: [number, number];
        distance: number; // in kilometers
        score?: number; // GeoGuessr-style score
    };
}

const TILE_LAYERS = {
    voyager: {
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    positron: {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    dark: {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    streets: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; Esri',
    },
    satellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    },
};

// Helper to get the actual resolved theme (handles 'system' preference)
function getResolvedTheme(theme: string): 'light' | 'dark' {
    if (theme === 'system') {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    }
    return theme as 'light' | 'dark';
}

export function LocationPickerMap({
    onLocationSelect,
    initialCenter = [59.3293, 18.0686], // Stockholm, Sweden
    initialZoom = 3,
    tileLayerStyle, // If not provided, will auto-switch based on theme
    resetTrigger = 0,
    forceCollapsed = false,
    guessedLocation,
}: LocationPickerMapProps) {
    const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const { theme } = useTheme();

    // Reset selected position when resetTrigger changes
    useEffect(() => {
        setSelectedPosition(null);
    }, [resetTrigger]);

    // Force collapse when forceCollapsed prop is true
    useEffect(() => {
        if (forceCollapsed) {
            setIsHovered(false);
        }
    }, [forceCollapsed]);

    // When showing results, automatically expand the map (unless forced collapsed)
    useEffect(() => {
        if (guessedLocation && !forceCollapsed) {
            setIsHovered(true);
        }
    }, [guessedLocation, forceCollapsed]);

    // Auto-select tile layer based on theme if not explicitly set
    const resolvedTheme = getResolvedTheme(theme);
    const activeTileStyle = tileLayerStyle || (resolvedTheme === 'dark' ? 'dark' : 'positron');

    // Detect mobile devices
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // Tailwind's md breakpoint
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Ensure component only renders on client side to avoid SSR issues
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleLocationSelect = (lat: number, lng: number) => {
        console.log("Selected coordinates:", { lat, lng });
        onLocationSelect?.(lat, lng);
    };

    if (!isMounted) {
        return null;
    }

    const handleMouseEnter = () => {
        // Only use hover behavior on desktop
        if (!isMobile) {
            setIsHovered(true);
            // Prevent page scrolling when interacting with the map
            document.body.style.overflow = 'hidden';
        }
    };

    const handleMouseLeave = () => {
        // Only use hover behavior on desktop
        if (!isMobile) {
            setIsHovered(false);
            // Re-enable page scrolling
            document.body.style.overflow = '';
        }
    };

    const handleTouchStart = () => {
        // On mobile, expand on touch
        if (isMobile) {
            setIsHovered(true);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (isHovered) {
            // Stop wheel events from propagating to the page
            e.stopPropagation();
        }
    };

    return (
        <div
            className={`
                fixed z-50
                rounded-lg shadow-2xl overflow-hidden
                border-2 border-gray-300 dark:border-gray-600
                transition-all duration-300 ease-in-out
                ${isMobile
                    ? isHovered
                        ? "bottom-0 left-0 right-0 w-full h-[70vh] rounded-b-none"
                        : "bottom-4 left-4 right-4 w-auto h-[180px]"
                    : isHovered
                        ? "bottom-4 right-4 w-[800px] h-[600px]"
                        : "bottom-4 right-4 w-[300px] h-[200px]"
                }
            `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onWheel={handleWheel}
        >
            <MapContainer
                center={initialCenter}
                zoom={initialZoom}
                style={{ height: "100%", width: "100%" }}
                className="z-0"
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                zoomControl={isHovered}
            >
                <TileLayer
                    key={activeTileStyle} // Force re-render when theme changes
                    attribution={TILE_LAYERS[activeTileStyle].attribution}
                    url={TILE_LAYERS[activeTileStyle].url}
                />
                <MapController
                    isHovered={isHovered}
                    selectedPosition={selectedPosition}
                    guessedLocation={guessedLocation}
                />

                {/* Show comparison markers and line when guessedLocation is provided */}
                {guessedLocation ? (
                    <>
                        <Marker position={guessedLocation.actualPosition} icon={actualLocationIcon} />
                        <Marker position={guessedLocation.guessPosition} icon={guessLocationIcon} />
                        <Polyline
                            positions={[guessedLocation.actualPosition, guessedLocation.guessPosition]}
                            color="#3b82f6"
                            weight={3}
                            opacity={0.7}
                            dashArray="10, 10"
                        />
                    </>
                ) : (
                    <LocationPicker
                        onLocationSelect={handleLocationSelect}
                        selectedPosition={selectedPosition}
                        setSelectedPosition={setSelectedPosition}
                        disabled={!!guessedLocation}
                    />
                )}
            </MapContainer>

            {/* Hint when not expanded and no location selected */}
            {!isHovered && !selectedPosition && !guessedLocation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 text-white px-3 py-1 rounded-md text-xs">
                        {isMobile ? "Tap to expand" : "Hover to expand"}
                    </div>
                </div>
            )}

            {/* Legend when showing results */}
            {guessedLocation && isHovered && (
                <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 text-sm space-y-2 z-[1000]">
                    {guessedLocation.score !== undefined && (
                        <div className="font-bold text-2xl mb-2 text-orange-500">
                            {guessedLocation.score.toLocaleString()} points
                        </div>
                    )}
                    <div className="font-semibold mb-2">
                        Distance: {guessedLocation.distance.toFixed(2)} km
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Actual Location</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Your Guess</span>
                    </div>
                </div>
            )}

            {/* Close button for mobile when expanded */}
            {isMobile && isHovered && (
                <button
                    onClick={() => setIsHovered(false)}
                    className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-full p-2 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Close map"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
}

