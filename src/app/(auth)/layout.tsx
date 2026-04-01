import { Zap } from "lucide-react";
import Link from "next/link";
import PublicAmbientBackground from "@/components/ui/PublicAmbientBackground";

export const metadata = {
    title: "Authentication — VajraX",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-x-hidden bg-[#050B14] px-6 py-12">
            <PublicAmbientBackground />
            <div className="absolute inset-0 bg-grid opacity-60" />
            <div className="absolute inset-0 bg-radial opacity-55" />
            {/* Background glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

            {/* Logo */}
            <Link
                href="/"
                className="flex items-center gap-2.5 mb-8 relative z-10 group"
            >
                <div className="hidden h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/20 transition-all group-hover:bg-primary/30 sm:flex">
                    <Zap className="w-5 h-5 text-primary-light" />
                </div>
                <span className="text-2xl font-bold tracking-tight">
                    <span className="text-gradient">Vajra</span>
                    <span className="text-foreground">X</span>
                </span>
            </Link>

            {/* Auth card */}
            <div className="relative z-10 w-full max-w-md">{children}</div>
        </div>
    );
}
