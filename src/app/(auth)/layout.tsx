import Image from "next/image";
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
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-x-hidden bg-[#0b0e14] px-6 py-12">
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
                <Image
                    src="/vajrax-logo.png"
                    alt="VajraX logo"
                    width={52}
                    height={52}
                    className="hidden h-12 w-12 object-contain transition-transform duration-300 group-hover:scale-105 sm:block"
                />
                <Image
                    src="/vajrax-wordmark.png"
                    alt="VajraX"
                    width={210}
                    height={50}
                    className="h-8 w-auto object-contain"
                />
            </Link>

            {/* Auth card */}
            <div className="relative z-10 w-full max-w-md">{children}</div>
        </div>
    );
}
