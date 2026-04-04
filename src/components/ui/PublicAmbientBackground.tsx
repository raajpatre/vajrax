"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import FloatingLines from "@/components/FloatingLines";

export default function PublicAmbientBackground() {
    const pathname = usePathname();
    const [isCompact, setIsCompact] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);
    const [isLowPowerDevice, setIsLowPowerDevice] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 768px)");
        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
        const cores = navigator.hardwareConcurrency;

        const lowPower = (memory !== undefined && memory <= 4) || (cores !== undefined && cores <= 6);
        setIsLowPowerDevice(lowPower);

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

    const useDynamicBackground = pathname === "/" || pathname === "/login";

    if (reduceMotion || !useDynamicBackground) {
        return (
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[#0b0e14]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.08),_transparent_35%),radial-gradient(circle_at_80%_18%,_rgba(0,218,243,0.06),_transparent_24%)]" />
                <div className="absolute inset-0 bg-grid opacity-25" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#0b0e14]/78" />
            </div>
        );
    }

    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-[#0b0e14]" />
            <div className="absolute inset-0 opacity-45 md:opacity-55">
                <FloatingLines
                    linesGradient={["#00e5ff", "#c3f5ff", "#00daf3"]}
                    lineCount={isCompact || isLowPowerDevice ? [3, 4, 3] : [4, 5, 4]}
                    lineDistance={isCompact || isLowPowerDevice ? [4.4, 5.2, 4.6] : [5.2, 6.0, 5.4]}
                    topWavePosition={{ x: 10, y: 0.55, rotate: -0.42 }}
                    middleWavePosition={{ x: 5.4, y: 0.02, rotate: 0.18 }}
                    animationSpeed={isCompact || isLowPowerDevice ? 0.72 : 0.92}
                    interactive={!isCompact && !isLowPowerDevice}
                    bendRadius={isCompact || isLowPowerDevice ? 5.0 : 6.6}
                    bendStrength={-0.53}
                    mouseDamping={0.05}
                    parallax={!isLowPowerDevice}
                    parallaxStrength={isCompact || isLowPowerDevice ? 0.08 : 0.16}
                    pixelRatioCap={isLowPowerDevice ? 1 : 1.3}
                    maxFps={isLowPowerDevice ? 28 : 38}
                />
            </div>
            <div className="animate-ambient-drift absolute inset-0 bg-grid opacity-[0.2]" />
            <div className="animate-ambient-drift absolute inset-0 bg-[radial-gradient(circle_at_20%_28%,rgba(0,229,255,0.12),transparent_16%),radial-gradient(circle_at_74%_35%,rgba(0,218,243,0.1),transparent_18%),radial-gradient(circle_at_50%_80%,rgba(0,229,255,0.06),transparent_20%)] [animation-delay:2.8s]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.06),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(0,218,243,0.05),_transparent_26%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#0b0e14]/74" />
        </div>
    );
}
