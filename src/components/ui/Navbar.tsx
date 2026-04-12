"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Menu, X, LogIn, LogOut, User, Users, Package, FolderOpen, Mail, FlaskConical, ClipboardList, Bell, CheckCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { formatNotificationTime, getNotificationHref } from "@/lib/notifications";
import { Tables } from "@/types/database";

const publicLinks = [
    { href: "/", label: "Home" },
    { href: "/projects", label: "Projects" },
    { href: "/gallery", label: "Gallery" },
    { href: "/events", label: "Events" },
    { href: "/innovators", label: "Our Innovators" },
    { href: "/contact", label: "Contact" },
];

const roleLabels: Record<string, { label: string; class: string }> = {
    member: { label: "Member", class: "badge-member" },
    president: { label: "President", class: "badge-president" },
    vice_president: { label: "VP", class: "badge-vp" },
    faculty: { label: "Faculty", class: "badge-faculty" },
    website_manager: { label: "Website Manager", class: "badge-website-manager" },
    printing_head: { label: "3D Printing Head", class: "badge-printing-head" },
    inventory_manager: { label: "Inventory Manager", class: "badge-inventory-manager" },
};

type NotificationRow = Tables<"notifications">;

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationRow[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const { user, profile, loading, isAuthenticated, signOut, isFaculty, isModerator, isInventoryManager } = useUser();
    const canViewLabHistory = profile?.role === "faculty" || profile?.role === "president";
    const notificationRef = useRef<HTMLDivElement>(null);
    const unreadCount = notifications.filter((notification) => !notification.is_read).length;

    useEffect(() => {
        let frameId = 0;

        const updateScrollState = () => {
            frameId = 0;
            setIsScrolled(window.scrollY > 20);
        };

        const handleScroll = () => {
            if (frameId) return;
            frameId = window.requestAnimationFrame(updateScrollState);
        };

        updateScrollState();
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (frameId) window.cancelAnimationFrame(frameId);
        };
    }, []);

    const closeMenu = () => setIsMobileOpen(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            return;
        }

        setNotificationsLoading(true);
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);

        if (!error && data) {
            setNotifications(data);
        }
        setNotificationsLoading(false);
    }, [supabase, user]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchNotifications();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [fetchNotifications]);

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    void fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [fetchNotifications, supabase, user]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!notificationRef.current?.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, []);

    const handleSignOut = async () => {
        await signOut();
        setIsMobileOpen(false);
        window.location.href = "/";
    };

    const markNotificationAsRead = async (notificationId: string) => {
        setNotifications((current) =>
            current.map((notification) =>
                notification.id === notificationId ? { ...notification, is_read: true } : notification
            )
        );

        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notificationId);

        if (error) {
            console.error("Failed to mark notification as read:", error.message);
        }
    };

    const markAllNotificationsAsRead = async () => {
        if (!user || unreadCount === 0) return;

        setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        if (error) {
            console.error("Failed to mark all notifications as read:", error.message);
            await fetchNotifications();
        }
    };

    const handleNotificationClick = async (notification: NotificationRow) => {
        await markNotificationAsRead(notification.id);
        setIsNotificationsOpen(false);
        router.push(getNotificationHref(notification.type));
    };

    return (
        <>
            <nav
                className="fixed top-0 left-0 right-0 z-[80] pointer-events-none"
                style={{ height: "var(--nav-height)" }}
            >
                <div
                    className={`pointer-events-auto mx-auto flex h-full w-full items-center px-4 sm:px-6 transition-[max-width,margin-top,background-color,border-color,box-shadow,border-radius] duration-300 ease-out ${isScrolled
                        ? "mt-2 max-w-5xl rounded-[4px] glass-strong border-[rgba(59,73,76,0.28)] shadow-[0_24px_62px_rgba(0,0,0,0.5)]"
                        : "mt-0 max-w-none border-b border-[rgba(59,73,76,0.18)] bg-[linear-gradient(180deg,rgba(16,19,26,0.82),rgba(11,14,20,0.68))] backdrop-blur-2xl"
                        }`}
                    style={{
                        transform: "translateZ(0)",
                        backfaceVisibility: "hidden",
                        willChange: "max-width, margin-top, border-radius",
                    }}
                >
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,rgba(0,229,255,0),rgba(0,229,255,0.5),rgba(0,218,243,0.3),rgba(0,229,255,0))] animate-[aurora-shift_7s_linear_infinite]" />
                    <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="group flex items-center gap-2 bg-transparent sm:gap-2.5" onClick={closeMenu}>
                        {!isScrolled && (
                            <Image
                                src="/vajrax-logo.png"
                                alt="VajraX logo"
                                width={56}
                                height={56}
                                className="h-12 w-12 bg-transparent object-contain transition-transform duration-300 group-hover:scale-105 sm:h-[3.25rem] sm:w-[3.25rem]"
                            />
                        )}
                        <Image
                            src="/vajrax-wordmark.png"
                            alt="VajraX"
                            width={210}
                            height={50}
                            className="h-7 w-auto bg-transparent object-contain sm:h-8"
                        />
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-1">
                        {publicLinks.filter(link => !(isAuthenticated && (link.href === "/" || link.href === "/contact"))).map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={closeMenu}
                                    className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                                            ? "text-[#c3f5ff] bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.24)] shadow-[0_0_0_1px_rgba(0,229,255,0.12),0_0_20px_rgba(0,229,255,0.1)]"
                                            : "text-text-secondary hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                                        }`}
                                >
                                    {link.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="navbar-indicator"
                                            className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-[#00e5ff]"
                                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}

                        {isAuthenticated && (
                            <Link
                                href="/inventory"
                                onClick={closeMenu}
                                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${pathname.startsWith("/inventory")
                                        ? "text-[#c3f5ff] bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.24)] shadow-[0_0_0_1px_rgba(0,229,255,0.12),0_0_20px_rgba(0,229,255,0.1)]"
                                        : "text-text-secondary hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                                    }`}
                            >
                                Inventory
                                {pathname.startsWith("/inventory") && (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-[#00e5ff]"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                            </Link>
                        )}
                        {isAuthenticated && (
                            <Link
                                href="/lab"
                                onClick={closeMenu}
                                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 ${pathname.startsWith("/lab")
                                        ? "text-[#c3f5ff] bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.24)] shadow-[0_0_0_1px_rgba(0,229,255,0.12),0_0_20px_rgba(0,229,255,0.1)]"
                                        : "text-text-secondary hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                                    }`}
                            >
                                <FlaskConical className="w-3.5 h-3.5 opacity-80" />
                                Lab
                                <span className="ml-1 rounded-full border border-cyan-300/50 bg-cyan-300/14 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.08em] text-cyan-100">
                                    BETA
                                </span>
                                {pathname.startsWith("/lab") && (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-[#00e5ff]"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                            </Link>
                        )}
                    </div>

                    {/* Auth section + Mobile toggle */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {loading ? (
                            <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />
                        ) : isAuthenticated && profile ? (
                            /* Logged in user chip */
                            <div className="flex items-center gap-1">
                                <div className="group flex max-w-[min(46vw,15rem)] items-center gap-2 rounded-[4px] border border-[rgba(59,73,76,0.22)] bg-[rgba(25,28,34,0.62)] px-2 py-1.5 backdrop-blur-xl transition-all hover:border-[rgba(0,229,255,0.2)] hover:bg-[rgba(29,32,38,0.72)] sm:max-w-[min(38vw,15rem)] sm:gap-2.5 sm:px-2.5">
                                    <div className="h-8 w-8 shrink-0 rounded-[4px] border border-[rgba(0,229,255,0.24)] bg-[rgba(0,229,255,0.1)] flex items-center justify-center overflow-hidden">
                                        {profile.avatar_url ? (
                                            <img
                                                src={profile.avatar_url}
                                                alt={profile.display_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-4 h-4 text-primary-light" />
                                        )}
                                    </div>
                                    <div className="hidden min-w-0 sm:flex flex-col items-start justify-center gap-1">
                                        <span className="max-w-[7.25rem] truncate text-sm font-medium leading-none text-foreground">
                                            {profile.display_name}
                                        </span>
                                        {profile.role && roleLabels[profile.role] && (
                                            <span
                                                className={`badge shrink-0 whitespace-nowrap px-2 py-0.5 text-[9px] leading-none ${roleLabels[profile.role].class
                                                    }`}
                                            >
                                                {roleLabels[profile.role].label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Not logged in — Sign In button */
                            <Link href="/login" className="btn-primary text-sm !px-4 !py-2 sm:!px-5" onClick={closeMenu}>
                                <LogIn className="w-4 h-4" />
                                <span className="hidden sm:inline">Sign In</span>
                            </Link>
                        )}

                        {isAuthenticated && (
                            <div className="relative pointer-events-auto" ref={notificationRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsNotificationsOpen((current) => !current)}
                                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[rgba(59,73,76,0.22)] bg-[rgba(25,28,34,0.62)] text-text-secondary backdrop-blur-xl transition-all hover:border-[rgba(0,229,255,0.2)] hover:bg-[rgba(29,32,38,0.72)] hover:text-foreground"
                                    aria-label="Open notifications"
                                >
                                    <Bell className="h-4.5 w-4.5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#ffb4ab] shadow-[0_0_0_2px_rgba(16,19,26,0.9)]" />
                                    )}
                                </button>

                                <AnimatePresence>
                                    {isNotificationsOpen && (
                                        <>
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="fixed inset-0 z-[94] bg-[rgba(11,14,20,0.72)] backdrop-blur-[3px]"
                                                onClick={() => setIsNotificationsOpen(false)}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                                transition={{ duration: 0.16 }}
                                                className="absolute right-0 top-[calc(100%+0.6rem)] z-[95] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-[4px] border border-[rgba(59,73,76,0.28)] bg-[#10131a] shadow-[0_28px_80px_rgba(0,0,0,0.65),0_0_40px_rgba(0,229,255,0.06)]"
                                            >
                                                <div className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
                                                    <div className="flex items-center justify-between px-4 py-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-foreground">Notifications</p>
                                                            <p className="text-[11px] text-text-muted">
                                                                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => void markAllNotificationsAsRead()}
                                                            disabled={unreadCount === 0}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-all hover:text-foreground hover:bg-white/[0.06] disabled:opacity-40"
                                                        >
                                                            <CheckCheck className="h-3.5 w-3.5" />
                                                            Mark all read
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="max-h-[24rem] overflow-y-auto bg-[#10131a]">
                                                    {notificationsLoading ? (
                                                        <div className="flex items-center justify-center px-4 py-10">
                                                            <Loader2 className="h-5 w-5 animate-spin text-primary-light" />
                                                        </div>
                                                ) : notifications.length === 0 ? (
                                                    <div className="bg-[#10131a] px-4 py-10 text-center">
                                                        <Bell className="mx-auto mb-3 h-8 w-8 text-text-muted" />
                                                        <p className="text-sm font-medium text-foreground">No notifications yet</p>
                                                        <p className="mt-1 text-xs text-text-muted">
                                                            Project invites and request decisions will show up here.
                                                        </p>
                                                        </div>
                                                    ) : (
                                                        <div className="p-2">
                                                            {notifications.map((notification) => (
                                                                <button
                                                                    key={notification.id}
                                                                    type="button"
                                                                    onClick={() => void handleNotificationClick(notification)}
                                                                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all hover:bg-white/[0.04] ${notification.is_read ? "bg-transparent opacity-80" : "bg-white/[0.05]"}`}
                                                                >
                                                                    <div className="mt-1 flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                                                                        {!notification.is_read && (
                                                                            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-sm leading-relaxed text-foreground">
                                                                            {notification.message}
                                                                        </p>
                                                                        <p className="mt-1 text-[11px] text-text-muted">
                                                                            {formatNotificationTime(notification.created_at)}
                                                                        </p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        <button
                            className="btn-ghost !inline-flex !p-2 md:!hidden"
                            onClick={() => setIsMobileOpen(!isMobileOpen)}
                            aria-label={isMobileOpen ? "Close menu" : "Toggle menu"}
                        >
                            {isMobileOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </button>

                        {isAuthenticated && !isScrolled && (
                            <button
                                className="btn-ghost !hidden !p-2 md:!inline-flex"
                                onClick={() => setIsMobileOpen(!isMobileOpen)}
                                aria-label={isMobileOpen ? "Close menu" : "Toggle menu"}
                            >
                                {isMobileOpen ? (
                                    <X className="w-5 h-5" />
                                ) : (
                                    <Menu className="w-5 h-5" />
                                )}
                            </button>
                        )}
                    </div>
                </div>
                </div>
                {isAuthenticated && isScrolled && (
                    <button
                        className="pointer-events-auto absolute right-6 top-[calc(50%+4px)] !hidden -translate-y-1/2 rounded-[4px] border border-[rgba(59,73,76,0.22)] bg-[rgba(25,28,34,0.62)] p-2.5 text-text-secondary backdrop-blur-xl transition-all hover:border-[rgba(0,229,255,0.2)] hover:bg-[rgba(29,32,38,0.72)] hover:text-foreground md:!inline-flex"
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                        aria-label={isMobileOpen ? "Close menu" : "Toggle menu"}
                    >
                        {isMobileOpen ? (
                            <X className="w-5 h-5" />
                        ) : (
                            <Menu className="w-5 h-5" />
                        )}
                    </button>
                )}
            </nav>

            {/* Navigation menu */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.button
                            type="button"
                            aria-label="Close mobile menu"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.16 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="fixed inset-0 z-[85] bg-[radial-gradient(circle_at_top,rgba(16,19,26,0.24),rgba(11,14,20,0.62))] backdrop-blur-[2px]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className={`fixed top-[calc(var(--nav-height)+max(env(safe-area-inset-top),0px)+8px)] z-[90] overflow-y-auto rounded-[4px] border border-[rgba(59,73,76,0.28)] bg-[linear-gradient(165deg,rgba(16,19,26,0.94),rgba(11,14,20,0.88))] p-3.5 shadow-[0_22px_62px_rgba(0,0,0,0.55),0_0_40px_rgba(0,229,255,0.06)] backdrop-blur-2xl sm:p-4 ${isAuthenticated ? "left-3 right-3 max-h-[calc(100dvh-var(--nav-height)-max(env(safe-area-inset-top),0px)-16px)] md:left-auto md:w-[min(24rem,calc(100vw-1.5rem))]" : "right-3 left-3 max-h-[calc(100dvh-var(--nav-height)-max(env(safe-area-inset-top),0px)-16px)] md:hidden"}`}
                        >
                            <div className="flex flex-col gap-1">
                                {isAuthenticated && profile && (
                                    <>
                                        <div className="mb-2 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                            <div className="h-10 w-10 shrink-0 rounded-[4px] border border-[rgba(0,229,255,0.24)] bg-[rgba(0,229,255,0.1)] flex items-center justify-center overflow-hidden">
                                                {profile.avatar_url ? (
                                                    <img
                                                        src={profile.avatar_url}
                                                        alt={profile.display_name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="w-5 h-5 text-primary-light" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-foreground">{profile.display_name}</p>
                                                <p className="truncate text-xs text-text-muted">{user?.email}</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/profile/${user?.id}`}
                                            onClick={closeMenu}
                                            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                        >
                                            <User className="w-4 h-4" />
                                            Profile
                                        </Link>
                                    </>
                                )}
                                {publicLinks.filter(link => !(isAuthenticated && (link.href === "/" || link.href === "/contact"))).map((link) => {
                                    const isActive = pathname === link.href;
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={closeMenu}
                                            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                                    ? "text-white bg-white/[0.08] border border-white/18"
                                                    : "text-text-secondary hover:text-foreground hover:bg-white/[0.04]"
                                                }`}
                                        >
                                            {link.label}
                                        </Link>
                                    );
                                })}
                                {isAuthenticated && (
                                    <>
                                        <Link
                                            href="/inventory"
                                            onClick={closeMenu}
                                            className="px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                        >
                                            Inventory
                                        </Link>
                                        <Link
                                            href="/my-requests"
                                            onClick={closeMenu}
                                            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                        >
                                            <ClipboardList className="w-4 h-4" />
                                            My Requests
                                        </Link>
                                        <Link
                                            href="/lab"
                                            onClick={closeMenu}
                                            className="px-4 py-3 rounded-lg text-sm font-medium text-cyan-300/90 hover:text-cyan-200 hover:bg-cyan-500/10 transition-all flex items-center gap-2"
                                        >
                                            <FlaskConical className="w-4 h-4" />
                                            Lab
                                            <span className="rounded-full border border-cyan-300/50 bg-cyan-300/14 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.08em] text-cyan-100">
                                                BETA
                                            </span>
                                        </Link>
                                        <Link
                                            href="/project-invites"
                                            onClick={closeMenu}
                                            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                        >
                                            <Mail className="w-4 h-4" />
                                            Project Invites
                                        </Link>
                                        {(isFaculty || isModerator || isInventoryManager) && (
                                            <>
                                                <div className="my-2 border-t border-border" />
                                                <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Admin</p>
                                                {(isFaculty || isModerator) && (
                                                    <Link
                                                        href="/admin/members"
                                                        onClick={closeMenu}
                                                        className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                    >
                                                        <Users className="w-4 h-4" />
                                                        Manage Members
                                                    </Link>
                                                )}
                                                {(isFaculty || isModerator) && (
                                                    <Link
                                                        href="/admin/applicants"
                                                        onClick={closeMenu}
                                                        className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                        New Applicants
                                                    </Link>
                                                )}
                                                <Link
                                                    href="/admin/requests"
                                                    onClick={closeMenu}
                                                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                >
                                                    <Package className="w-4 h-4" />
                                                    Inventory Management
                                                </Link>
                                                {(isFaculty || isModerator) && (
                                                    <Link
                                                        href="/admin/project-requests"
                                                        onClick={closeMenu}
                                                        className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                    >
                                                        <FolderOpen className="w-4 h-4" />
                                                        Project Requests
                                                    </Link>
                                                )}
                                                {canViewLabHistory && (
                                                    <Link
                                                        href="/admin/lab-history"
                                                        onClick={closeMenu}
                                                        className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                    >
                                                        <FlaskConical className="w-4 h-4" />
                                                        Lab History
                                                    </Link>
                                                )}
                                            </>
                                        )}
                                        <div className="my-2 border-t border-border" />
                                        <button
                                            onClick={handleSignOut}
                                            className="flex w-full items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all text-left"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign Out
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
