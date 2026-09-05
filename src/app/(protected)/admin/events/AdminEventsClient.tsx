"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Calendar, Clock, Users, ExternalLink, Eye, ToggleLeft, ToggleRight,
    Plus, Search, FileText,
} from "lucide-react";
import { Tables } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import EventModal from "@/app/(public)/events/EventModal";

type Event = Tables<"events">;

function fmtDate(iso: string | null | undefined) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

const MODE_BADGES: Record<string, { label: string; color: string; bg: string; border: string }> = {
    none:       { label: "Open / Walk-in",    color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.35)"  },
    individual: { label: "Individual RSVP",   color: "#00e5ff", bg: "rgba(0,229,255,0.10)",  border: "rgba(0,229,255,0.35)"  },
    team:       { label: "Team RSVP",         color: "#5eead4", bg: "rgba(94,234,212,0.10)", border: "rgba(94,234,212,0.35)" },
    both:       { label: "Indiv. + Team",     color: "#a78bfa", bg: "rgba(167,139,250,0.10)",border: "rgba(167,139,250,0.35)"},
    external:   { label: "External Link",     color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.35)" },
};

export default function AdminEventsClient({
    events,
    registrationCounts,
}: {
    events: Event[];
    registrationCounts: Record<string, number>;
}) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const filtered = events.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase())
    );
    const now = new Date();
    const upcoming = filtered.filter((e) => new Date(e.starts_at) >= now);
    const past = filtered.filter((e) => new Date(e.starts_at) < now);

    const toggleRegistration = async (event: Event) => {
        setTogglingId(event.id);
        const supabase = createClient();
        await supabase.from("events").update({ registration_open: !event.registration_open }).eq("id", event.id);
        setTogglingId(null);
        router.refresh();
    };

    return (
        <div className="relative min-h-screen bg-[#07090f] pt-[calc(var(--nav-height)+2rem)] pb-24">
            {/* Animated BG */}
            <div className="fixed inset-0 pointer-events-none animate-grid-pan" style={{ backgroundImage: "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="fixed inset-0 pointer-events-none scanline animate-scanline-pan opacity-40" />

            <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                    <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#00e5ff] mb-1">// ADMIN PANEL</div>
                        <h1 className="font-sans font-extrabold text-[#f0f4ff] text-[32px] tracking-tight">Events</h1>
                    </div>
                    <button
                        onClick={() => { setEditingEvent(null); setIsModalOpen(true); }}
                        className="inline-flex items-center gap-2 h-9 px-5 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00e5ff]/90 transition-colors"
                    >
                        <Plus size={13} /> Add Event
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-6 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5568]" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search events..."
                        className="w-full rounded-sm border border-[rgba(0,229,255,0.18)] bg-[#0d1117] pl-9 pr-4 py-2.5 text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none focus:border-[#00e5ff] transition-colors"
                    />
                </div>

                {/* Upcoming */}
                <section className="mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 rounded-full bg-[#22c55e]" style={{ boxShadow: "0 0 6px #22c55e" }} />
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#00e5ff]">Upcoming</span>
                    </div>
                    {upcoming.length === 0 ? (
                        <div className="text-[#4a5568] text-[13px] font-mono">No upcoming events</div>
                    ) : (
                        <div className="space-y-3">
                            {upcoming.map((ev) => (
                                <EventRow key={ev.id} event={ev} count={registrationCounts[ev.id] ?? 0} onEdit={(e) => { setEditingEvent(e); setIsModalOpen(true); }} onToggle={toggleRegistration} toggling={togglingId === ev.id} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Past */}
                {past.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 rounded-sm border border-[rgba(0,229,255,0.3)]" />
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#8b9ab0]">Past Events</span>
                        </div>
                        <div className="space-y-3">
                            {past.map((ev) => (
                                <EventRow key={ev.id} event={ev} count={registrationCounts[ev.id] ?? 0} onEdit={(e) => { setEditingEvent(e); setIsModalOpen(true); }} onToggle={toggleRegistration} toggling={togglingId === ev.id} isPast />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <EventModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
                onSuccess={() => router.refresh()}
                event={editingEvent}
            />
        </div>
    );
}

function EventRow({
    event, count, onEdit, onToggle, toggling, isPast = false,
}: {
    event: Event;
    count: number;
    onEdit: (e: Event) => void;
    onToggle: (e: Event) => void;
    toggling: boolean;
    isPast?: boolean;
}) {
    const mode = (event.registration_mode ?? "none") as string;
    const badge = MODE_BADGES[mode] ?? MODE_BADGES.none;
    const hasRsvp = mode !== "none" && mode !== "external";

    return (
        <div
            className="flex items-center gap-4 rounded-sm border px-4 py-3.5 transition-colors"
            style={{
                borderColor: "rgba(0,229,255,0.12)",
                background: "rgba(13,17,23,0.6)",
                opacity: isPast ? 0.8 : 1,
            }}
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-sans font-semibold text-[#f0f4ff] text-[14px] tracking-tight truncate">{event.title}</span>
                    <span
                        className="inline-flex items-center h-[18px] px-2 rounded-sm font-mono text-[8.5px] uppercase tracking-[0.14em]"
                        style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}
                    >
                        {badge.label}
                    </span>
                    {event.registration_open && hasRsvp && (
                        <span className="inline-flex items-center h-[18px] px-2 rounded-sm font-mono text-[8.5px] uppercase tracking-[0.14em]" style={{ color: "#22c55e", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.3)" }}>
                            Form Open
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4 font-mono text-[11px] text-[#4a5568]">
                    <span className="flex items-center gap-1"><Calendar size={11} />{fmtDate(event.starts_at)}</span>
                    {hasRsvp && (
                        <span className="flex items-center gap-1">
                            <Users size={11} />
                            {count} registered
                            {event.max_registrations ? ` / ${event.max_registrations}` : ""}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                {hasRsvp && (
                    <button
                        onClick={() => onToggle(event)}
                        disabled={toggling}
                        title={event.registration_open ? "Close registration" : "Open registration"}
                        className="transition-opacity disabled:opacity-50"
                    >
                        {event.registration_open
                            ? <ToggleRight size={24} className="text-[#22c55e]" />
                            : <ToggleLeft size={24} className="text-[#4a5568]" />
                        }
                    </button>
                )}
                {hasRsvp && count > 0 && (
                    <Link
                        href={`/admin/events/${event.id}/registrations`}
                        className="grid place-items-center w-8 h-8 rounded-sm border text-[#8b9ab0] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.45)] transition-colors"
                        style={{ borderColor: "rgba(0,229,255,0.18)" }}
                        title="View registrations"
                    >
                        <Users size={14} />
                    </Link>
                )}
                {isPast && event.report_summary && (
                    <Link
                        href={`/events/${event.id}/report`}
                        className="grid place-items-center w-8 h-8 rounded-sm border text-[#8b9ab0] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.45)] transition-colors"
                        style={{ borderColor: "rgba(0,229,255,0.18)" }}
                        title="View report"
                    >
                        <FileText size={14} />
                    </Link>
                )}
                <Link
                    href={`/events/${event.id}`}
                    target="_blank"
                    className="grid place-items-center w-8 h-8 rounded-sm border text-[#8b9ab0] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.45)] transition-colors"
                    style={{ borderColor: "rgba(0,229,255,0.18)" }}
                    title="View public page"
                >
                    <ExternalLink size={14} />
                </Link>
                <button
                    onClick={() => onEdit(event)}
                    className="grid place-items-center w-8 h-8 rounded-sm border text-[#8b9ab0] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.45)] transition-colors"
                    style={{ borderColor: "rgba(0,229,255,0.18)" }}
                    title="Edit event"
                >
                    <Eye size={14} />
                </button>
            </div>
        </div>
    );
}
