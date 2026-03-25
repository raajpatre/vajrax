"use client";

import { useState } from "react";
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
    Plus,
    Trash2,
    Loader2
} from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import EventModal from "./EventModal";

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
    const { isFaculty, isModerator, isAuthenticated } = useUser();
    const router = useRouter();
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const now = new Date();
    const upcoming = events.filter((e) => new Date(e.starts_at) >= now);
    const past = events.filter((e) => new Date(e.starts_at) < now);

    const handleDelete = async (id: string, imageUrl: string | null) => {
        if (!window.confirm("Are you sure you want to delete this event?")) return;
        setDeletingId(id);
        try {
            const supabase = createClient();
            
            if (imageUrl) {
                const urlParts = imageUrl.split('/event-images/');
                const filename = urlParts.length > 1 ? urlParts[1] : null;
                if (filename) {
                    // Fire and forget storage deletion so it doesn't hang the UI if network is slow
                    supabase.storage.from("event-images").remove([filename]).catch(e => console.error("Storage cleanup failed:", e));
                }
            }
            
            const { error } = await supabase.from("events").delete().eq("id", id);
            if (error) throw error;
            router.refresh();
        } catch (error) {
            console.error("Error deleting event:", error);
            alert("Failed to delete the event. Ensure the SQL delete policies are applied.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden pb-24 pt-[calc(var(--nav-height)+2.5rem)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(0,242,255,0.12),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(125,114,255,0.12),transparent_32%)]" />

            <div className="relative z-10 mx-auto max-w-7xl px-6">
                <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="section-title mb-3 text-3xl">Events</h1>
                        <p className="max-w-lg text-text-secondary">
                            Hackathons, workshops, and meetups that keep VajraX moving forward.
                        </p>
                    </div>
                    {(isFaculty || isModerator) && (
                        <button
                            onClick={() => setIsEventModalOpen(true)}
                            className="btn-primary w-fit"
                        >
                            <Plus className="h-4 w-4" />
                            Add Event
                        </button>
                    )}
                </div>

                {events.length === 0 ? (
                    <div className="glass p-16 text-center">
                        <Calendar className="mx-auto mb-4 h-12 w-12 text-text-muted" />
                        <h3 className="mb-2 text-lg font-semibold">No events yet</h3>
                        <p className="text-text-muted text-sm">
                            Upcoming hackathons and workshops will be listed here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Upcoming Events */}
                        {upcoming.length > 0 && (
                            <div>
                                <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
                                    <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                                    Upcoming
                                </h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                                                className="glass energy-card group relative overflow-hidden rounded-[22px] border-white/14 transition-all duration-500 hover:border-cyan-300/30"
                                            >
                                                {(isFaculty || isModerator) && (
                                                    <button
                                                        onClick={() => handleDelete(event.id, event.cover_image_url)}
                                                        disabled={deletingId === event.id}
                                                        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                                                        title="Delete Event"
                                                    >
                                                        {deletingId === event.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                )}
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
                                                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border ${config.bg} ${config.border}`}
                                                        >
                                                            <Icon className={`h-5 w-5 ${config.color}`} />
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
                                                        event.is_exclusive && !isAuthenticated ? (
                                                            <div className="mt-4 pt-4 border-t border-border/50">
                                                                <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                                    Club Exclusive Event. Login to register.
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <a
                                                                href={event.registration_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn-primary text-xs !py-2 !px-4 mt-4 inline-flex"
                                                            >
                                                                Register
                                                                <ExternalLink className="w-3 h-3 ml-1" />
                                                            </a>
                                                        )
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
                                    <div className="h-2 w-2 rounded-full bg-text-muted" />
                                    Past Events
                                </h2>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                                                className="glass energy-card rounded-2xl p-5 opacity-75 transition-all duration-500 hover:border-cyan-300/20 hover:opacity-100"
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

            <EventModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                onSuccess={() => router.refresh()}
            />
        </div>
    );
}
