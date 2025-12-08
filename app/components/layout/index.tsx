import { Topbar } from "./topbar";

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="flex flex-col h-screen w-full max-h-screen overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}
