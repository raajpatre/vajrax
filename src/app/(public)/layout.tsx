import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}
