"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import type { Sponsor } from "@/actions/sponsors";

type SponsorshipShowcaseProps = {
    sponsors: Sponsor[];
};

const tierPriority: Record<string, number> = {
    Platinum: 0,
    Gold: 1,
    Silver: 2,
};

function SponsorTile({ sponsor }: { sponsor: Sponsor }) {
    const isPremium = sponsor.tier === "Platinum" || sponsor.tier === "Gold";
    const tileHeight = sponsor.tier === "Platinum" ? "h-24 min-w-[16rem]" : sponsor.tier === "Gold" ? "h-20 min-w-[14rem]" : "h-16 min-w-[12rem]";
    const glow =
        sponsor.tier === "Platinum" || sponsor.tier === "Gold"
            ? "group-hover:shadow-[0_0_30px_rgba(212,175,55,0.18)] group-hover:border-[#D4AF37]/35"
            : "group-hover:shadow-[0_0_26px_rgba(0,242,255,0.14)] group-hover:border-[#00F2FF]/28";
    const imageHoverFilter =
        sponsor.tier === "Platinum" || sponsor.tier === "Gold"
            ? "group-hover:[filter:grayscale(0)_brightness(1)_drop-shadow(0_0_14px_rgba(212,175,55,0.55))]"
            : "group-hover:[filter:grayscale(0)_brightness(1)_drop-shadow(0_0_14px_rgba(0,242,255,0.55))]";

    const content = (
        <div
            className={`group energy-card relative flex ${tileHeight} items-center justify-center rounded-lg border border-[var(--ghost-border)] bg-white/[0.045] px-8 backdrop-blur-2xl transition-all duration-300 ${glow}`}
        >
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/[0.08] via-transparent to-transparent" />
            <div
                className={`absolute inset-0 rounded-lg ${
                    isPremium
                        ? "bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.16),_transparent_60%)]"
                        : "bg-[radial-gradient(circle_at_top,_rgba(0,242,255,0.12),_transparent_60%)]"
                }`}
            />
            {sponsor.logo_url ? (
                <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className={`relative z-10 max-h-12 w-auto max-w-[10rem] object-contain opacity-80 transition-all duration-300 [filter:grayscale(1)_brightness(1.7)] ${imageHoverFilter} group-hover:opacity-100 ${
                        sponsor.tier === "Platinum" ? "max-h-14 max-w-[11rem]" : ""
                    }`}
                />
            ) : (
                <span className="relative z-10 text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">
                    {sponsor.name}
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
                className="shrink-0"
                aria-label={`Visit ${sponsor.name}`}
            >
                {content}
            </a>
        );
    }

    return <div className="shrink-0">{content}</div>;
}

function SponsorMarquee({ sponsors }: { sponsors: Sponsor[] }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const [paused, setPaused] = useState(false);
    const [distance, setDistance] = useState(0);

    const sortedSponsors = useMemo(
        () =>
            [...sponsors].sort(
                (a, b) =>
                    (tierPriority[a.tier] ?? 99) - (tierPriority[b.tier] ?? 99) ||
                    a.name.localeCompare(b.name)
            ),
        [sponsors]
    );

    const marqueeSponsors = useMemo(
        () => [...sortedSponsors, ...sortedSponsors],
        [sortedSponsors]
    );

    useEffect(() => {
        const updateDistance = () => {
            if (!trackRef.current) return;
            setDistance(trackRef.current.scrollWidth / 2);
        };

        updateDistance();
        window.addEventListener("resize", updateDistance);
        return () => window.removeEventListener("resize", updateDistance);
    }, [marqueeSponsors.length]);

    useAnimationFrame((_, delta) => {
        if (paused || distance === 0) return;
        const next = x.get() - delta * 0.055;
        x.set(next <= -distance ? next + distance : next);
    });

    if (sortedSponsors.length === 0) {
        return (
            <div className="glass-strong rounded-lg border-[var(--ghost-border)] px-6 py-10 text-center text-sm text-slate-300">
                Sponsor logos will appear here once faculty or the club president adds them in Supabase.
            </div>
        );
    }

    return (
        <div
            className="glass-strong relative overflow-hidden rounded-lg border-[var(--ghost-border)] py-6 shadow-[0_20px_54px_rgba(0,0,0,0.35)]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(0,229,255,0.08),rgba(76,201,240,0.05),rgba(31,232,216,0.06))] animate-[aurora-shift_10s_linear_infinite]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#050B14] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#050B14] to-transparent" />
            <motion.div ref={trackRef} className="flex w-max items-center gap-5 px-5" style={{ x }}>
                {marqueeSponsors.map((sponsor, index) => (
                    <SponsorTile key={`${sponsor.id}-${index}`} sponsor={sponsor} />
                ))}
            </motion.div>
        </div>
    );
}

export default function SponsorshipShowcase({ sponsors }: SponsorshipShowcaseProps) {
    return (
        <section className="relative -mt-8 overflow-hidden pb-28 pt-20 sm:pt-24">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,242,255,0.09),_transparent_40%),radial-gradient(circle_at_80%_22%,_rgba(212,175,55,0.07),_transparent_30%)]" />
            <div className="absolute left-1/2 top-28 h-72 w-72 -translate-x-1/2 rounded-full bg-[#00F2FF]/8 blur-[110px]" />
            <div className="absolute bottom-0 right-16 h-56 w-56 rounded-full bg-[#D4AF37]/7 blur-[120px]" />

            <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-12 px-6">
                <div className="max-w-3xl">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100 shadow-[0_0_24px_rgba(0,242,255,0.1)]"
                    >
                        Sponsors & Impact
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                        className="mt-5 text-4xl font-black tracking-[-0.035em] text-white sm:text-5xl"
                    >
                        Backed by the institutions that power our
                        <span className="bg-gradient-to-r from-[#00F2FF] via-white to-[#D4AF37] bg-clip-text text-transparent">
                            {" "}cyber-forge
                        </span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                        className="mt-4 max-w-2xl text-base leading-8 text-slate-300/92"
                    >
                        A live wall of sponsors that signals trust, support, and real-world backing behind VajraX.
                        Premium partners are elevated with subtle gold accents to preserve hierarchy without visual noise.
                    </motion.p>
                </div>

                <SponsorMarquee sponsors={sponsors} />
            </div>
        </section>
    );
}
