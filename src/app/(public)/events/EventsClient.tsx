"use client";

import { motion } from "framer-motion";
import { Tables } from "@/types/database";
import {
    Calendar,
    MapPin,
    Clock,
    ExternalLink,
    Trophy,
    Wrench,
    Users,
    Sparkles,
    Zap,
} from "lucide-react";

type Event = Tables<"events">;

const eventTypeConfig: Record<
    string,
    { icon: typeof Trophy; color: string; bg: string; border: string }
> = {
    hackathon: {
        icon: Trophy,
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        border: "border-amber-400/20",
    },
    workshop: {
        icon: Wrench,
        color: "text-cyan-400",
        bg: "bg-cyan-400/10",
        border: "border-cyan-400/20",
    },
    meetup: {
        icon: Users,
        color: "text-emerald-400",
        bg: "bg-emerald-400/10",
        border: "border-emerald-400/20",
    },
    competition: {
        icon: Sparkles,
        color: "text-purple-400",
        bg: "bg-purple-400/10",
        border: "border-purple-400/20",
    },
    other: {
        icon: Zap,
        color: "text-indigo-400",
        bg: "bg-indigo-400/10",
        border: "border-indigo-400/20",
    },
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    }),
};

export default function EventsClient({ events }: { events: Event[] }) {
    const now = new Date();
    const upcoming = events.filter((e) => new Date(e.starts_at) >= now);
    const past = events.filter((e) => new Date(e.starts_at) < now);

    return (
        <div className="min-h-screen pt-[calc(var(--nav-height)+2rem)]">
            {/* Header */}
            <div className="max-w-7xl mx-auto px-6 mb-12">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-accent" />
                    </div>
                    <h1 className="section-title text-3xl">Events</h1>
                </div>
                <p className="text-text-secondary max-w-lg">
                    Hackathons, workshops, and meetups — stay in the loop with VajraX.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-6 pb-24">
                {events.length === 0 ? (
                    <div className="glass p-16 text-center">
                        <Calendar className="w-12 h-12 text-text-muted mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                        <p className="text-text-muted text-sm">
                            Upcoming hackathons and workshops will be listed here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Upcoming Events */}
                        {upcoming.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    Upcoming
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {upcoming.map((event, i) => {
                                        const config =
                                            eventTypeConfig[event.event_type] ?? eventTypeConfig.other;
                                        const Icon = config.icon;
                                        return (
                                            <motion.div
                                                key={event.id}
                                                custom={i}
                                                initial="hidden"
                                                animate="visible"
                                                variants={fadeUp}
                                                className="glass overflow-hidden group hover:border-primary/30 transition-all duration-300"
                                            >
                                                {event.cover_image_url && (
                                                    <div className="aspect-[2.5/1] overflow-hidden">
                                                        <img
                                                            src={event.cover_image_url}
                                                            alt={event.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    </div>
                                                )}
                                                <div className="p-6">
                                                    <div className="flex items-start gap-3 mb-4">
                                                        <div
                                                            className={`w-10 h-10 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}
                                                        >
                                                            <Icon className={`w-5 h-5 ${config.color}`} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span
                                                                className={`badge text-[10px] ${config.bg} ${config.color} border ${config.border} mb-2`}
                                                            >
                                                                {event.event_type}
                                                            </span>
                                                            <h3 className="text-lg font-semibold leading-tight">
                                                                {event.title}
                                                            </h3>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-text-secondary line-clamp-2 mb-4">
                                                        {event.description}
                                                    </p>
                                                    <div className="flex flex-wrap gap-4 text-xs text-text-muted">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {formatDate(event.starts_at)}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {formatTime(event.starts_at)}
                                                        </div>
                                                        {event.location && (
                                                            <div className="flex items-center gap-1.5">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                {event.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {event.registration_url && (
                                                        <a
                                                            href={event.registration_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn-primary text-xs !py-2 !px-4 mt-4 inline-flex"
                                                        >
                                                            Register
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Past Events */}
                        {past.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-text-muted">
                                    <div className="w-2 h-2 rounded-full bg-text-muted" />
                                    Past Events
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {past.map((event, i) => {
                                        const config =
                                            eventTypeConfig[event.event_type] ?? eventTypeConfig.other;
                                        const Icon = config.icon;
                                        return (
                                            <motion.div
                                                key={event.id}
                                                custom={i}
                                                initial="hidden"
                                                whileInView="visible"
                                                viewport={{ once: true }}
                                                variants={fadeUp}
                                                className="glass p-5 opacity-70 hover:opacity-100 transition-opacity"
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Icon className={`w-4 h-4 ${config.color}`} />
                                                    <h3 className="text-sm font-semibold line-clamp-1">
                                                        {event.title}
                                                    </h3>
                                                </div>
                                                <p className="text-xs text-text-muted">
                                                    {formatDate(event.starts_at)}
                                                </p>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
