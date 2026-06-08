"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";
import type { Sponsor } from "@/actions/sponsors";
import SponsorshipShowcase from "@/components/home/SponsorshipShowcase";

type HomePageClientProps = {
    sponsors: Sponsor[];
    stats: {
        members: number;
        awards: number;
        years: number;
    };
};

/* ── Circuit-trace SVG decorations ── */
type CircuitTraceProps = {
    which?: number;
    className?: string;
    style?: React.CSSProperties;
};

function CircuitTrace({ which = 0, className = "", style }: CircuitTraceProps) {
    const paths = [
        {
            viewBox: "0 0 600 400",
            d: [
                "M 0 200 L 120 200 L 140 220 L 280 220 L 300 240 L 600 240",
                "M 80 200 L 80 60  M 240 220 L 240 100",
                "M 380 240 L 380 360",
            ],
            nodes: [
                [120, 200], [280, 220], [80, 60], [240, 100], [380, 360],
            ] as [number, number][],
        },
        {
            viewBox: "0 0 500 400",
            d: [
                "M 500 80 L 380 80 L 360 100 L 220 100 L 200 120 L 80 120 L 0 120",
                "M 360 100 L 360 240",
                "M 200 120 L 200 300 L 0 300",
                "M 100 120 L 100 60",
            ],
            nodes: [
                [380, 80], [220, 100], [80, 120], [360, 240], [200, 300], [100, 60],
            ] as [number, number][],
        },
        {
            viewBox: "0 0 400 300",
            d: [
                "M 0 50 L 80 50 L 90 60 L 200 60 L 210 70 L 320 70 L 330 80 L 400 80",
                "M 0 200 L 120 200 L 130 210 L 280 210 L 290 220 L 400 220",
                "M 200 60 L 200 200 M 290 220 L 290 80",
            ],
            nodes: [
                [80, 50], [200, 60], [320, 70], [120, 200], [280, 210],
            ] as [number, number][],
        },
    ];

    const p = paths[which % paths.length];
    return (
        <svg
            className={className}
            style={style}
            viewBox={p.viewBox}
            preserveAspectRatio="none"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="1.2"
        >
            {p.d.map((d, i) => (
                <path key={i} d={d} />
            ))}
            {p.nodes.map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="2.5" fill="#00e5ff" />
            ))}
        </svg>
    );
}

/* ── Home page ── */
export default function HomePageClient({ sponsors, stats }: HomePageClientProps) {
    const [t, setT] = useState(0);
    const [shown, setShown] = useState(false);

    // Trigger entry animations shortly after mount
    useEffect(() => {
        const id = setTimeout(() => setShown(true), 60);
        return () => clearTimeout(id);
    }, []);

    // Drive the slow circuit-trace drift
    useEffect(() => {
        let raf: number;
        const start = performance.now();
        const tick = () => {
            setT((performance.now() - start) / 1000);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    const drift = (k: number): string =>
        `translate(${Math.sin(t * 0.08 + k) * 6}px, ${Math.cos(t * 0.07 + k * 1.3) * 4}px)`;

    const stagger = (delay: number): React.CSSProperties => ({
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(14px)",
        filter: shown ? "blur(0)" : "blur(2px)",
        transition: [
            `opacity 700ms ${delay}ms cubic-bezier(.2,.7,.2,1)`,
            `transform 700ms ${delay}ms cubic-bezier(.2,.7,.2,1)`,
            `filter 700ms ${delay}ms cubic-bezier(.2,.7,.2,1)`,
        ].join(", "),
    });

    return (
        <>
            {/* ═══════════════════════════════════════════════
                HERO — full viewport, Terminal Core aesthetic
                ═══════════════════════════════════════════════ */}
            <section
                className="relative min-h-screen overflow-hidden"
                style={{ background: "#07090f" }}
            >
                {/* 40 px grid overlay, masked radially so edges fade out */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px)," +
                            "linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                        maskImage:
                            "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 90%)",
                        WebkitMaskImage:
                            "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 90%)",
                    }}
                />

                {/* Radial cyan glows — bottom-left large, top-right smaller */}
                <div
                    className="absolute -bottom-32 -left-32 w-[640px] h-[640px] pointer-events-none"
                    style={{
                        background: "radial-gradient(circle, rgba(0,229,255,0.13) 0%, transparent 70%)",
                    }}
                />
                <div
                    className="absolute -top-40 -right-40 w-[560px] h-[560px] pointer-events-none"
                    style={{
                        background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
                    }}
                />

                {/* Circuit-trace SVG decorations — 3 shapes, slow sine/cosine drift */}
                <div
                    className="absolute top-[6%] right-[-4%] w-[42vw] h-[40vh] pointer-events-none"
                    style={{ opacity: 0.06, transform: drift(0) }}
                >
                    <CircuitTrace which={0} className="w-full h-full" />
                </div>
                <div
                    className="absolute bottom-[12%] left-[-4%] w-[36vw] h-[44vh] pointer-events-none"
                    style={{ opacity: 0.06, transform: drift(2) }}
                >
                    <CircuitTrace which={1} className="w-full h-full" />
                </div>
                <div
                    className="absolute top-[44%] right-[10%] w-[26vw] h-[28vh] pointer-events-none"
                    style={{ opacity: 0.05, transform: drift(4) }}
                >
                    <CircuitTrace which={2} className="w-full h-full" />
                </div>

                {/* Scanlines */}
                <div className="absolute inset-0 pointer-events-none scanline opacity-50" />

                {/* ── Content — vertically centered in full viewport ── */}
                <div
                    className="relative flex flex-col items-center justify-center px-6 text-center lg:px-10"
                    style={{ minHeight: "100vh", paddingTop: "var(--nav-height)" }}
                >
                    {/* h1 — "VajraX" in Inter Black, clamp 64 → 168 px, glowing X */}
                    <h1
                        className="mt-7 leading-[0.88] text-[#f0f4ff]"
                        style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: "clamp(64px, 12vw, 168px)",
                            fontWeight: 900,
                            letterSpacing: "-0.045em",
                            ...stagger(80),
                        }}
                    >
                        Vajra
                        <span
                            className="text-[#00e5ff]"
                            style={{ textShadow: "0 0 28px rgba(0,229,255,0.55)" }}
                        >
                            X
                        </span>
                    </h1>

                    {/* h2 — tagline with cyan period separators */}
                    <h2
                        className="text-[#f0f4ff] font-bold tracking-tight"
                        style={{
                            fontSize: "clamp(28px, 3.4vw, 44px)",
                            marginTop: 14,
                            ...stagger(320),
                        }}
                    >
                        Design<span className="text-[#00e5ff]">.</span> Build
                        <span className="text-[#00e5ff]">.</span> Dominate
                        <span className="text-[#00e5ff]">.</span>
                    </h2>

                    {/* Tagline */}
                    <p
                        className="max-w-[58ch] mt-5 leading-relaxed"
                        style={{
                            color: "#8b9ab0",
                            fontSize: "clamp(14px, 1.2vw, 16.5px)",
                            ...stagger(460),
                        }}
                    >
                        Where hardware gets built, firmware gets written, and ideas don't stay on whiteboards. We compete, we ship.
                    </p>

                    {/* Stat strip */}
                    <div
                        className="mt-8 flex items-center gap-8 font-mono text-[11px] uppercase tracking-[0.18em]"
                        style={{ color: "#4a5568", ...stagger(580) }}
                    >
                        <span className="flex items-center gap-2">
                            <span
                                className="font-semibold tabular-nums text-[14px]"
                                style={{ color: "#f0f4ff" }}
                            >
                                {stats.members}
                            </span>{" "}
                            Members
                        </span>
                        <span
                            className="h-3 w-px"
                            style={{ background: "rgba(0,229,255,0.12)" }}
                        />
                        <span className="flex items-center gap-2">
                            <span
                                className="font-semibold tabular-nums text-[14px]"
                                style={{ color: "#f0f4ff" }}
                            >
                                {stats.awards}
                            </span>{" "}
                            Awards
                        </span>
                        <span
                            className="h-3 w-px"
                            style={{ background: "rgba(0,229,255,0.12)" }}
                        />
                        <span className="flex items-center gap-2">
                            <span
                                className="font-semibold tabular-nums text-[14px]"
                                style={{ color: "#f0f4ff" }}
                            >
                                {String(stats.years).padStart(2, "0")}
                            </span>{" "}
                            Years
                        </span>
                    </div>

                    {/* CTAs */}
                    <div
                        className="mt-9 flex flex-wrap items-center justify-center gap-3"
                        style={stagger(700)}
                    >
                        <Link
                            href="/signup"
                            className="btn btn-primary btn-lg group"
                        >
                            Join VajraX
                            <ArrowRight
                                size={15}
                                className="transition-transform group-hover:translate-x-1"
                            />
                        </Link>
                    </div>

                    {/* Scroll indicator — bounces continuously */}
                    <div
                        className="absolute bottom-8 left-1/2 flex flex-col items-center gap-2"
                        style={{
                            opacity: shown ? 1 : 0,
                            transform: shown
                                ? "translate(-50%, 0)"
                                : "translate(-50%, 14px)",
                            transition:
                                "opacity 700ms 900ms cubic-bezier(.2,.7,.2,1)," +
                                "transform 700ms 900ms cubic-bezier(.2,.7,.2,1)",
                        }}
                    >
                        <span
                            className="font-mono text-[10px] uppercase tracking-[0.28em]"
                            style={{ color: "#4a5568" }}
                        >
                            scroll
                        </span>
                        <span
                            className="grid place-items-center w-7 h-7 rounded-sm scroll-bounce"
                            style={{
                                border: "1px solid rgba(0,229,255,0.12)",
                                color: "#4a5568",
                            }}
                        >
                            <ArrowDown size={12} />
                        </span>
                    </div>
                </div>

                {/* Bottom aurora bar */}
                <div
                    className="absolute bottom-0 inset-x-0 h-[3px] pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(90deg," +
                            " transparent 0%," +
                            " rgba(0,229,255,0) 8%," +
                            " rgba(0,229,255,0.7) 30%," +
                            " #5eead4 50%," +
                            " rgba(245,158,11,0.7) 72%," +
                            " rgba(0,229,255,0) 92%," +
                            " transparent 100%)",
                        boxShadow: "0 -4px 24px rgba(0,229,255,0.35)",
                    }}
                />
            </section>

            {/* ── SPONSORS ── */}
            <SponsorshipShowcase sponsors={sponsors} />
        </>
    );
}
