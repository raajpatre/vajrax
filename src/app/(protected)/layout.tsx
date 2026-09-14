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
                <PublicAmbientBackground />
                <main className="relative z-30 flex-1 pt-20 lg:pt-0">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
}
