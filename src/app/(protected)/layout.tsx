import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import PublicAmbientBackground from "@/components/ui/PublicAmbientBackground";
import ProtectedSidebar from "@/components/ui/ProtectedSidebar";

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen">
            <ProtectedSidebar />
            <div className="flex flex-col flex-1 transition-[padding] duration-300 lg:pl-[260px] [.sidebar-collapsed_&]:lg:pl-[68px]">
                <Navbar />
                <PublicAmbientBackground />
                <main className="relative z-10 flex-1 pt-[var(--nav-height)]">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
}
