"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Bell,
    Boxes,
    CalendarDays,
    ChevronsLeft,
    ChevronsRight,
    FileSpreadsheet,
    FolderGit2,
    GitPullRequest,
    HelpCircle,
    LayoutDashboard,
    LayoutGrid,
    LogOut,
    Mail,
    Menu,
    PackageOpen,
    PlusCircle,
    Settings,
    Star,
    UserPlus,
    Users,
    Users2,
    Warehouse,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type BadgeTone = "cyan" | "amber" | "danger" | "muted";

interface NavItemDef {
    href: string;
    label: string;
    icon: LucideIcon;
    hotkey?: string;
    badge?: string;
    badgeTone?: BadgeTone;
    adminOnly?: boolean;
    inventoryOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const BADGE_COLORS: Record<BadgeTone, { bg: string; bd: string; fg: string }> = {
    cyan:   { bg: "rgba(0,229,255,0.10)",   bd: "rgba(0,229,255,0.45)",   fg: "#00e5ff" },
    amber:  { bg: "rgba(245,158,11,0.10)",  bd: "rgba(245,158,11,0.45)",  fg: "#f59e0b" },
    danger: { bg: "rgba(239,68,68,0.10)",   bd: "rgba(239,68,68,0.45)",   fg: "#ef4444" },
    muted:  { bg: "rgba(139,154,176,0.08)", bd: "rgba(139,154,176,0.30)", fg: "#8b9ab0" },
};

const ROLE_LABEL: Record<string, string> = {
    faculty:           "FACULTY",
    president:         "PRESIDENT",
    vice_president:    "VICE PRES",
    inventory_manager: "INV MGR",
    website_manager:   "WEB MGR",
    printing_head:     "PRINT HEAD",
    member:            "MEMBER",
};

const EXPLORE_ITEMS: NavItemDef[] = [
    { href: "/gallery",    label: "Gallery",        icon: LayoutGrid,  hotkey: "G" },
    { href: "/events",     label: "Events",         icon: CalendarDays, hotkey: "E" },
    { href: "/innovators", label: "Our Innovators",  icon: Users2 },
];

const CORE_ITEMS: NavItemDef[] = [
    { href: "/inventory",        label: "Inventory",       icon: Boxes,          hotkey: "I" },
    { href: "/projects",         label: "My Projects",     icon: FolderGit2,     hotkey: "P" },
    { href: "/my-requests",      label: "My Requests",     icon: GitPullRequest, hotkey: "R" },
    { href: "/project-invites",  label: "Project Invites", icon: Mail,           hotkey: "V" },
    { href: "/projects/request", label: "Request Project", icon: PlusCircle,     hotkey: "N" },
];

const ADMIN_ITEMS: NavItemDef[] = [
    { href: "/admin",                   label: "Dashboard",          icon: LayoutDashboard, adminOnly: true },
    { href: "/admin/members",           label: "Members",            icon: Users,           adminOnly: true },
    { href: "/admin/applicants",        label: "New Applicants",     icon: UserPlus,        adminOnly: true },
    { href: "/admin/requests",          label: "Equipment Requests", icon: PackageOpen,     inventoryOnly: true },
    { href: "/admin/inventory",         label: "Manage Inventory",   icon: Warehouse,       inventoryOnly: true },
    { href: "/admin/project-requests",  label: "Project Proposals",  icon: FileSpreadsheet, adminOnly: true },
    { href: "/admin/sponsors",           label: "Sponsors",            icon: Star,            adminOnly: true },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name
        .split(" ")
        .map((w) => w[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

// ─────────────────────────────────────────────────────────────
// Tooltip
// ─────────────────────────────────────────────────────────────

function Tooltip({
    children,
    label,
    hotkey,
    fullWidth = false,
}: {
    children: React.ReactNode;
    label: string;
    hotkey?: string;
    fullWidth?: boolean;
}) {
    const [show, setShow] = useState(false);
    return (
        <span
            className={fullWidth ? "relative flex w-full" : "relative inline-flex"}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && (
                <span className="absolute z-[60] top-1/2 -translate-y-1/2 left-[calc(100%+10px)] whitespace-nowrap pointer-events-none">
                    <span
                        className="relative inline-flex items-center gap-2 h-7 px-2.5 rounded-sm shadow-xl"
                        style={{
                            background: "rgba(17,24,32,0.95)",
                            border: "1px solid rgba(0,229,255,0.28)",
                        }}
                    >
                        <span className="text-[12px] font-medium tracking-tight" style={{ color: "#f0f4ff" }}>
                            {label}
                        </span>
                        {hotkey && (
                            <kbd
                                className="font-mono text-[10px] px-1.5 h-[18px] grid place-items-center rounded-sm"
                                style={{
                                    border: "1px solid rgba(0,229,255,0.18)",
                                    color: "#8b9ab0",
                                    background: "#07090f",
                                }}
                            >
                                {hotkey}
                            </kbd>
                        )}
                        <span
                            className="absolute top-1/2 -translate-y-1/2 -left-[5px] w-[8px] h-[8px] rotate-45"
                            style={{
                                background: "rgba(17,24,32,0.95)",
                                borderLeft: "1px solid rgba(0,229,255,0.28)",
                                borderBottom: "1px solid rgba(0,229,255,0.28)",
                            }}
                        />
                    </span>
                </span>
            )}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────
// SectionTag
// ─────────────────────────────────────────────────────────────

function SectionTag({
    children,
    collapsed,
    count,
}: {
    children: React.ReactNode;
    collapsed: boolean;
    count?: number;
}) {
    if (collapsed) {
        return (
            <div className="mt-3 mb-2 flex items-center justify-center">
                <span className="h-px w-6" style={{ background: "rgba(0,229,255,0.12)" }} />
            </div>
        );
    }
    return (
        <div className="px-3 mt-4 mb-2 flex items-center gap-2">
            <span
                className="font-mono text-[10px] uppercase tracking-[0.22em] leading-none"
                style={{ color: "#4a5568" }}
            >
                {children}
            </span>
            <span className="flex-1 h-px" style={{ background: "rgba(0,229,255,0.12)" }} />
            {count != null && (
                <span className="font-mono text-[9.5px] tabular-nums" style={{ color: "#4a5568" }}>
                    {String(count).padStart(2, "0")}
                </span>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// NavItem
// ─────────────────────────────────────────────────────────────

function NavItem({
    href,
    label,
    hotkey,
    icon: Icon,
    badge,
    badgeTone = "cyan",
    active,
    collapsed,
}: NavItemDef & { active: boolean; collapsed: boolean }) {
    const b = BADGE_COLORS[badgeTone];

    const inner = (
        <Link
            href={href}
            className={[
                "group relative w-full flex items-center text-left transition-colors duration-150 h-9 rounded-sm",
                collapsed ? "justify-center px-0" : "gap-3 px-3",
                active
                    ? "text-[#f0f4ff]"
                    : "text-[#8b9ab0] hover:text-[#f0f4ff] hover:bg-[rgba(0,229,255,0.04)]",
            ].join(" ")}
            style={{ background: active ? "#111820" : undefined }}
        >
            <span
                className="absolute left-0 top-1 bottom-1 w-[2px] rounded-sm transition-all duration-200"
                style={{
                    background: active ? "#00e5ff" : "transparent",
                    boxShadow: active ? "0 0 10px rgba(0,229,255,0.85)" : "none",
                }}
            />

            <Icon
                size={collapsed ? 17 : 15}
                className="shrink-0 transition-colors duration-150"
                style={{ color: active ? "#00e5ff" : "currentColor" }}
            />

            {!collapsed && (
                <>
                    <span className="flex-1 text-[13px] font-medium tracking-tight truncate">
                        {label}
                    </span>
                    {badge != null && (
                        <span
                            className="font-mono text-[10px] px-1.5 h-[18px] grid place-items-center rounded-sm border tabular-nums tracking-wider"
                            style={{ background: b.bg, borderColor: b.bd, color: b.fg }}
                        >
                            {badge}
                        </span>
                    )}
                    {hotkey && badge == null && (
                        <kbd
                            className="font-mono text-[9.5px] px-1 h-[16px] grid place-items-center rounded-sm border"
                            style={{
                                borderColor: "rgba(0,229,255,0.14)",
                                color: "#4a5568",
                                background: "rgba(7,9,15,0.4)",
                            }}
                        >
                            {hotkey}
                        </kbd>
                    )}
                </>
            )}

            {collapsed && badge != null && (
                <span
                    className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: b.fg, boxShadow: `0 0 6px ${b.fg}` }}
                />
            )}
        </Link>
    );

    if (!collapsed) return inner;
    return (
        <Tooltip label={label} hotkey={hotkey} fullWidth>
            {inner}
        </Tooltip>
    );
}

// ─────────────────────────────────────────────────────────────
// Monogram
// ─────────────────────────────────────────────────────────────

function Monogram({ size = 20 }: { size?: number }) {
    return (
        <span
            className="relative inline-flex items-center justify-center shrink-0"
            style={{ width: size + 8, height: size + 8 }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vajrax-logo.png" alt="VajraX" width={size + 8} height={size + 8} className="shrink-0 object-contain"
                style={{ filter: "drop-shadow(0 0 10px rgba(0,229,255,0.45))" }} />
        </span>
    );
}

// ─────────────────────────────────────────────────────────────
// IconBtn — small footer icon button
// ─────────────────────────────────────────────────────────────

function IconBtn({
    onClick,
    href,
    label,
    children,
    danger = false,
}: {
    onClick?: () => void;
    href?: string;
    label: string;
    children: React.ReactNode;
    danger?: boolean;
}) {
    const cls =
        "grid place-items-center w-9 h-9 rounded-sm transition-colors";
    const style = {
        border: "1px solid rgba(0,229,255,0.10)",
        color: "#8b9ab0",
    };

    const handleEnter = (e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.borderColor = danger
            ? "rgba(239,68,68,0.45)"
            : "rgba(0,229,255,0.45)";
        e.currentTarget.style.color = danger ? "#ef4444" : "#f0f4ff";
        e.currentTarget.style.background = danger
            ? "rgba(239,68,68,0.06)"
            : "rgba(0,229,255,0.06)";
    };
    const handleLeave = (e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.borderColor = "rgba(0,229,255,0.10)";
        e.currentTarget.style.color = "#8b9ab0";
        e.currentTarget.style.background = "transparent";
    };

    const inner = (
        <Tooltip label={label}>
            {href ? (
                <Link
                    href={href}
                    className={cls}
                    style={style}
                    onMouseEnter={handleEnter}
                    onMouseLeave={handleLeave}
                    aria-label={label}
                >
                    {children}
                </Link>
            ) : (
                <button
                    onClick={onClick}
                    className={cls}
                    style={style}
                    onMouseEnter={handleEnter}
                    onMouseLeave={handleLeave}
                    aria-label={label}
                >
                    {children}
                </button>
            )}
        </Tooltip>
    );

    return inner;
}

// ─────────────────────────────────────────────────────────────
// ProtectedSidebar
// ─────────────────────────────────────────────────────────────

export default function ProtectedSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { profile, isFaculty, isModerator, isInventoryManager, user, signOut } = useUser();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        document.body.classList.toggle("sidebar-collapsed", collapsed);
        return () => document.body.classList.remove("sidebar-collapsed");
    }, [collapsed]);

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Fetch unread notification count
    const fetchUnread = useCallback(async () => {
        if (!user) { setUnreadCount(0); return; }
        const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);
        setUnreadCount(count ?? 0);
    }, [supabase, user]);

    useEffect(() => {
        void fetchUnread();
    }, [fetchUnread]);

    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel(`sidebar-notif:${user.id}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
                () => void fetchUnread()
            )
            .subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [fetchUnread, supabase, user]);

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
    };

    const canAdmin = isFaculty || isModerator;
    const canInventory = isFaculty || isModerator || isInventoryManager;
    const showAdmin = canAdmin || canInventory;

    const visibleAdminItems = ADMIN_ITEMS.filter((item) => {
        if (item.adminOnly && !canAdmin) return false;
        if (item.inventoryOnly && !canInventory) return false;
        return true;
    });

    const displayName = profile?.display_name ?? "";
    const roleLabel = profile?.role
        ? (ROLE_LABEL[profile.role] ?? profile.role.toUpperCase())
        : "";
    const userInitials = displayName ? getInitials(displayName) : "?";

    function isActive(href: string) {
        if (href === "/admin") return pathname === "/admin";
        if (href === "/projects") {
            return (
                pathname.startsWith("/projects") &&
                !pathname.startsWith("/projects/request")
            );
        }
        return pathname === href || pathname.startsWith(href + "/");
    }

    const notifBadge = unreadCount > 0
        ? String(unreadCount > 9 ? "9+" : unreadCount)
        : undefined;

    // On mobile, sidebar is always 260px (ignore collapsed)
    const sidebarWidth = collapsed && !mobileOpen ? 68 : 260;

    return (
        <>
            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-30"
                    style={{ background: "rgba(7,9,15,0.80)", backdropFilter: "blur(6px)" }}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile hamburger button — hidden when sidebar is open */}
            {!mobileOpen && (
                <button
                    className="lg:hidden fixed top-4 left-4 z-50 grid place-items-center w-10 h-10 rounded-sm"
                    style={{
                        background: "#0d1117",
                        border: "1px solid rgba(0,229,255,0.18)",
                        color: "#f0f4ff",
                    }}
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open menu"
                >
                    <Menu size={18} />
                </button>
            )}

            <aside
                className={`flex flex-col fixed top-0 left-0 h-screen z-40 overflow-hidden ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                }`}
                style={{
                    width: sidebarWidth,
                    background: "#0d1117",
                    borderRight: "1px solid rgba(0,229,255,0.08)",
                    transition: "width 280ms cubic-bezier(.5,.05,.2,1), transform 280ms cubic-bezier(.5,.05,.2,1)",
                }}
            >
                {/* ── Header ─────────────────────────────────── */}
                <div
                    className="flex items-center shrink-0"
                    style={{
                        height: 56,
                        padding: collapsed && !mobileOpen ? "0" : "0 14px",
                        justifyContent: collapsed && !mobileOpen ? "center" : "flex-start",
                        gap: 4,
                        borderBottom: "1px solid rgba(0,229,255,0.08)",
                    }}
                >
                    <Monogram size={32} />
                    {(!collapsed || mobileOpen) && (
                        <div className="leading-none min-w-0 overflow-hidden flex-1">
                            <div
                                className="font-sans font-extrabold text-[16px] tracking-tight whitespace-nowrap"
                                style={{ color: "#f0f4ff" }}
                            >
                                Vajra<span style={{ color: "#00e5ff" }}>X</span>
                            </div>
                            <div
                                className="font-mono text-[9px] uppercase tracking-[0.22em] mt-1 whitespace-nowrap"
                                style={{ color: "#4a5568" }}
                            >
                                workshop console
                            </div>
                        </div>
                    )}
                    {/* Close button — mobile only */}
                    {mobileOpen && (
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="lg:hidden grid place-items-center w-8 h-8 rounded-sm shrink-0 transition-colors"
                            style={{ border: "1px solid rgba(0,229,255,0.18)", color: "#8b9ab0" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f4ff"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "#8b9ab0"; }}
                            aria-label="Close menu"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* ── User strip — expanded ───────────────────── */}
                {(!collapsed || mobileOpen) && displayName && (
                    <div className="px-3 pt-3 shrink-0">
                        <div
                            className="rounded-md px-2.5 py-2 flex items-center gap-2.5"
                            style={{ background: "#111820", border: "1px solid rgba(0,229,255,0.10)" }}
                        >
                            <span
                                className="relative w-7 h-7 rounded-full overflow-hidden shrink-0"
                                style={{ border: "1px solid rgba(0,229,255,0.45)" }}
                            >
                                {profile?.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={profile.avatar_url}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span
                                        className="grid place-items-center w-full h-full font-mono text-[10.5px]"
                                        style={{ background: "rgba(0,229,255,0.10)", color: "#00e5ff" }}
                                    >
                                        {userInitials}
                                    </span>
                                )}
                                <span
                                    className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
                                    style={{
                                        background: "#22c55e",
                                        boxShadow: "0 0 0 1.5px #111820, 0 0 5px #22c55e",
                                    }}
                                />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div
                                    className="text-[12.5px] font-medium tracking-tight truncate"
                                    style={{ color: "#f0f4ff" }}
                                >
                                    {displayName}
                                </div>
                                <div
                                    className="font-mono text-[9px] uppercase tracking-[0.18em] mt-0.5"
                                    style={{ color: "#00e5ff" }}
                                >
                                    {roleLabel}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── User avatar — collapsed desktop ─────────── */}
                {collapsed && !mobileOpen && displayName && (
                    <div className="mt-3 flex items-center justify-center shrink-0">
                        <Tooltip label={displayName + (roleLabel ? " · " + roleLabel : "")}>
                            <span
                                className="relative w-8 h-8 rounded-full overflow-hidden"
                                style={{ border: "1px solid rgba(0,229,255,0.45)" }}
                            >
                                {profile?.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={profile.avatar_url}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span
                                        className="grid place-items-center w-full h-full font-mono text-[10.5px]"
                                        style={{ background: "rgba(0,229,255,0.10)", color: "#00e5ff" }}
                                    >
                                        {userInitials}
                                    </span>
                                )}
                                <span
                                    className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
                                    style={{
                                        background: "#22c55e",
                                        boxShadow: "0 0 0 1.5px #0d1117, 0 0 5px #22c55e",
                                    }}
                                />
                            </span>
                        </Tooltip>
                    </div>
                )}

                {/* ── Nav ────────────────────────────────────── */}
                <nav className="flex-1 min-h-0 overflow-y-auto px-2 pt-1 pb-4">
                    {/* Explore */}
                    <SectionTag collapsed={collapsed && !mobileOpen}>
                        explore
                    </SectionTag>
                    <div className="space-y-0.5">
                        {EXPLORE_ITEMS.map((item) => (
                            <NavItem
                                key={item.href}
                                {...item}
                                active={isActive(item.href)}
                                collapsed={collapsed && !mobileOpen}
                            />
                        ))}
                        {/* Notifications */}
                        <NavItem
                            href="/notifications"
                            label="Notifications"
                            icon={Bell}
                            badge={notifBadge}
                            badgeTone="amber"
                            active={isActive("/notifications")}
                            collapsed={collapsed && !mobileOpen}
                        />
                    </div>

                    {/* Core */}
                    <SectionTag collapsed={collapsed && !mobileOpen} count={CORE_ITEMS.length}>
                        core
                    </SectionTag>
                    <div className="space-y-0.5">
                        {CORE_ITEMS.map((item) => (
                            <NavItem
                                key={item.href}
                                {...item}
                                active={isActive(item.href)}
                                collapsed={collapsed && !mobileOpen}
                            />
                        ))}
                    </div>

                    {/* Admin */}
                    {showAdmin && (
                        <>
                            <SectionTag collapsed={collapsed && !mobileOpen} count={visibleAdminItems.length}>
                                admin
                            </SectionTag>
                            <div className="space-y-0.5">
                                {visibleAdminItems.map((item) => (
                                    <NavItem
                                        key={item.href}
                                        {...item}
                                        active={isActive(item.href)}
                                        collapsed={collapsed && !mobileOpen}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </nav>

                {/* ── Footer ─────────────────────────────────── */}
                <div
                    className="shrink-0 p-2"
                    style={{ borderTop: "1px solid rgba(0,229,255,0.08)" }}
                >
                    {/* Profile + Sign out row */}
                    {(!collapsed || mobileOpen) ? (
                        <div className="flex items-center gap-2 mb-2">
                            {user?.id && (
                                <Link
                                    href={`/profile/${user.id}`}
                                    className="flex items-center gap-2 flex-1 h-9 px-3 rounded-sm transition-colors text-[12px] font-medium tracking-tight"
                                    style={{ border: "1px solid rgba(0,229,255,0.10)", color: "#8b9ab0" }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(0,229,255,0.45)";
                                        e.currentTarget.style.color = "#f0f4ff";
                                        e.currentTarget.style.background = "rgba(0,229,255,0.04)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(0,229,255,0.10)";
                                        e.currentTarget.style.color = "#8b9ab0";
                                        e.currentTarget.style.background = "transparent";
                                    }}
                                >
                                    <Settings size={13} className="shrink-0" />
                                    Profile
                                </Link>
                            )}
                            <button
                                onClick={handleSignOut}
                                className="grid place-items-center w-9 h-9 rounded-sm transition-colors shrink-0"
                                style={{ border: "1px solid rgba(0,229,255,0.10)", color: "#8b9ab0" }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.45)";
                                    e.currentTarget.style.color = "#ef4444";
                                    e.currentTarget.style.background = "rgba(239,68,68,0.06)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(0,229,255,0.10)";
                                    e.currentTarget.style.color = "#8b9ab0";
                                    e.currentTarget.style.background = "transparent";
                                }}
                                aria-label="Sign out"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1.5 mb-1.5">
                            {user?.id && (
                                <IconBtn href={`/profile/${user.id}`} label="Profile settings">
                                    <Settings size={14} />
                                </IconBtn>
                            )}
                            <IconBtn onClick={handleSignOut} label="Sign out" danger>
                                <LogOut size={14} />
                            </IconBtn>
                        </div>
                    )}

                    {/* Collapse toggle + help */}
                    <div className={collapsed && !mobileOpen ? "flex flex-col items-center gap-2" : "flex items-center gap-2"}>
                        {collapsed && !mobileOpen ? (
                            <Tooltip label="Expand sidebar" hotkey="[">
                                <button
                                    onClick={() => setCollapsed(false)}
                                    className="group grid place-items-center w-12 h-9 rounded-sm transition-colors"
                                    style={{ border: "1px solid rgba(0,229,255,0.10)", color: "#8b9ab0" }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(0,229,255,0.45)";
                                        e.currentTarget.style.color = "#00e5ff";
                                        e.currentTarget.style.background = "rgba(0,229,255,0.06)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(0,229,255,0.10)";
                                        e.currentTarget.style.color = "#8b9ab0";
                                        e.currentTarget.style.background = "transparent";
                                    }}
                                    aria-label="Expand sidebar"
                                >
                                    <ChevronsRight size={14} />
                                </button>
                            </Tooltip>
                        ) : (
                            <button
                                onClick={() => setCollapsed(true)}
                                className="hidden lg:flex group items-center gap-2 flex-1 h-9 px-3 rounded-sm transition-colors"
                                style={{ border: "1px solid rgba(0,229,255,0.10)", color: "#8b9ab0" }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(0,229,255,0.45)";
                                    e.currentTarget.style.color = "#f0f4ff";
                                    e.currentTarget.style.background = "rgba(0,229,255,0.04)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(0,229,255,0.10)";
                                    e.currentTarget.style.color = "#8b9ab0";
                                    e.currentTarget.style.background = "transparent";
                                }}
                                aria-label="Collapse sidebar"
                            >
                                <ChevronsLeft size={14} />
                                <span className="text-[12px] font-medium tracking-tight">Collapse</span>
                                <div className="flex-1" />
                                <kbd
                                    className="font-mono text-[9.5px] px-1 h-[16px] grid place-items-center rounded-sm border"
                                    style={{
                                        borderColor: "rgba(0,229,255,0.14)",
                                        color: "#4a5568",
                                        background: "rgba(7,9,15,0.4)",
                                    }}
                                >
                                    [
                                </kbd>
                            </button>
                        )}

                        {(!collapsed || mobileOpen) && (
                            <Tooltip label="Help & shortcuts" hotkey="?">
                                <button
                                    className="grid place-items-center w-9 h-9 rounded-sm transition-colors"
                                    style={{ border: "1px solid rgba(0,229,255,0.10)", color: "#8b9ab0" }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(0,229,255,0.45)";
                                        e.currentTarget.style.color = "#f0f4ff";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(0,229,255,0.10)";
                                        e.currentTarget.style.color = "#8b9ab0";
                                    }}
                                    aria-label="Help and shortcuts"
                                >
                                    <HelpCircle size={14} />
                                </button>
                            </Tooltip>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
