import { Zap } from "lucide-react";
import Link from "next/link";

export const metadata = {
    title: "Authentication — VajraX",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-grid bg-radial px-6 py-12 relative">
            {/* Background glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

            {/* Logo */}
            <Link
                href="/"
                className="flex items-center gap-2.5 mb-8 relative z-10 group"
            >
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center group-hover:bg-primary/30 transition-all">
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
