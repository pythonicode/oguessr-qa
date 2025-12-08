import { Moon, Sun } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTheme } from "~/components/theme/theme-provider";
import * as React from "react";

export function ModeToggle() {
    const { setTheme, theme } = useTheme();

    // Helper to get system theme in JS
    const getSystemTheme = React.useCallback(() => {
        if (typeof window === "undefined") return "light";
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }, []);

    // Get system theme, reactively, in case it changes
    const [systemTheme, setSystemTheme] = React.useState(getSystemTheme);

    React.useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => setSystemTheme(getSystemTheme());
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [getSystemTheme]);

    // Determine current, visible theme effectively
    const effectiveTheme = theme === "system" ? systemTheme : theme;

    const toggleTheme = () => {
        if (theme === "system") {
            if (systemTheme === "dark") {
                setTheme("light");
            } else {
                setTheme("dark");
            }
        } else {
            setTheme(theme === "dark" ? "light" : "dark");
        }
    };

    return (
        <Button
            variant="outline"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="relative"
        >
            {effectiveTheme === "dark" ? (
                <Sun className="h-3 w-3" />
            ) : (
                <Moon className="h-3 w-3" />
            )}
        </Button>
    );
}
