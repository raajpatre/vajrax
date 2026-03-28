"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
    Zap,
    ArrowRight,
} from "lucide-react";
import type { Sponsor } from "@/actions/sponsors";
import SponsorshipShowcase from "@/components/home/SponsorshipShowcase";

type HomePageClientProps = {
    sponsors: Sponsor[];
};

export default function HomePageClient({ sponsors }: HomePageClientProps) {
    return (
        <>
            <section className="relative min-h-[94vh] overflow-hidden pb-20 pt-[calc(var(--nav-height)+4.2rem)]">
                <div className="absolute inset-0 bg-grid opacity-75" />
                <div className="absolute inset-0 bg-radial opacity-65" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_10%,rgba(125,114,255,0.12),transparent_34%),radial-gradient(circle_at_80%_16%,rgba(0,242,255,0.11),transparent_34%),radial-gradient(circle_at_58%_62%,rgba(212,175,55,0.08),transparent_32%)]" />
                <div className="absolute left-1/2 top-20 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
                <div className="pointer-events-none absolute left-[-10%] top-[45%] h-[96px] w-[124%] -rotate-6 bg-[linear-gradient(90deg,rgba(123,97,255,0),rgba(123,97,255,0.12),rgba(76,201,240,0.2),rgba(212,175,55,0.16),rgba(123,97,255,0))] blur-3xl" />

                <div className="relative z-10 mx-auto flex min-h-[calc(88vh-var(--nav-height))] max-w-6xl items-center px-6">
                    <div className="mx-auto w-full max-w-4xl p-8 text-center sm:p-12">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-300/22 bg-cyan-300/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-cyan-100 shadow-[0_0_24px_rgba(0,242,255,0.12)]"
                        >
                            <Zap className="w-3.5 h-3.5" />
                            Robotics Club @ Newton School of Technology - Bengaluru
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1 }}
                            className="mb-6 text-5xl font-black leading-[0.9] tracking-[-0.045em] sm:text-6xl md:text-7xl lg:text-8xl"
                        >
                            <span className="text-gradient">Vajra</span>
                            <span className="text-foreground">X</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-2xl"
                        >
                            The ultimate power in robotics innovation.{" "}
                            <span className="text-foreground font-semibold">Design. Build. Dominate.</span>
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.3 }}
                            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
                        >
                            <Link href="/signup" className="btn-primary text-base !px-8 !py-3.5 group animate-[glow-breathe_6s_ease-in-out_infinite]">
                                Join VajraX
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <Link href="/projects" className="btn-secondary text-base !px-8 !py-3.5">
                                Explore Projects
                            </Link>
                        </motion.div>
                    </div>

                    <div className="absolute top-20 right-10 w-3 h-3 rounded-full bg-primary/40 animate-float" />
                    <div
                        className="absolute top-40 left-16 w-2 h-2 rounded-full bg-secondary/40 animate-float"
                        style={{ animationDelay: "2s" }}
                    />
                    <div
                        className="absolute bottom-40 right-20 w-4 h-4 rounded-full bg-accent/30 animate-float"
                        style={{ animationDelay: "4s" }}
                    />
                </div>
            </section>

            <SponsorshipShowcase sponsors={sponsors} />
        </>
    );
}
