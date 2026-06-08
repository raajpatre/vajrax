"use client";

import { useUser } from "@/lib/hooks/useUser";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import PublicAmbientBackground from "@/components/ui/PublicAmbientBackground";
import ProtectedSidebar from "@/components/ui/ProtectedSidebar";

export default function PublicLayoutShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, loading } = useUser();

    // Authenticated: sidebar layout (same as protected pages)
    if (!loading && isAuthenticated) {
        return (
            <div
                className="flex min-h-screen bg-[#050B14]"
                style={{ "--nav-height": "0px" } as React.CSSProperties}
            >
                <ProtectedSidebar />
                <div className="flex flex-col flex-1 transition-[padding] duration-300 lg:pl-[260px] [.sidebar-collapsed_&]:lg:pl-[68px]">
                    <PublicAmbientBackground />
                    <main className="relative z-10 flex-1 pt-14 lg:pt-0">{children}</main>
                    <div className="relative z-10">
                        <Footer />
                    </div>
                </div>
            </div>
        );
    }

    // Unauthenticated (or loading — avoids flash of sidebar)
    return (
        <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-[#050B14]">
            <PublicAmbientBackground />
            {!loading && <Navbar />}
            <main className="relative z-10 flex-1">{children}</main>
            <div className="relative z-10">
                <Footer />
            </div>
        </div>
    );
}
