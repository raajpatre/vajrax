"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type Notification = Tables<"notifications">;

function formatRelativeTime(iso: string) {
    const createdAt = new Date(iso).getTime();
    const now = Date.now();
    const diffMs = Math.max(now - createdAt, 0);
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function notificationHref(notification: Notification) {
    if (notification.type === "equipment_request_approved") return "/my-requests";
    if (notification.type === "post_comment") return "/feed";
    return "#";
}

export default function NotificationBell({ userId }: { userId: string }) {
    const supabase = useMemo(() => createClient(), []);
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(8);

            if (data) setNotifications(data);
            setLoading(false);
        };

        fetchNotifications();

        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                () => fetchNotifications()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, userId]);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (e: PointerEvent) => {
            if (rootRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };

        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    const handleMarkAllRead = async () => {
        const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
        if (unreadIds.length === 0) return;

        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .in("id", unreadIds);

        if (!error) {
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        }
    };

    const handleMarkOneRead = async (e: React.MouseEvent, notification: Notification) => {
        e.preventDefault();
        e.stopPropagation();

        if (notification.is_read) return;

        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notification.id)
            .eq("user_id", userId);

        if (!error) {
            setNotifications((prev) =>
                prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
            );
        }
    };

    const handleLinkClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", notification.id)
                .eq("user_id", userId);
            setNotifications((prev) =>
                prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
            );
        }
        setOpen(false);
    };

    return (
        <div className="relative" ref={rootRef}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="relative p-2 rounded-xl text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                aria-label="Notifications"
                aria-expanded={open}
                aria-haspopup="true"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-400 text-[#050B14] text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 glass-strong p-2 rounded-xl shadow-xl shadow-black/30 border border-border/70 z-50">
                    <div className="flex items-center justify-between px-2 py-2 border-b border-border/70">
                        <p className="text-sm font-semibold">Notifications</p>
                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 transition-colors disabled:opacity-50"
                            disabled={unreadCount === 0}
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Mark all read
                        </button>
                    </div>

                    {loading ? (
                        <p className="px-2 py-6 text-xs text-text-muted text-center">Loading...</p>
                    ) : notifications.length === 0 ? (
                        <p className="px-2 py-6 text-xs text-text-muted text-center">No notifications yet.</p>
                    ) : (
                        <ul className="max-h-80 overflow-auto py-1">
                            {notifications.map((notification) => (
                                <li key={notification.id} className="group/item">
                                    <div
                                        className={`flex items-stretch gap-1 rounded-lg transition-colors ${
                                            notification.is_read
                                                ? "hover:bg-white/[0.03]"
                                                : "bg-cyan-500/10 hover:bg-cyan-500/15"
                                        }`}
                                    >
                                        <Link
                                            href={notificationHref(notification)}
                                            onClick={() => void handleLinkClick(notification)}
                                            className="flex-1 min-w-0 px-2 py-2 text-left"
                                        >
                                            <p className="text-xs text-foreground leading-relaxed">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-text-muted mt-1">
                                                {formatRelativeTime(notification.created_at)}
                                            </p>
                                        </Link>
                                        {!notification.is_read && (
                                            <button
                                                type="button"
                                                onClick={(e) => void handleMarkOneRead(e, notification)}
                                                className="shrink-0 self-center mr-1 p-1.5 rounded-lg text-cyan-300/80 hover:text-cyan-200 hover:bg-white/[0.06] transition-colors opacity-70 group-hover/item:opacity-100"
                                                aria-label="Mark as read"
                                                title="Mark as read"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
