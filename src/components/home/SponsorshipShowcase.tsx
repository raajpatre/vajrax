"use client";

import { motion } from "framer-motion";
import type { Sponsor } from "@/actions/sponsors";

type SponsorshipShowcaseProps = {
    sponsors: Sponsor[];
};

const TIER_FG: Record<string, string> = {
    Platinum: "#00e5ff",
    Gold:     "#f59e0b",
    Silver:   "#8b9ab0",
};

const TIER_BG: Record<string, string> = {
    Platinum: "rgba(0,229,255,0.04)",
    Gold:     "rgba(245,158,11,0.04)",
    Silver:   "rgba(139,154,176,0.03)",
};

const TIER_BORDER: Record<string, string> = {
    Platinum: "rgba(0,229,255,0.14)",
    Gold:     "rgba(245,158,11,0.14)",
    Silver:   "rgba(139,154,176,0.10)",
};

/* ── Sponsor card — logo + tier badge, links out if website set ── */
function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
    const fg     = TIER_FG[sponsor.tier]     ?? TIER_FG.Silver;
    const bg     = TIER_BG[sponsor.tier]     ?? TIER_BG.Silver;
    const border = TIER_BORDER[sponsor.tier] ?? TIER_BORDER.Silver;

    const inner = (
        <div
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-sm h-full min-h-[110px] transition-transform duration-200 hover:scale-[1.03]"
        >
            {sponsor.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="h-10 w-auto max-w-[140px] object-contain"
                />
            ) : (
                <span className="font-semibold text-[14px] text-[#f0f4ff] text-center leading-snug">
                    {sponsor.name}
                </span>
            )}
            {sponsor.tier !== "Platinum" && (
                <span
                    className="font-mono text-[9px] uppercase tracking-[0.22em]"
                    style={{ color: fg }}
                >
                    {sponsor.tier}
                </span>
            )}
        </div>
    );

    if (sponsor.website_link) {
        return (
            <a
                href={sponsor.website_link}
                target="_blank"
                rel="noreferrer"
                aria-label={`Visit ${sponsor.name}`}
                className="block h-full"
            >
                {inner}
            </a>
        );
    }
    return <div className="h-full">{inner}</div>;
}

/* ── Tier row ── */
function TierRow({ label, sponsors, color }: { label: string; sponsors: Sponsor[]; color: string }) {
    if (sponsors.length === 0) return null;
    return (
        <div className="space-y-3">
            {/* Tier divider */}
            {label && (
                <div className="flex items-center gap-3">
                    <span
                        className="font-mono text-[10px] uppercase tracking-[0.22em] shrink-0"
                        style={{ color }}
                    >
                        {label}
                    </span>
                    <div className="flex-1 h-px" style={{ background: `${color}22` }} />
                    <span className="font-mono text-[10px]" style={{ color: "#4a5568" }}>
                        {String(sponsors.length).padStart(2, "0")}
                    </span>
                </div>
            )}
            {/* Responsive grid — grows as more sponsors are added */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {sponsors.map((s) => (
                    <SponsorCard key={s.id} sponsor={s} />
                ))}
            </div>
        </div>
    );
}

/* ── Full sponsors section ── */
export default function SponsorshipShowcase({ sponsors }: SponsorshipShowcaseProps) {
    const platinum = sponsors.filter((s) => s.tier === "Platinum");
    const gold     = sponsors.filter((s) => s.tier === "Gold");
    const silver   = sponsors.filter((s) => s.tier === "Silver");
    const isEmpty  = sponsors.length === 0;

    return (
        <section
            className="relative bg-[#07090f]"
            style={{
                borderTop:    "1px solid rgba(0,229,255,0.08)",
                borderBottom: "1px solid rgba(0,229,255,0.08)",
            }}
        >
            <div className="max-w-[1480px] mx-auto px-6 lg:px-10 pt-12 pb-10 space-y-10">
                {/* Header */}
                <div className="flex items-end justify-between flex-wrap gap-4">
                    <div>
                        <motion.h2
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-60px" }}
                            transition={{ duration: 0.6, delay: 0.05 }}
                            className="font-extrabold tracking-tight leading-none text-[#f0f4ff]"
                            style={{ fontSize: "clamp(24px, 2.4vw, 34px)" }}
                        >
                            We don't build alone.
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-60px" }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="mt-3 max-w-[60ch] leading-relaxed"
                            style={{ fontSize: 13.5, color: "#8b9ab0" }}
                        >
                            Machines, materials, hours, and shop space — backed by companies that get why a
                            student team with an arbor press is worth betting on.
                        </motion.p>
                    </div>
                </div>

                {/* Grid or empty state */}
                {isEmpty ? (
                    <div
                        className="flex items-center justify-center py-14 rounded-sm font-mono text-[11px] uppercase tracking-[0.18em]"
                        style={{
                            border: "1px dashed rgba(0,229,255,0.12)",
                            color:  "#4a5568",
                        }}
                    >
                        Sponsor logos will appear here once added by faculty or the president.
                    </div>
                ) : (
                    <div className="space-y-8">
                        <TierRow label=""         sponsors={platinum} color={TIER_FG.Platinum} />
                        <TierRow label="Gold"     sponsors={gold}     color={TIER_FG.Gold}     />
                        <TierRow label="Silver"   sponsors={silver}   color={TIER_FG.Silver}   />
                    </div>
                )}

                {/* Sponsorship CTA */}
                <div
                    className="flex items-center justify-end pt-6"
                    style={{ borderTop: "1px solid rgba(0,229,255,0.08)" }}
                >
                    <a
                        href="mailto:vajrax2025@gmail.com"
                        className="cir-btn"
                    >
                        Become a sponsor
                        <svg className="cir-btn__arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path
                                d="M3 11L11 3M11 3H5M11 3V9"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </a>
                </div>
            </div>
        </section>
    );
}
