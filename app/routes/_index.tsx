import { Button } from "~/components/ui/button";
import { Link } from "react-router";

export function meta() {
  return [
    { title: "OGuessr - Orienteering Map Guessing Game" },
    { name: "description", content: "Test your orienteering map knowledge" },
  ];
}

export default function Home() {
  return (
    <main className="relative min-h-full flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-green-500/10 dark:bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 dark:bg-blue-500/3 rounded-full blur-3xl" />
      </div>

      {/* Compass decoration */}
      <div className="absolute top-8 right-8 opacity-10 dark:opacity-5 select-none pointer-events-none">
        <svg width="120" height="120" viewBox="0 0 100 100" className="text-foreground">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M50 10 L55 50 L50 90 L45 50 Z" fill="currentColor" />
          <text x="50" y="8" textAnchor="middle" fontSize="8" fill="currentColor">N</text>
        </svg>
      </div>

      <div className="flex flex-col gap-8 items-center text-center max-w-2xl">
        {/* Logo / Title area */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <h1 className="text-6xl sm:text-7xl font-black tracking-tighter bg-gradient-to-br from-green-600 via-emerald-500 to-teal-500 dark:from-green-400 dark:via-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-0">
              OGuessr
            </h1>
            <div className="absolute -top-2 -right-4 text-2xl">🧭</div>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-md">
            Can you identify the location from an orienteering map?
          </p>
        </div>

        {/* Game mode buttons */}
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Choose Game Mode
          </p>

          <div className="flex flex-col gap-3">
            <Link to="/play?mode=sprint" className="w-full">
              <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-500/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="mr-2">🏃</span>
                Sprint
              </Button>
            </Link>

            <Link to="/play?mode=mixed" className="w-full">
              <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white shadow-lg shadow-orange-500/25 dark:shadow-orange-500/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="mr-2">🎲</span>
                Mixed
              </Button>
            </Link>

            <Link to="/play?mode=forest" className="w-full">
              <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white shadow-lg shadow-green-600/25 dark:shadow-green-600/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="mr-2">🌲</span>
                Forest
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-xs text-muted-foreground mt-4">
          Inspired by GeoGuessr • Made for orienteers
        </p>
      </div>
    </main>
  );
}
