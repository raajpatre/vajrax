"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    Bell,
    Boxes,
    BarChart2,
    CalendarDays,
    ChevronsLeft,
    ChevronsRight,
    ClipboardList,
    FileSpreadsheet,
    FolderGit2,
    GitPullRequest,
    HelpCircle,
    LayoutDashboard,
    LayoutGrid,
    LogOut,
    Mail,
    Megaphone,
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
// Custom SVG icon — Notice Board (notice.svg)
// ─────────────────────────────────────────────────────────────

function NoticeIcon({ size = 16, style, className }: { size?: number; style?: React.CSSProperties; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={style}
            className={className}
        >
            <path
                d="M4 13.9999L5.57465 20.2985C5.61893 20.4756 5.64107 20.5642 5.66727 20.6415C5.92317 21.397 6.60352 21.9282 7.39852 21.9933C7.4799 21.9999 7.5712 21.9999 7.75379 21.9999C7.98244 21.9999 8.09677 21.9999 8.19308 21.9906C9.145 21.8982 9.89834 21.1449 9.99066 20.193C10 20.0967 10 19.9823 10 19.7537V5.49991M18.5 13.4999C20.433 13.4999 22 11.9329 22 9.99991C22 8.06691 20.433 6.49991 18.5 6.49991M10.25 5.49991H6.5C4.01472 5.49991 2 7.51463 2 9.99991C2 12.4852 4.01472 14.4999 6.5 14.4999H10.25C12.0164 14.4999 14.1772 15.4468 15.8443 16.3556C16.8168 16.8857 17.3031 17.1508 17.6216 17.1118C17.9169 17.0756 18.1402 16.943 18.3133 16.701C18.5 16.4401 18.5 15.9179 18.5 14.8736V5.1262C18.5 4.08191 18.5 3.55976 18.3133 3.2988C18.1402 3.05681 17.9169 2.92421 17.6216 2.88804C17.3031 2.84903 16.8168 3.11411 15.8443 3.64427C14.1772 4.55302 12.0164 5.49991 10.25 5.49991Z"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type IconComponent = LucideIcon | (({ size, style, className }: { size?: number; style?: React.CSSProperties; className?: string }) => React.ReactElement);

type BadgeTone = "cyan" | "amber" | "danger" | "muted";

interface NavItemDef {
    href: string;
    label: string;
    icon: IconComponent;
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
    project_manager:   "PROJ MGR",
    inventory_manager: "INV MGR",
    lead_developer:    "LEAD DEV",
    printing_head:     "PRINT HEAD",
    social_media_head: "SOCIAL HD",
    social_media_co_head: "SOCIAL CO",
    sponsorship_head:  "SPONSOR HD",
    workshop_head:     "WORKSHOP HD",
    mechanics_head:    "MECH HD",
    cad_head:          "CAD HD",
    electronics_head:  "ELEC HD",
    procurement_head:  "PROCURE HD",
    makerspace_head:   "MAKER HD",
    member:            "MEMBER",
};

const EXPLORE_ITEMS: NavItemDef[] = [
    { href: "/gallery",       label: "Gallery",        icon: LayoutGrid,   hotkey: "G" },
    { href: "/events",        label: "Events",         icon: CalendarDays, hotkey: "E" },
    { href: "/notice-board",  label: "Notice",         icon: NoticeIcon as unknown as LucideIcon },
    { href: "/innovators",    label: "Our Innovators", icon: Users2 },
];

const CORE_ITEMS: NavItemDef[] = [
    { href: "/inventory",        label: "Inventory",       icon: Boxes,          hotkey: "I" },
    { href: "/projects",         label: "Projects",        icon: FolderGit2,     hotkey: "P" },
    { href: "/mom",              label: "Minutes Of Meeting", icon: ClipboardList,  hotkey: "M" },
    { href: "/my-requests",      label: "My Requests",     icon: GitPullRequest, hotkey: "R" },
    { href: "/project-invites",  label: "Project Invites", icon: Mail,           hotkey: "V" },
    { href: "/projects/request", label: "Request Project", icon: PlusCircle,     hotkey: "N" },
];

const ADMIN_ITEMS: NavItemDef[] = [
    { href: "/admin",                   label: "Dashboard",          icon: LayoutDashboard, adminOnly: true },
    { href: "/admin/members",           label: "Members",            icon: Users,           adminOnly: true },
    { href: "/admin/applicants",        label: "New Applicants",     icon: UserPlus,        adminOnly: true },
    { href: "/admin/attendance",        label: "Attendance",         icon: BarChart2,       adminOnly: true },
    { href: "/admin/requests",          label: "Equipment Requests", icon: PackageOpen,     inventoryOnly: true },
    { href: "/admin/inventory",         label: "Manage Inventory",   icon: Warehouse,       inventoryOnly: true },
    { href: "/admin/project-requests",  label: "Project Proposals",  icon: FileSpreadsheet, adminOnly: true },
    { href: "/admin/sponsors",           label: "Sponsors",            icon: Star,            adminOnly: true },
    { href: "/admin/notice-board",       label: "Notice",              icon: Megaphone,       adminOnly: true },
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
    disabled = false,
}: {
    children: React.ReactNode;
    label: string;
    hotkey?: string;
    fullWidth?: boolean;
    disabled?: boolean;
}) {
    const [show, setShow] = useState(false);
    return (
        <span
            className={fullWidth ? "relative flex w-full" : "relative inline-flex"}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && !disabled && (
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
    return (
        <div 
            className="mt-4 mb-2 flex items-center gap-2 transition-opacity duration-200"
            style={{ 
                paddingLeft: 18,
                paddingRight: 16,
                opacity: collapsed ? 0 : 1,
            }}
        >
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
                active
                    ? "text-[#f0f4ff]"
                    : "text-[#8b9ab0] hover:text-[#f0f4ff] hover:bg-[rgba(0,229,255,0.04)]",
            ].join(" ")}
            style={{ 
                background: active ? "#111820" : "transparent",
                paddingLeft: 18, // 8px (nav px-2) + 18px + 8px (half icon) = 34px center
                paddingRight: 12
            }}
        >
            <span
                className="absolute left-0 top-1 bottom-1 w-[2px] rounded-sm transition-all duration-200"
                style={{
                    background: active ? "#00e5ff" : "transparent",
                    boxShadow: active ? "0 0 10px rgba(0,229,255,0.85)" : "none",
                }}
            />

            <Icon
                size={16}
                className="shrink-0 transition-colors duration-150"
                style={{ color: active ? "#00e5ff" : "currentColor" }}
            />

            <div 
                className="flex-1 flex items-center ml-3.5 min-w-0 transition-opacity duration-200"
                style={{ opacity: collapsed ? 0 : 1 }}
            >
                <span className="flex-1 text-[13px] font-medium tracking-tight truncate">
                    {label}
                </span>
                {badge != null && (
                    <span
                        className="font-mono text-[10px] px-1.5 h-[18px] grid place-items-center rounded-sm border tabular-nums tracking-wider ml-2 shrink-0"
                        style={{ background: b.bg, borderColor: b.bd, color: b.fg }}
                    >
                        {badge}
                    </span>
                )}
                {hotkey && badge == null && (
                    <kbd
                        className="font-mono text-[9.5px] px-1 h-[16px] grid place-items-center rounded-sm border ml-2 shrink-0"
                        style={{
                            borderColor: "rgba(0,229,255,0.14)",
                            color: "#4a5568",
                            background: "rgba(7,9,15,0.4)",
                        }}
                    >
                        {hotkey}
                    </kbd>
                )}
            </div>
            
            {/* Tiny badge dot that shows when collapsed */}
            <span
                className="absolute top-1.5 left-[26px] w-1.5 h-1.5 rounded-full transition-opacity duration-200"
                style={{ 
                    background: b.fg, 
                    boxShadow: `0 0 6px ${b.fg}`,
                    opacity: collapsed && badge != null ? 1 : 0 
                }}
            />
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
            <Image src="/sidelogo.png" alt="VajraX" width={size + 8} height={size + 8} className="shrink-0 object-contain"
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
    
    // Sidebar defaults to collapsed now that the manual toggle is removed,
    // and will expand strictly on hover via isHovered.
    const [collapsed, setCollapsed] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [attendancePct, setAttendancePct] = useState<number | null>(null);
    const [attendanceEligible, setAttendanceEligible] = useState(0);
    const [attendanceAttended, setAttendanceAttended] = useState(0);

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

    // Fetch attendance stats for sidebar widget
    useEffect(() => {
        if (!user) return;
        fetch("/api/attendance/me")
            .then((r) => r.json())
            .then((d) => {
                if (d && typeof d.attendance_pct === "number") {
                    setAttendancePct(Number(d.attendance_pct));
                    setAttendanceEligible(d.sessions_eligible ?? 0);
                    setAttendanceAttended(d.sessions_attended ?? 0);
                }
            })
            .catch(() => {});
    }, [user]);

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

    const [isHovered, setIsHovered] = useState(false);

    // On mobile, sidebar is always 260px (ignore collapsed)
    const isExpanded = !collapsed || mobileOpen || isHovered;
    const sidebarWidth = isExpanded ? 260 : 68;

    return (
        <>
            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40"
                    style={{ background: "rgba(7,9,15,0.80)", backdropFilter: "blur(6px)" }}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Header Bar — hidden when sidebar is open */}
            {!mobileOpen && (
                <div 
                    className="lg:hidden fixed top-0 left-0 right-0 h-16 z-40 flex items-center justify-between px-4"
                    style={{ 
                        background: "rgba(13, 17, 23, 0.85)", 
                        backdropFilter: "blur(12px)", 
                        borderBottom: "1px solid rgba(0, 229, 255, 0.08)" 
                    }}
                >
                    <button
                        className="grid place-items-center w-10 h-10 rounded-sm"
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
                </div>
            )}

            <aside
                className={`flex flex-col fixed top-0 left-0 h-screen z-50 overflow-hidden ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                }`}
                style={{
                    width: sidebarWidth,
                    background: "#0d1117",
                    borderRight: "1px solid rgba(0,229,255,0.08)",
                    transition: "width 280ms cubic-bezier(.5,.05,.2,1), transform 280ms cubic-bezier(.5,.05,.2,1)",
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* ── Fixed Width Inner Container ───────────── */}
                <div style={{ width: 260 }} className="flex flex-col h-full shrink-0">
                    {/* ── Header ─────────────────────────────────── */}
                    <div
                        className="flex items-center shrink-0 w-full"
                        style={{
                            height: 56,
                            paddingLeft: 14, // 14px + 20px (half of 40px monogram) = 34px center
                            paddingRight: 16,
                            gap: 12,
                            borderBottom: "1px solid rgba(0,229,255,0.08)",
                        }}
                    >
                        <Monogram size={32} />
                        <div className="leading-none min-w-0 flex-1 transition-opacity duration-200" style={{ opacity: isExpanded ? 1 : 0 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <Image 
                                src="/White-WordMark-vajrax.png" 
                                alt="VajraX Wordmark" 
                                width={120}
                                height={24}
                                className="h-6 w-auto object-contain shrink-0" 
                                style={{ marginTop: 2 }}
                            />
                        </div>
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

                    {/* ── User Profile ───────────────────── */}
                    {displayName && (
                        <div className="pt-3 pb-1 shrink-0 w-full">
                            <div
                                className="rounded-md flex items-center transition-all duration-200 mx-2"
                                style={{ 
                                    height: 46,
                                    paddingLeft: 10, // 8px (mx-2) + 10px (padding) + 16px (half avatar) = 34px center
                                    background: isExpanded ? "#111820" : "transparent", 
                                    border: isExpanded ? "1px solid rgba(0,229,255,0.10)" : "1px solid transparent" 
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                                    <Tooltip label={!isExpanded ? displayName + (roleLabel ? " · " + roleLabel : "") : ""} disabled={isExpanded}>
                                        <span
                                            className="relative rounded-full overflow-hidden shrink-0 w-8 h-8"
                                            style={{ border: "1px solid rgba(0,229,255,0.45)" }}
                                        >
                                            {profile?.avatar_url ? (
                                                <Image
                                                    src={profile.avatar_url}
                                                    alt={displayName}
                                                    width={32}
                                                    height={32}
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
                                                    boxShadow: `0 0 0 1.5px ${isExpanded ? "#111820" : "#0d1117"}, 0 0 5px #22c55e`,
                                                }}
                                            />
                                        </span>
                                    </Tooltip>
                                    
                                    <div className="min-w-0 flex-1 transition-opacity duration-200" style={{ opacity: isExpanded ? 1 : 0 }}>
                                        <div
                                            className="text-[12.5px] font-medium tracking-tight truncate"
                                            style={{ color: "#f0f4ff" }}
                                        >
                                            {displayName}
                                        </div>
                                        <div
                                            className="font-mono text-[9px] uppercase tracking-[0.18em] mt-0.5 truncate"
                                            style={{ color: "#00e5ff" }}
                                        >
                                            {roleLabel}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Nav ────────────────────────────────────── */}
                    <nav className="flex-1 min-h-0 overflow-y-auto px-2 pt-1 pb-4 w-full">
                        {/* Explore */}
                        <div className="space-y-0.5">
                            {EXPLORE_ITEMS.map((item) => (
                                <NavItem
                                    key={item.href}
                                    {...item}
                                    active={isActive(item.href)}
                                    collapsed={!isExpanded}
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
                                collapsed={!isExpanded}
                            />
                        </div>

                        {/* Core */}
                        <div className="space-y-0.5 mt-2">
                            {CORE_ITEMS.map((item) => (
                                <NavItem
                                    key={item.href}
                                    {...item}
                                    active={isActive(item.href)}
                                    collapsed={!isExpanded}
                                />
                            ))}
                        </div>

                        {/* Attendance widget — shown after Request Project */}
                        {attendancePct !== null && attendanceEligible > 0 && (
                            <div
                                className="mx-2 mt-2 rounded-sm px-3 py-2.5 transition-opacity duration-200"
                                style={{
                                    border: "1px solid rgba(0,229,255,0.10)",
                                    background: "#111820",
                                    opacity: isExpanded ? 1 : 0,
                                    pointerEvents: isExpanded ? "auto" : "none",
                                }}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-mono text-[9.5px] uppercase tracking-[0.16em]" style={{ color: "#4a5568" }}>My Attendance</span>
                                    <span
                                        className="font-mono text-[10.5px] font-bold tabular-nums"
                                        style={{
                                            color: attendancePct >= 75 ? "#22c55e" : attendancePct >= 50 ? "#f59e0b" : "#ef4444",
                                        }}
                                    >
                                        {attendancePct}%
                                    </span>
                                </div>
                                {/* Progress bar */}
                                <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${Math.min(attendancePct, 100)}%`,
                                            background: attendancePct >= 75 ? "#22c55e" : attendancePct >= 50 ? "#f59e0b" : "#ef4444",
                                            boxShadow: attendancePct >= 75 ? "0 0 8px rgba(34,197,94,0.5)" : attendancePct >= 50 ? "0 0 8px rgba(245,158,11,0.5)" : "0 0 8px rgba(239,68,68,0.5)",
                                        }}
                                    />
                                </div>
                                <div className="font-mono text-[9px] text-[#4a5568] mt-1.5 tabular-nums">
                                    {attendanceAttended}/{attendanceEligible} sessions
                                </div>
                            </div>
                        )}

                        {/* Admin */}
                        {showAdmin && (
                            <>
                                <SectionTag collapsed={!isExpanded} count={visibleAdminItems.length}>
                                    admin
                                </SectionTag>
                                <div className="space-y-0.5">
                                    {visibleAdminItems.map((item) => (
                                        <NavItem
                                            key={item.href}
                                            {...item}
                                            active={isActive(item.href)}
                                            collapsed={!isExpanded}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </nav>

                    {/* ── Footer ─────────────────────────────────── */}
                    <div
                        className="shrink-0 px-2 py-3 flex flex-col gap-1 w-full"
                        style={{ borderTop: "1px solid rgba(0,229,255,0.08)" }}
                    >
                        {user?.id && (
                            <Tooltip label={!isExpanded ? "Profile Settings" : ""} disabled={isExpanded}>
                                <Link
                                    href={`/profile/${user.id}`}
                                    className="flex items-center w-full h-9 rounded-sm transition-colors group"
                                    style={{ paddingLeft: 18, paddingRight: 12 }}
                                >
                                    <Settings 
                                        size={16} 
                                        className="shrink-0 transition-colors" 
                                        style={{ color: "#8b9ab0" }}
                                    />
                                    <span 
                                        className="ml-3.5 text-[12px] font-medium tracking-tight transition-opacity duration-200" 
                                        style={{ color: "#8b9ab0", opacity: isExpanded ? 1 : 0 }}
                                    >
                                        Profile Settings
                                    </span>
                                </Link>
                            </Tooltip>
                        )}
                        <Tooltip label={!isExpanded ? "Log Out" : ""} disabled={isExpanded}>
                            <button
                                onClick={handleSignOut}
                                className="flex items-center w-full h-9 rounded-sm transition-colors group"
                                style={{ paddingLeft: 18, paddingRight: 12 }}
                            >
                                <LogOut 
                                    size={16} 
                                    className="shrink-0 transition-colors" 
                                    style={{ color: "#8b9ab0" }}
                                />
                                <span 
                                    className="ml-3.5 text-[12px] font-medium tracking-tight transition-opacity duration-200" 
                                    style={{ color: "#8b9ab0", opacity: isExpanded ? 1 : 0 }}
                                >
                                    Log Out
                                </span>
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </aside>
        </>
    );
}
