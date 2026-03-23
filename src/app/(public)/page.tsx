"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
    Zap,
    Bot,
    Cpu,
    Rocket,
    Users,
    Trophy,
    Calendar,
    ArrowRight,
    ChevronRight,
    Sparkles,
} from "lucide-react";

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
    }),
};

const stats = [
    { icon: Users, value: "50+", label: "Active Members" },
    { icon: Bot, value: "12", label: "Robots Built" },
    { icon: Trophy, value: "8", label: "Awards Won" },
    { icon: Calendar, value: "20+", label: "Events Hosted" },
];

const features = [
    {
        icon: Cpu,
        title: "Cutting-Edge R&D",
        description:
            "From autonomous drones to robotic arms — we design, build, and iterate on the bleeding edge of robotics technology.",
    },
    {
        icon: Rocket,
        title: "Competition Ready",
        description:
            "We compete nationally and internationally, pushing our engineering skills against the best teams in the world.",
    },
    {
        icon: Users,
        title: "Collaborative Culture",
        description:
            "Learning happens in teams. We mentor, share knowledge, and grow together through hands-on projects.",
    },
    {
        icon: Sparkles,
        title: "Industry Connections",
        description:
            "Regular workshops with industry professionals, internship pipelines, and real-world project exposure.",
    },
];

export default function HomePage() {
    return (
        <>
            {/* ============================
          HERO SECTION
          ============================ */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0 bg-grid" />
                <div className="absolute inset-0 bg-radial" />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--vajra-black)] to-transparent" />

                <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24">
                    {/* Pill badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary-light text-sm font-medium mb-8"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        College Robotics Club
                    </motion.div>

                    {/* Main heading */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6"
                    >
                        <span className="text-gradient">Vajra</span>
                        <span className="text-foreground">X</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="text-xl sm:text-2xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
                    >
                        The ultimate power in robotics innovation.{" "}
                        <span className="text-foreground font-medium">Design. Build. Dominate.</span>
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link href="/signup" className="btn-primary text-base !px-8 !py-3.5 group">
                            Join VajraX
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="/projects" className="btn-secondary text-base !px-8 !py-3.5">
                            Explore Projects
                        </Link>
                    </motion.div>

                    {/* Floating orbs */}
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

            {/* ============================
          STATS SECTION
          ============================ */}
            <section className="relative py-20 -mt-10">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="glass p-8 rounded-2xl">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {stats.map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    custom={i}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-50px" }}
                                    variants={fadeUp}
                                    className="text-center"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                                        <stat.icon className="w-6 h-6 text-primary-light" />
                                    </div>
                                    <div className="text-3xl font-bold text-foreground mb-1">
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-text-muted">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ============================
          ABOUT / MISSION SECTION
          ============================ */}
            <section id="about" className="relative py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <motion.h2
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeUp}
                            custom={0}
                            className="section-title mb-4"
                        >
                            Why <span className="text-gradient">VajraX</span>?
                        </motion.h2>
                        <motion.p
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeUp}
                            custom={1}
                            className="section-subtitle mx-auto"
                        >
                            We&apos;re not just building robots — we&apos;re forging the next generation
                            of engineers, innovators, and leaders.
                        </motion.p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {features.map((feature, i) => (
                            <motion.div
                                key={feature.title}
                                custom={i}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-30px" }}
                                variants={fadeUp}
                                className="glass p-8 group hover:border-primary/30 transition-all duration-300"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all duration-300">
                                    <feature.icon className="w-6 h-6 text-primary-light" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============================
          CTA SECTION
          ============================ */}
            <section className="relative py-24">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                        custom={0}
                        className="glass p-12 md:p-16 relative overflow-hidden"
                    >
                        {/* Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                Ready to build the
                                <span className="text-gradient"> future</span>?
                            </h2>
                            <p className="text-text-secondary mb-8 max-w-lg mx-auto">
                                Join VajraX and get access to cutting-edge equipment, mentorship from
                                faculty, and a community of passionate engineers.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/signup" className="btn-primary !px-8 !py-3 group">
                                    Get Started
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link href="/events" className="btn-secondary !px-8 !py-3">
                                    View Events
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </>
    );
}
