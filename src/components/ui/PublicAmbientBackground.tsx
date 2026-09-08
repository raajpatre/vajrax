"use client";

export default function PublicAmbientBackground() {
    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-[#0b0e14]" />
            <div className="hidden md:block absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.08),_transparent_35%),radial-gradient(circle_at_80%_18%,_rgba(0,218,243,0.06),_transparent_24%)]" />
            <div className="absolute inset-0 bg-grid opacity-25" />
            <div className="hidden md:block absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#0b0e14]/78" />
            <div className="md:hidden absolute inset-0 bg-gradient-to-b from-transparent to-[#0b0e14]/90" />
        </div>
    );
}
