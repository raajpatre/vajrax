"use client";

import { KeyboardEvent, useState } from "react";
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
    Loader2,
    Pencil
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
        color: "text-cyan-300",
        bg: "bg-cyan-300/10",
        border: "border-cyan-300/20",
    },
    other: {
        icon: Zap,
        color: "text-sky-400",
        bg: "bg-sky-400/10",
        border: "border-sky-400/20",
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
    const supabase = createClient();
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
    const [failedImageIds, setFailedImageIds] = useState<string[]>([]);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    const now = new Date();
    const upcoming = events.filter((e) => new Date(e.starts_at) >= now);
    const past = events.filter((e) => new Date(e.starts_at) < now);

    const handleDelete = async (id: string, imageUrl: string | null) => {
        if (!window.confirm("Are you sure you want to delete this event?")) return;
        setDeletingId(id);
        try {
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

    const isTouchCardInteraction = () =>
        typeof window !== "undefined" &&
        window.matchMedia("(hover: none), (pointer: coarse)").matches;

    const toggleCardFlip = (id: string) => {
        if (!isTouchCardInteraction()) return;
        setFlippedCardId((current) => (current === id ? null : id));
    };

    const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
        if (!isTouchCardInteraction()) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleCardFlip(id);
    };

    const getCoverImageUrl = (event: Event) => {
        if (!event.cover_image_url) return null;
        if (event.cover_image_url.startsWith("http://") || event.cover_image_url.startsWith("https://")) {
            return event.cover_image_url;
        }

        const normalizedPath = event.cover_image_url
            .replace(/^\/+/, "")
            .replace(/^event-images\//, "");

        return supabase.storage.from("event-images").getPublicUrl(normalizedPath).data.publicUrl;
    };

    const renderDeleteButton = (
        eventId: string,
        imageUrl: string | null,
        className?: string
    ) => (
        <button
            onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                handleDelete(eventId, imageUrl);
            }}
            disabled={deletingId === eventId}
            className={`event-poster-card__delete ${className ?? ""}`}
            title="Delete Event"
            aria-label="Delete event"
        >
            {deletingId === eventId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Trash2 className="h-4 w-4" />
            )}
        </button>
    );

    const renderEditButton = (event: Event, className?: string) => (
        <button
            onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                setEditingEvent(event);
                setIsEventModalOpen(true);
            }}
            className={`event-poster-card__edit ${className ?? ""}`}
            title="Edit Event"
            aria-label="Edit event"
        >
            <Pencil className="h-4 w-4" />
        </button>
    );

    return (
        <div className="relative min-h-screen overflow-hidden pb-24 pt-[calc(var(--nav-height)+2.5rem)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(0,229,255,0.10),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(0,218,243,0.08),transparent_32%)]" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
                <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="section-title mb-3 text-2xl sm:text-3xl">Events</h1>
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
                    <div className="glass p-4 md:p-5 md:p-8 md:p-16 text-center">
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
                                    <div className="h-2 w-2 animate-pulse rounded-sm bg-cyan-300" />
                                    Upcoming
                                </h2>
                                <div className="grid grid-cols-1 justify-items-center gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                                                className="group relative w-full max-w-[290px]"
                                            >
                                                <article
                                                    className={`event-poster-card ${flippedCardId === event.id ? "is-flipped" : ""}`}
                                                    onClick={(clickEvent) => {
                                                        const target = clickEvent.target as HTMLElement;
                                                        if (target.closest("a, button")) return;
                                                        toggleCardFlip(event.id);
                                                    }}
                                                    onKeyDown={(keyEvent) => handleCardKeyDown(keyEvent, event.id)}
                                                    tabIndex={0}
                                                    aria-label={`${event.title} event card`}
                                                >
                                                    <div className="event-poster-card__inner">
                                                        <div className="event-poster-card__face event-poster-card__face--front">
                                                            {event.cover_image_url && !failedImageIds.includes(event.id) ? (
                                                                <img
                                                                    src={getCoverImageUrl(event) ?? undefined}
                                                                    alt={event.title}
                                                                    className="event-poster-card__image"
                                                                    onError={() =>
                                                                        setFailedImageIds((current) =>
                                                                            current.includes(event.id) ? current : [...current, event.id]
                                                                        )
                                                                    }
                                                                />
                                                            ) : (
                                                                <div className="event-poster-card__image event-poster-card__image--fallback">
                                                                    <span>{event.title}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="event-poster-card__face event-poster-card__face--back">
                                                            {(isFaculty || isModerator) && (
                                                                <>
                                                                    {renderEditButton(event)}
                                                                    {renderDeleteButton(
                                                                        event.id,
                                                                        event.cover_image_url,
                                                                        "event-poster-card__delete--stacked"
                                                                    )}
                                                                </>
                                                            )}
                                                            <div className="event-poster-card__glow" />
                                                            <div className="event-poster-card__content">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <span
                                                                        className={`event-poster-card__badge ${config.bg} ${config.color} border ${config.border}`}
                                                                    >
                                                                        <Icon className="h-3.5 w-3.5" />
                                                                        {event.event_type}
                                                                    </span>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <h3 className="text-lg font-semibold leading-tight text-text">
                                                                        {event.title}
                                                                    </h3>
                                                                    <p className="line-clamp-3 text-sm leading-6 text-text-secondary">
                                                                        {event.description}
                                                                    </p>
                                                                </div>

                                                                <div className="space-y-3 text-sm">
                                                                    <div className="event-poster-card__meta event-poster-card__meta--accent">
                                                                        <Calendar className="h-4 w-4" />
                                                                        <span>{formatDate(event.starts_at)}</span>
                                                                    </div>
                                                                    <div className="event-poster-card__meta event-poster-card__meta--accent">
                                                                        <Clock className="h-4 w-4" />
                                                                        <span>{formatTime(event.starts_at)}</span>
                                                                    </div>
                                                                    {event.location && (
                                                                        <div className="event-poster-card__meta text-text-secondary">
                                                                            <MapPin className="h-4 w-4 text-text-muted" />
                                                                            <span>{event.location}</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="mt-auto pt-2">
                                                                    {event.registration_url ? (
                                                                        event.is_exclusive && !isAuthenticated ? (
                                                                            <div className="border border-amber-400/20 bg-amber-400/8 px-3 py-3 text-xs font-medium text-amber-300">
                                                                                Club exclusive event. Login to register.
                                                                            </div>
                                                                        ) : (
                                                                            <a
                                                                                href={event.registration_url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="btn-primary inline-flex w-full justify-center text-xs !px-4 !py-2.5"
                                                                            >
                                                                                Register
                                                                                <ExternalLink className="ml-1 h-3 w-3" />
                                                                            </a>
                                                                        )
                                                                    ) : (
                                                                        <div className="border border-[rgba(140,188,255,0.16)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-center text-xs text-text-muted">
                                                                            Registration details coming soon
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </article>
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
                                    <div className="h-2 w-2 rounded-sm bg-text-muted" />
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
                                                className="glass energy-card rounded-lg p-4 md:p-5 opacity-75 transition-all duration-500 hover:border-cyan-300/20 hover:opacity-100"
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
                onClose={() => {
                    setIsEventModalOpen(false);
                    setEditingEvent(null);
                }}
                onSuccess={() => router.refresh()}
                event={editingEvent}
            />
        </div>
    );
}
