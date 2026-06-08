"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";
import VajraLoader from "@/components/ui/VajraLoader";
import type { LucideIcon } from "lucide-react";
import {
    Bell,
    CheckCircle2,
    XCircle,
    FolderGit2,
    Package,
    ChevronRight,
    CheckCheck,
    ArrowRight,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────── */

interface Notification {
    id: string;
    type: string;
    message: string;
    is_read: boolean;
    created_at: string;
    related_entity_id: string | null;
}

/* ─── Notification type config ────────────────────────────────────── */

interface NotifConfig {
    label: string;
    fg: string;
    bg: string;
    bd: string;
    barBg: string;
    Icon: LucideIcon;
    navHref: (relatedId: string | null) => string | null;
}

const NOTIF_CONFIG: Record<string, NotifConfig> = {
    project_request_received:   { label: "PROJECT PROPOSAL",  fg: "#00e5ff", bg: "rgba(0,229,255,0.10)",   bd: "rgba(0,229,255,0.40)",   barBg: "#00e5ff", Icon: FolderGit2,   navHref: () => "/admin/project-requests"  },
    project_request_approved:   { label: "PROPOSAL APPROVED", fg: "#22c55e", bg: "rgba(34,197,94,0.10)",   bd: "rgba(34,197,94,0.40)",   barBg: "#22c55e", Icon: CheckCircle2, navHref: () => "/my-requests"             },
    project_request_rejected:   { label: "PROPOSAL REJECTED", fg: "#ef4444", bg: "rgba(239,68,68,0.10)",   bd: "rgba(239,68,68,0.40)",   barBg: "#ef4444", Icon: XCircle,      navHref: () => "/my-requests"             },
    inventory_request_received: { label: "EQUIPMENT REQUEST", fg: "#f59e0b", bg: "rgba(245,158,11,0.10)",  bd: "rgba(245,158,11,0.40)",  barBg: "#f59e0b", Icon: Package,      navHref: () => "/admin/equipment-requests"},
    equipment_request_approved: { label: "REQUEST APPROVED",  fg: "#22c55e", bg: "rgba(34,197,94,0.10)",   bd: "rgba(34,197,94,0.40)",   barBg: "#22c55e", Icon: CheckCircle2, navHref: () => "/my-requests"             },
    equipment_request_rejected: { label: "REQUEST REJECTED",  fg: "#ef4444", bg: "rgba(239,68,68,0.10)",   bd: "rgba(239,68,68,0.40)",   barBg: "#ef4444", Icon: XCircle,      navHref: () => "/my-requests"             },
};

const DEFAULT_CONFIG: NotifConfig = {
    label: "NOTIFICATION",
    fg: "#8b9ab0", bg: "rgba(139,154,176,0.10)", bd: "rgba(139,154,176,0.35)", barBg: "#4a5568",
    Icon: Bell,
    navHref: () => null,
};

function getConfig(type: string): NotifConfig {
    return NOTIF_CONFIG[type] ?? DEFAULT_CONFIG;
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .format(new Date(dateStr))
        .toUpperCase();
}

function fullDate(dateStr: string): string {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(dateStr)).toUpperCase();
}

/* ─── Tab strip ───────────────────────────────────────────────────── */

function TabStrip({ value, onChange, unreadCount, totalCount }: {
    value: "all" | "unread";
    onChange: (v: "all" | "unread") => void;
    unreadCount: number;
    totalCount: number;
}) {
    const tabs: { key: "all" | "unread"; label: string; count: number }[] = [
        { key: "all",    label: "All",    count: totalCount  },
        { key: "unread", label: "Unread", count: unreadCount },
    ];

    return (
        <div className="flex items-center gap-0 border-b" style={{ borderColor: "rgba(0,229,255,0.12)" }}>
            {tabs.map(t => {
                const active = value === t.key;
                return (
                    <button
                        key={t.key}
                        onClick={() => onChange(t.key)}
                        className="relative flex items-center gap-2 h-10 px-4 text-[12.5px] font-medium tracking-tight whitespace-nowrap transition-colors"
                        style={{ color: active ? "#f0f4ff" : "#8b9ab0" }}
                    >
                        {t.label}
                        {t.count > 0 && (
                            <span
                                className="font-mono text-[9.5px] tabular-nums px-1.5 h-[16px] grid place-items-center rounded-sm border"
                                style={{
                                    color: active ? "#00e5ff" : "#4a5568",
                                    borderColor: active ? "rgba(0,229,255,0.45)" : "rgba(0,229,255,0.12)",
                                    background: active ? "rgba(0,229,255,0.10)" : "transparent",
                                }}
                            >
                                {String(t.count).padStart(2, "0")}
                            </span>
                        )}
                        {active && (
                            <span
                                className="absolute bottom-0 left-0 right-0 h-[2px]"
                                style={{ background: "#00e5ff", boxShadow: "0 0 8px rgba(0,229,255,0.85)" }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* ─── Notification card ───────────────────────────────────────────── */

function NotifCard({
    notif,
    onMarkRead,
    onNavigate,
}: {
    notif: Notification;
    onMarkRead: (id: string) => Promise<void>;
    onNavigate: (notif: Notification) => void;
}) {
    const [hover, setHover] = useState(false);
    const cfg = getConfig(notif.type);
    const Icon = cfg.Icon;
    const href = cfg.navHref(notif.related_entity_id);

    const handleClick = async () => {
        if (!notif.is_read) await onMarkRead(notif.id);
        onNavigate(notif);
    };

    return (
        <div
            className="relative flex rounded-sm overflow-hidden transition-all cursor-pointer group"
            style={{
                background: notif.is_read ? "rgba(7,9,15,0.4)" : "#0d1117",
                border: `1px solid ${hover ? (notif.is_read ? "rgba(0,229,255,0.18)" : "rgba(0,229,255,0.35)") : (notif.is_read ? "rgba(0,229,255,0.08)" : "rgba(0,229,255,0.18)")}`,
                boxShadow: hover && !notif.is_read ? "0 0 0 1px rgba(0,229,255,0.08), 0 8px 24px -14px rgba(0,0,0,0.7)" : "none",
                opacity: notif.is_read ? 0.6 : 1,
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={handleClick}
        >
            {/* Left bar */}
            <div
                className="w-[3px] shrink-0 self-stretch"
                style={{
                    background: notif.is_read ? "rgba(139,154,176,0.3)" : cfg.barBg,
                    boxShadow: hover && !notif.is_read ? `0 0 10px ${cfg.barBg}` : "none",
                }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0 px-4 py-3.5">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                        className="shrink-0 grid place-items-center w-9 h-9 rounded-sm border mt-0.5"
                        style={{
                            background: notif.is_read ? "rgba(7,9,15,0.8)" : cfg.bg,
                            borderColor: notif.is_read ? "rgba(139,154,176,0.15)" : cfg.bd,
                        }}
                    >
                        <Icon size={16} style={{ color: notif.is_read ? "#4a5568" : cfg.fg }} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            {/* Type badge */}
                            <span
                                className="inline-flex items-center h-[18px] px-1.5 rounded-sm border font-mono text-[9px] uppercase tracking-[0.12em]"
                                style={{
                                    color: notif.is_read ? "#4a5568" : cfg.fg,
                                    background: notif.is_read ? "rgba(139,154,176,0.05)" : cfg.bg,
                                    borderColor: notif.is_read ? "rgba(139,154,176,0.15)" : cfg.bd,
                                }}
                            >
                                {cfg.label}
                            </span>

                            {/* Unread dot */}
                            {!notif.is_read && (
                                <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ background: cfg.fg, boxShadow: `0 0 6px ${cfg.fg}` }}
                                />
                            )}
                        </div>

                        <p
                            className="font-sans text-[13.5px] leading-snug tracking-tight"
                            style={{ color: notif.is_read ? "#4a5568" : "#f0f4ff" }}
                        >
                            {notif.message}
                        </p>

                        <div className="flex items-center gap-3 mt-1.5 font-mono text-[10px] tracking-[0.08em]" style={{ color: "#4a5568" }}>
                            <span>{timeAgo(notif.created_at)}</span>
                            <span className="hidden sm:inline">·</span>
                            <span className="hidden sm:inline">{fullDate(notif.created_at)}</span>
                        </div>
                    </div>

                    {/* Navigate arrow */}
                    {href && (
                        <div className="shrink-0 grid place-items-center self-center">
                            <ChevronRight
                                size={14}
                                style={{ color: hover ? cfg.fg : "#4a5568", transition: "color 150ms" }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Empty state ─────────────────────────────────────────────────── */

function EmptyState({ filter }: { filter: "all" | "unread" }) {
    return (
        <div
            className="relative border border-dashed rounded-md overflow-hidden corner-ticks"
            style={{ borderColor: "rgba(0,229,255,0.15)", background: "rgba(13,17,23,0.40)" }}
        >
            <div className="relative text-center py-20 px-6">
                <div
                    className="mx-auto w-14 h-14 grid place-items-center border rounded-md mb-4"
                    style={{ borderColor: "rgba(0,229,255,0.18)", background: "#07090f" }}
                >
                    {filter === "unread" ? (
                        <CheckCircle2 size={22} style={{ color: "#22c55e" }} />
                    ) : (
                        <Bell size={22} style={{ color: "#4a5568" }} />
                    )}
                </div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] mb-2" style={{ color: filter === "unread" ? "#22c55e" : "#00e5ff" }}>
                    {filter === "unread" ? "// ALL CAUGHT UP" : "// NO ACTIVITY YET"}
                </div>
                <h3 className="text-[#f0f4ff] font-bold text-[18px] tracking-tight">
                    {filter === "unread" ? "You're all caught up" : "No notifications yet"}
                </h3>
                <p className="text-[#8b9ab0] text-[13px] mt-1.5 max-w-[42ch] mx-auto leading-relaxed">
                    {filter === "unread"
                        ? "All notifications have been read. Great job staying on top of things."
                        : "Activity from project proposals, equipment requests, and team updates will appear here."}
                </p>
            </div>
        </div>
    );
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function NotificationsPage() {
    const { user, loading: userLoading } = useUser();
    const supabase = createClient();
    const router = useRouter();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"all" | "unread">("all");
    const [markingAll, setMarkingAll] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from("notifications")
            .select("id, type, message, is_read, created_at, related_entity_id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (data) setNotifications(data as Notification[]);
        setLoading(false);
    }, [user, supabase]);

    useEffect(() => {
        if (user) void fetchNotifications();
    }, [user, fetchNotifications]);

    // Real-time subscription
    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel(`notif-page:${user.id}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
                () => void fetchNotifications()
            )
            .subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [user, supabase, fetchNotifications]);

    const markRead = useCallback(async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    }, [supabase]);

    const markAllRead = useCallback(async () => {
        if (!user) return;
        setMarkingAll(true);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);
        setMarkingAll(false);
    }, [user, supabase]);

    const handleNavigate = useCallback((notif: Notification) => {
        const cfg = getConfig(notif.type);
        const href = cfg.navHref(notif.related_entity_id);
        if (href) router.push(href);
    }, [router]);

    const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

    const filtered = useMemo(
        () => tab === "unread" ? notifications.filter(n => !n.is_read) : notifications,
        [notifications, tab]
    );

    if (userLoading || loading) return <VajraLoader fullPage />;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-10 pb-16">

            {/* Page header */}
            <div className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                    <span className="h-px w-8" style={{ background: "rgba(0,229,255,0.6)" }} />
                    <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#00e5ff]">
                        // WORKSPACE / NOTIFICATIONS
                    </span>
                </div>
                <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="font-sans font-extrabold tracking-tight text-[#f0f4ff] text-[34px] leading-none">
                            Notifications
                        </h1>
                        <p className="text-[#8b9ab0] text-[13.5px] mt-2">
                            Activity across project proposals, equipment requests, and team updates.
                        </p>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            onClick={() => void markAllRead()}
                            disabled={markingAll}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] transition-all disabled:opacity-50"
                            style={{
                                borderColor: "rgba(0,229,255,0.25)",
                                background: "rgba(0,229,255,0.04)",
                                color: "#8b9ab0",
                            }}
                        >
                            <CheckCheck size={13} />
                            Mark all read
                        </button>
                    )}
                </div>
            </div>

            {/* Tab strip */}
            <TabStrip
                value={tab}
                onChange={setTab}
                unreadCount={unreadCount}
                totalCount={notifications.length}
            />

            {/* Meta row */}
            <div className="flex items-center justify-between my-4 font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: "#8b9ab0" }}>
                <div className="flex items-center gap-3">
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                            background: unreadCount > 0 ? "#f59e0b" : "#22c55e",
                            boxShadow: unreadCount > 0 ? "0 0 6px #f59e0b" : "0 0 6px #22c55e",
                        }}
                    />
                    <span>
                        {unreadCount > 0
                            ? `${unreadCount} unread · ${notifications.length} total`
                            : `${notifications.length} total · all read`}
                    </span>
                </div>
                {filtered.length > 0 && (
                    <span className="text-[#4a5568] hidden sm:block">Click any row to navigate</span>
                )}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <EmptyState filter={tab} />
            ) : (
                <div className="space-y-2">
                    {filtered.map(n => (
                        <NotifCard
                            key={n.id}
                            notif={n}
                            onMarkRead={markRead}
                            onNavigate={handleNavigate}
                        />
                    ))}
                </div>
            )}

            {/* Footer hint */}
            {notifications.length > 0 && (
                <div
                    className="mt-8 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em]"
                    style={{ color: "#4a5568" }}
                >
                    <ArrowRight size={11} />
                    <span>Notifications older than 30 days are auto-archived</span>
                </div>
            )}
        </div>
    );
}
