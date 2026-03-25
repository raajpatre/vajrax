"use client";

import { useMemo, useState } from "react";

export type LabHistoryEntry = {
    id: string;
    resource_name: string;
    start_time: string;
    end_time: string;
    created_at: string;
    status: string;
    booker: {
        display_name: string;
        role: string;
    } | null;
};

type LabHistoryTableProps = {
    entries: LabHistoryEntry[];
    resources: readonly string[];
};

function formatDuration(startIso: string, endIso: string) {
    const minutes = Math.max(
        0,
        Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
    );

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) return `${remainingMinutes} min`;
    if (remainingMinutes === 0) return `${hours} hr${hours === 1 ? "" : "s"}`;
    return `${hours} hr ${remainingMinutes} min`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        dateStyle: "medium",
    });
}

function formatTimeRange(startIso: string, endIso: string) {
    return `${new Date(startIso).toLocaleTimeString(undefined, {
        timeStyle: "short",
    })} - ${new Date(endIso).toLocaleTimeString(undefined, {
        timeStyle: "short",
    })}`;
}

function formatCreatedAt(createdAt: string) {
    return new Date(createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

const statusClasses: Record<string, string> = {
    confirmed: "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
    cancelled: "text-rose-300 bg-rose-500/10 border-rose-400/20",
};

export default function LabHistoryTable({ entries, resources }: LabHistoryTableProps) {
    const [selectedResource, setSelectedResource] = useState<string>(resources[0] ?? "");

    const visibleEntries = useMemo(
        () => entries.filter((entry) => entry.resource_name === selectedResource),
        [entries, selectedResource]
    );

    return (
        <section className="glass p-5 md:p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                        Resource History
                    </label>
                    <select
                        value={selectedResource}
                        onChange={(e) => setSelectedResource(e.target.value)}
                        className="w-full md:max-w-sm bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
                    >
                        {resources.map((resource) => (
                            <option key={resource} value={resource}>
                                {resource}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="text-sm text-text-muted">
                    {visibleEntries.length} booking{visibleEntries.length === 1 ? "" : "s"} shown
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-[#060C16]/70">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] text-sm">
                        <thead className="bg-white/[0.03]">
                            <tr className="text-left text-xs uppercase tracking-[0.18em] text-text-secondary">
                                <th className="px-4 py-3 font-semibold">Booked By</th>
                                <th className="px-4 py-3 font-semibold">Date</th>
                                <th className="px-4 py-3 font-semibold">Time Slot</th>
                                <th className="px-4 py-3 font-semibold">Duration</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold">Reserved On</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                                        No booking history found for {selectedResource}.
                                    </td>
                                </tr>
                            ) : (
                                visibleEntries.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className="border-t border-border/60 text-text-secondary hover:bg-white/[0.02]"
                                    >
                                        <td className="px-4 py-4 font-medium text-foreground">
                                            {entry.booker?.display_name ?? "Unknown member"}
                                        </td>
                                        <td className="px-4 py-4">{formatDate(entry.start_time)}</td>
                                        <td className="px-4 py-4">{formatTimeRange(entry.start_time, entry.end_time)}</td>
                                        <td className="px-4 py-4">{formatDuration(entry.start_time, entry.end_time)}</td>
                                        <td className="px-4 py-4">
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                                    statusClasses[entry.status] ?? "text-text-secondary bg-surface border-border"
                                                }`}
                                            >
                                                {entry.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">{formatCreatedAt(entry.created_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
