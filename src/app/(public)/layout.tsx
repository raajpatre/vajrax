import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import PublicAmbientBackground from "@/components/ui/PublicAmbientBackground";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#050B14]">
            <PublicAmbientBackground />
            <Navbar />
            <main className="relative z-10 flex-1">{children}</main>
            <div className="relative z-10">
                <Footer />
            </div>
        </div>
    );
}
