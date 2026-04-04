"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FlaskConical, Loader2, CalendarDays, Clock, XCircle } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import { LAB_RESOURCES } from "@/lib/lab-resources";
import type { Tables } from "@/types/database";
import {
    cancelResourceBooking,
    createResourceBooking,
    listMyUpcomingResourceBookings,
    listResourceBookings,
} from "@/actions/resource-bookings";

type BookingRow = Tables<"resource_bookings">;

const LAB_OPEN_HOUR = 8;
const LAB_CLOSE_HOUR = 20;

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function formatDateInputValue(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localDayWindowIso(dateStr: string) {
    const start = new Date(`${dateStr}T${pad2(LAB_OPEN_HOUR)}:00:00`);
    const end = new Date(`${dateStr}T${pad2(LAB_CLOSE_HOUR)}:00:00`);
    return { startIso: start.toISOString(), endIso: end.toISOString(), start, end };
}

function toDatetimeLocalValue(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseDatetimeLocalToDate(value: string) {
    return new Date(value);
}

function defaultBookingRange() {
    const now = new Date();
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    if (start <= now) {
        start.setHours(start.getHours() + 1);
    }
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    return { start, end };
}

function formatBookingTooltip(booking: BookingRow, isMine: boolean) {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const date = start.toLocaleDateString(undefined, { dateStyle: "medium" });
    const startTime = start.toLocaleTimeString(undefined, { timeStyle: "short" });
    const endTime = end.toLocaleTimeString(undefined, { timeStyle: "short" });

    return `${isMine ? "Your booking" : "Booked"}\n${date}\n${startTime} - ${endTime}`;
}

export default function LabBookingClient() {
    const { user, loading: userLoading } = useUser();
    const [resourceName, setResourceName] = useState<string>(LAB_RESOURCES[0]);
    const [selectedDate, setSelectedDate] = useState(() => formatDateInputValue(new Date()));
    const [dayBookings, setDayBookings] = useState<BookingRow[]>([]);
    const [myBookings, setMyBookings] = useState<BookingRow[]>([]);
    const [loadingDay, setLoadingDay] = useState(true);
    const [loadingMine, setLoadingMine] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startLocal, setStartLocal] = useState(() => toDatetimeLocalValue(defaultBookingRange().start));
    const [endLocal, setEndLocal] = useState(() => toDatetimeLocalValue(defaultBookingRange().end));

    const { start: dayStart, end: dayEnd } = useMemo(
        () => localDayWindowIso(selectedDate),
        [selectedDate]
    );

    const totalMs = dayEnd.getTime() - dayStart.getTime();

    const loadDay = useCallback(async () => {
        setLoadingDay(true);
        setError(null);
        const { startIso, endIso } = localDayWindowIso(selectedDate);
        const res = await listResourceBookings({
            resourceName,
            windowStart: startIso,
            windowEnd: endIso,
        });
        if (res.ok) {
            setDayBookings(res.data);
        } else {
            setError(res.error);
        }
        setLoadingDay(false);
    }, [resourceName, selectedDate]);

    const loadMine = useCallback(async () => {
        setLoadingMine(true);
        const res = await listMyUpcomingResourceBookings();
        if (res.ok) {
            setMyBookings(res.data);
        } else if (!res.error.includes("Not authenticated")) {
            setError(res.error);
        }
        setLoadingMine(false);
    }, []);

    useEffect(() => {
        if (!userLoading && user) {
            void loadDay();
        }
    }, [user, userLoading, loadDay]);

    useEffect(() => {
        if (!userLoading && user) {
            void loadMine();
        }
    }, [user, userLoading, loadMine]);

    const refreshAll = async () => {
        await Promise.all([loadDay(), loadMine()]);
    };

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        const start = parseDatetimeLocalToDate(startLocal);
        const end = parseDatetimeLocalToDate(endLocal);
        const result = await createResourceBooking({
            resourceName,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
        });
        setSubmitting(false);
        if (!result.ok) {
            setError(result.error ?? "Unable to create booking.");
            return;
        }
        await refreshAll();
    };

    const handleCancel = async (id: string) => {
        setError(null);
        const result = await cancelResourceBooking(id);
        if (!result.ok) {
            setError(result.error ?? "Unable to cancel booking.");
            return;
        }
        await refreshAll();
    };

    const segmentStyle = (b: BookingRow) => {
        const bs = new Date(b.start_time).getTime();
        const be = new Date(b.end_time).getTime();
        const left = Math.max(0, ((bs - dayStart.getTime()) / totalMs) * 100);
        const right = Math.min(100, ((be - dayStart.getTime()) / totalMs) * 100);
        const width = Math.max(right - left, 0.8);
        const isMine = user && b.user_id === user.id;
        return {
            left: `${left}%`,
            width: `${width}%`,
            className: isMine
                ? "bg-cyan-500/35 border border-cyan-400/40"
                : "bg-surface border border-border/80",
        };
    };

    if (userLoading) {
        return <VajraLoader fullPage />;
    }

    if (!user) {
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Lab</h1>
                    <p className="text-sm text-text-muted max-w-xl">
                        Book shared workspace and machinery. Overlapping slots are blocked automatically for each
                        resource.
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                </div>
            )}

            <section className="glass p-4 md:p-5 md:p-4 md:p-6 space-y-5">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                            Resource
                        </label>
                        <select
                            value={resourceName}
                            onChange={(e) => setResourceName(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
                        >
                            {LAB_RESOURCES.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                            Day
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const d = new Date(selectedDate + "T12:00:00");
                                    d.setDate(d.getDate() - 1);
                                    setSelectedDate(formatDateInputValue(d));
                                }}
                                className="btn-ghost !px-3 !py-2 text-xs"
                                aria-label="Previous day"
                            >
                                ←
                            </button>
                            <div className="relative flex-1 min-w-[10rem]">
                                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full bg-surface border border-border rounded-lg pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-cyan-400/50"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const d = new Date(selectedDate + "T12:00:00");
                                    d.setDate(d.getDate() + 1);
                                    setSelectedDate(formatDateInputValue(d));
                                }}
                                className="btn-ghost !px-3 !py-2 text-xs"
                                aria-label="Next day"
                            >
                                →
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                        Timeline ({LAB_OPEN_HOUR}:00–{LAB_CLOSE_HOUR}:00)
                    </p>
                    <div className="relative h-14 rounded-lg bg-[#050B14]/80 border border-border/70 overflow-hidden">
                        <div className="absolute inset-0 flex">
                            {Array.from({ length: LAB_CLOSE_HOUR - LAB_OPEN_HOUR }).map((_, i) => (
                                <div
                                    key={i}
                                    className="flex-1 border-r border-border/30 last:border-r-0"
                                    title={`${LAB_OPEN_HOUR + i}:00`}
                                />
                            ))}
                        </div>
                        {loadingDay ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 animate-spin text-cyan-300/80" />
                            </div>
                        ) : (
                            dayBookings.map((b) => {
                                const s = segmentStyle(b);
                                const isMine = user && b.user_id === user.id;
                                return (
                                    <div
                                        key={b.id}
                                        className={`absolute top-1 bottom-1 rounded-md text-[10px] flex items-center px-1 truncate ${s.className}`}
                                        style={{ left: s.left, width: s.width }}
                                        title={formatBookingTooltip(b, isMine)}
                                        aria-label={formatBookingTooltip(b, isMine)}
                                    >
                                        <span className="text-[9px] font-medium text-foreground/90 px-1 truncate">
                                            {isMine ? "You" : "Booked"}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <p className="text-[10px] text-text-muted mt-2">
                        Cyan blocks are yours; muted blocks are other members. Hover timeline cells for hour markers.
                    </p>
                </div>

                <div className="border-t border-border/60 pt-5 space-y-3">
                    <p className="text-sm font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-300" />
                        New booking
                    </p>
                    <form onSubmit={handleBook} className="grid sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-text-muted mb-1">Start</label>
                            <input
                                type="datetime-local"
                                value={startLocal}
                                onChange={(e) => setStartLocal(e.target.value)}
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-400/50"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-text-muted mb-1">End</label>
                            <input
                                type="datetime-local"
                                value={endLocal}
                                onChange={(e) => setEndLocal(e.target.value)}
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-400/50"
                                required
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn-primary w-full sm:w-auto !px-6 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reserve slot"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            <section className="glass p-4 md:p-5 md:p-4 md:p-6">
                <h2 className="text-sm font-semibold mb-4 text-text-secondary uppercase tracking-wide">
                    Your upcoming bookings
                </h2>
                {loadingMine ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-light" />
                    </div>
                ) : myBookings.length === 0 ? (
                    <p className="text-sm text-text-muted">No upcoming reservations.</p>
                ) : (
                    <ul className="space-y-2">
                        {myBookings.map((b) => (
                            <li
                                key={b.id}
                                className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border/60 bg-surface/40 px-4 py-3"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">{b.resource_name}</p>
                                    <p className="text-xs text-text-muted mt-0.5">
                                        {new Date(b.start_time).toLocaleString(undefined, {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                        })}{" "}
                                        –{" "}
                                        {new Date(b.end_time).toLocaleString(undefined, {
                                            timeStyle: "short",
                                        })}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void handleCancel(b.id)}
                                    className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-red-300 hover:text-red-200 border border-red-500/30 rounded-lg px-3 py-2 hover:bg-red-500/10 transition-colors shrink-0"
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Cancel
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
