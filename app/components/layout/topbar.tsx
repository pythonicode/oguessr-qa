import { ModeToggle } from "../theme/mode-toggle";
import { Link } from "react-router";

export function Topbar() {
    return (
        <header className="w-full flex items-center justify-between px-2 py-1 border-b gap-2">
            <Link to="/"><img src="/logo.png" alt="Logo" className="h-6" /></Link>
            <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground mb-0">
                    By <a href="https://www.anthonyriley.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Anthony Riley</a>
                </p>
                <ModeToggle />
            </div>
        </header>
    );
}
