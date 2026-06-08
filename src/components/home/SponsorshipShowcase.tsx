"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Sponsor } from "@/actions/sponsors";

type SponsorshipShowcaseProps = {
    sponsors: Sponsor[];
};

/* ── Tier colour map ── */
const TIER_FG: Record<string, string> = {
    Platinum: "#00e5ff",
    Gold:     "#f59e0b",
    Silver:   "#8b9ab0",
};

/* ── Single sponsor tile — no box, true logo colours, tier label below ── */
function SponsorTile({ sponsor }: { sponsor: Sponsor }) {
    const fg = TIER_FG[sponsor.tier] ?? TIER_FG.Silver;

    const inner = (
        <div className="shrink-0 flex flex-col items-center gap-2 px-10 select-none">
            {/* Logo or name fallback */}
            {sponsor.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="h-10 w-auto max-w-[160px] object-contain"
                />
            ) : (
                <span
                    className="font-semibold tracking-tight text-[14px]"
                    style={{ color: "#f0f4ff" }}
                >
                    {sponsor.name}
                </span>
            )}
            {/* Tier label */}
            <span
                className="font-mono text-[9px] uppercase tracking-[0.22em]"
                style={{ color: fg }}
            >
                {sponsor.tier}
            </span>
        </div>
    );

    if (sponsor.website_link) {
        return (
            <a
                href={sponsor.website_link}
                target="_blank"
                rel="noreferrer"
                className="shrink-0"
                aria-label={`Visit ${sponsor.name}`}
            >
                {inner}
            </a>
        );
    }
    return <div className="shrink-0">{inner}</div>;
}

// Target scroll speed in pixels per second. Duration is derived from measured group width.
const PX_PER_SEC = 80;

/* ── CSS-animated marquee strip ── */
function Marquee({
    items,
    direction = "left",
    gap = 24,
}: {
    items: Sponsor[];
    direction?: "left" | "right";
    gap?: number;
}) {
    const groupRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState<number | null>(null);

    useLayoutEffect(() => {
        if (groupRef.current) {
            // offset = group width + the gap between the two groups, so the
            // seamless clone starts exactly where the first group ends.
            setOffset(groupRef.current.offsetWidth + gap);
        }
    }, [gap]);

    if (items.length === 0) return null;

    const animName = direction === "left" ? "marqueeL" : "marqueeR";
    // Minimum 8 s so a single small logo doesn't whip by too fast.
    const duration = offset != null ? Math.max(8, offset / PX_PER_SEC) : null;

    return (
        <div className="relative overflow-hidden marquee-host">
            {/* Edge fade masks */}
            <div
                className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none"
                style={{ background: "linear-gradient(90deg, #07090f 0%, rgba(7,9,15,0) 100%)" }}
            />
            <div
                className="absolute inset-y-0 right-0 w-24 z-10 pointer-events-none"
                style={{ background: "linear-gradient(270deg, #07090f 0%, rgba(7,9,15,0) 100%)" }}
            />

            {/* Two identical groups — translate by exactly one group width for a seamless loop */}
            <div
                className="marquee-track flex items-center"
                style={{
                    gap,
                    animation: duration != null ? `${animName} ${duration}s linear infinite` : undefined,
                    "--marquee-offset": offset != null ? `-${offset}px` : "-50%",
                } as React.CSSProperties}
            >
                <div ref={groupRef} className="flex items-center shrink-0" style={{ gap }}>
                    {items.map((s, i) => <SponsorTile key={`a-${i}`} sponsor={s} />)}
                </div>
                <div className="flex items-center shrink-0" style={{ gap }}>
                    {items.map((s, i) => <SponsorTile key={`b-${i}`} sponsor={s} />)}
                </div>
            </div>
        </div>
    );
}

/* ── Full sponsors section ── */
export default function SponsorshipShowcase({ sponsors }: SponsorshipShowcaseProps) {
    const platinum = sponsors.filter((s) => s.tier === "Platinum");
    const gold = sponsors.filter((s) => s.tier === "Gold");
    const silver = sponsors.filter((s) => s.tier === "Silver");

    // Strip 1 (left): Platinum + Gold; Strip 2 (right): Silver
    const strip1 = [...platinum, ...gold];
    const strip2 = silver;

    const isEmpty = sponsors.length === 0;

    return (
        <section
            className="relative bg-[#07090f]"
            style={{
                borderTop: "1px solid rgba(0,229,255,0.08)",
                borderBottom: "1px solid rgba(0,229,255,0.08)",
            }}
        >
            {/* Header */}
            <div className="max-w-[1480px] mx-auto px-6 lg:px-10 pt-12 pb-3">
                <div className="flex items-end justify-between flex-wrap gap-4">
                    {/* Left: kicker + headline + subtitle */}
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-60px" }}
                            transition={{ duration: 0.55 }}
                            className="flex items-center gap-2 mb-3"
                        >
                            <span
                                className="h-px w-8"
                                style={{ background: "rgba(0,229,255,0.6)" }}
                            />
                            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#00e5ff]">
                                // supported by
                            </span>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-60px" }}
                            transition={{ duration: 0.6, delay: 0.05 }}
                            className="font-extrabold tracking-tight leading-none text-[#f0f4ff]"
                            style={{ fontSize: "clamp(24px, 2.4vw, 34px)" }}
                        >
                            The hands holding the workshop up.
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-60px" }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="mt-3 max-w-[60ch] leading-relaxed"
                            style={{ fontSize: 13.5, color: "#8b9ab0" }}
                        >
                            Hardware, materials, time, and tooling — from companies who think a
                            student team with an arbor press deserves real backing.
                        </motion.p>
                    </div>

                    {/* Right: tier legend */}
                    {!isEmpty && (
                        <div className="flex items-center gap-4">
                            {platinum.length > 0 && (
                                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8b9ab0]">
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                            background: "#00e5ff",
                                            boxShadow: "0 0 6px #00e5ff",
                                        }}
                                    />
                                    PLATINUM · {String(platinum.length).padStart(2, "0")}
                                </div>
                            )}
                            {gold.length > 0 && (
                                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8b9ab0]">
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                            background: "#f59e0b",
                                            boxShadow: "0 0 6px #f59e0b",
                                        }}
                                    />
                                    GOLD · {String(gold.length).padStart(2, "0")}
                                </div>
                            )}
                            {silver.length > 0 && (
                                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8b9ab0]">
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: "#8b9ab0" }}
                                    />
                                    SILVER · {String(silver.length).padStart(2, "0")}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Marquee strips */}
            {isEmpty ? (
                <div className="max-w-[1480px] mx-auto px-6 lg:px-10 py-10">
                    <div
                        className="flex items-center justify-center py-10 rounded-sm font-mono text-[11px] uppercase tracking-[0.18em]"
                        style={{
                            border: "1px dashed rgba(0,229,255,0.12)",
                            color: "#4a5568",
                        }}
                    >
                        Sponsor logos will appear here once added by faculty or the president.
                    </div>
                </div>
            ) : (
                <div className="pt-8 pb-4 space-y-5">
                    {strip1.length > 0 && (
                        <Marquee items={strip1} direction="left" />
                    )}
                    {strip2.length > 0 && (
                        <Marquee items={strip2} direction="right" />
                    )}
                    {strip1.length === 0 && strip2.length === 0 && (
                        <Marquee items={sponsors} direction="left" />
                    )}
                </div>
            )}

            {/* Bottom CTA */}
            <div
                className="max-w-[1480px] mx-auto px-6 lg:px-10 py-10 flex items-center justify-between"
                style={{ borderTop: "1px solid rgba(0,229,255,0.08)" }}
            >
                <span
                    className="font-mono text-[10.5px] uppercase tracking-[0.18em]"
                    style={{ color: "#4a5568" }}
                >
                    // sponsorship inquiries
                </span>
                <a
                    href="mailto:vajrax@newton.edu.in"
                    className="btn-secondary inline-flex items-center gap-2 !text-xs"
                >
                    Become a sponsor
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                    >
                        <path
                            d="M2 7h10M7 2l5 5-5 5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </a>
            </div>
        </section>
    );
}
