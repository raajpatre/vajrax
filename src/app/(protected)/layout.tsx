import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 pt-[var(--nav-height)]">{children}</main>
            <Footer />
        </div>
    );
}
