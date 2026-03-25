"use client";

import { useEffect, useState } from "react";
import FloatingLines from "@/components/FloatingLines";

export default function PublicAmbientBackground() {
    const [isCompact, setIsCompact] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 768px)");
        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

        const syncState = () => {
            setIsCompact(mediaQuery.matches);
            setReduceMotion(motionQuery.matches);
        };

        syncState();
        mediaQuery.addEventListener("change", syncState);
        motionQuery.addEventListener("change", syncState);

        return () => {
            mediaQuery.removeEventListener("change", syncState);
            motionQuery.removeEventListener("change", syncState);
        };
    }, []);

    if (reduceMotion) {
        return (
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[#050B14]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,242,255,0.10),_transparent_35%),radial-gradient(circle_at_80%_18%,_rgba(212,175,55,0.08),_transparent_24%)]" />
                <div className="absolute inset-0 bg-grid opacity-25" />
            </div>
        );
    }

    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-[#050B14]" />
            <div className="absolute inset-0 opacity-45 md:opacity-55">
                <FloatingLines
                    linesGradient={["#00f2ff", "#e0e6ed", "#ffc400"]}
                    topWavePosition={{ x: 10, y: 0.55, rotate: -0.42 }}
                    middleWavePosition={{ x: 5.4, y: 0.02, rotate: 0.18 }}
                    animationSpeed={isCompact ? 0.9 : 1.15}
                    interactive={!isCompact}
                    bendRadius={isCompact ? 5.5 : 7.5}
                    bendStrength={-0.53}
                    mouseDamping={0.05}
                    parallax
                    parallaxStrength={isCompact ? 0.14 : 0.24}
                />
            </div>
            <div className="animate-ambient-drift absolute inset-0 bg-grid opacity-[0.2]" />
            <div className="animate-ambient-drift absolute inset-0 bg-[radial-gradient(circle_at_20%_28%,rgba(123,97,255,0.18),transparent_16%),radial-gradient(circle_at_74%_35%,rgba(76,201,240,0.14),transparent_18%),radial-gradient(circle_at_50%_80%,rgba(31,232,216,0.1),transparent_20%)] [animation-delay:2.8s]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,242,255,0.08),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(212,175,55,0.08),_transparent_26%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#050B14]/74" />
        </div>
    );
}
