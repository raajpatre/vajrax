"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Users,
    UserRoundPlus,
    Package,
    History,
    Lock,
    ChevronLeft,
    Home,
    Activity,
    ArrowRight,
    GitBranch,
    PackageSearch,
    UserCheck,
    AlertTriangle,
    ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";

/* ── types ────────────────────────────────────────────────── */
interface DashStats {
    members: number;
    pendingApps: number;
    openRequests: number;
    activeProjects: number;
}

/* ── helpers ──────────────────────────────────────────────── */
function pad(n: number) {
    return String(n).padStart(2, "0");
}

function fmtDate(d: Date) {
    return d
        .toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        .toUpperCase();
}

/* ── Access Denied ────────────────────────────────────────── */
function AccessDenied() {
    const router = useRouter();
    return (
        <div
            className="min-h-screen grid place-items-center p-6"
            style={{ background: "#07090f" }}
        >
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 50% 100%,rgba(239,68,68,0.08),transparent)",
                }}
            />

            <div
                className="relative w-full max-w-md text-center rounded-md"
                style={{
                    background: "#0d1117",
                    border: "1px solid rgba(239,68,68,0.30)",
                    padding: "48px 40px",
                    boxShadow:
                        "0 0 0 1px rgba(239,68,68,0.08),0 32px 80px -24px rgba(0,0,0,0.9)",
                }}
            >
                {/* Corner ticks */}
                <span
                    className="absolute top-2 right-2 w-3 h-3 pointer-events-none"
                    style={{
                        borderTop: "1px solid rgba(239,68,68,0.4)",
                        borderRight: "1px solid rgba(239,68,68,0.4)",
                    }}
                />
                <span
                    className="absolute bottom-2 left-2 w-3 h-3 pointer-events-none"
                    style={{
                        borderBottom: "1px solid rgba(239,68,68,0.4)",
                        borderLeft: "1px solid rgba(239,68,68,0.4)",
                    }}
                />
                {/* Red top stripe */}
                <div
                    className="absolute inset-x-0 top-0 h-px pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(90deg,transparent,rgba(239,68,68,0.7),transparent)",
                    }}
                />

                <div
                    className="mx-auto mb-5 w-16 h-16 grid place-items-center rounded-md border"
                    style={{
                        color: "#ef4444",
                        background: "rgba(239,68,68,0.10)",
                        borderColor: "rgba(239,68,68,0.35)",
                        boxShadow: "0 0 32px -8px rgba(239,68,68,0.55)",
                    }}
                >
                    <Lock size={28} />
                </div>

                <h2
                    className="font-sans font-bold tracking-tight text-[22px]"
                    style={{ color: "#f0f4ff" }}
                >
                    Access Denied
                </h2>
                <p className="text-[14px] mt-2 leading-relaxed" style={{ color: "#8b9ab0" }}>
                    Only club leadership and faculty can access the admin panel.
                </p>

                <div className="mt-6 flex items-center justify-center gap-2">
                    <span
                        className="font-mono text-[10.5px] uppercase tracking-[0.18em]"
                        style={{ color: "#ef4444" }}
                    >
                        // ERR 403
                    </span>
                    <span
                        className="font-mono text-[10px]"
                        style={{ color: "#4a5568" }}
                    >
                        — RESTRICTED AREA
                    </span>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] transition-colors"
                        style={{
                            background: "transparent",
                            color: "#8b9ab0",
                            borderColor: "rgba(139,154,176,0.35)",
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.color = "#f0f4ff"; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = "#8b9ab0"; }}
                    >
                        <ChevronLeft size={14} /> Go back
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] transition-all"
                        style={{
                            background: "#07090f",
                            color: "#f0f4ff",
                            borderColor: "rgba(0,229,255,0.35)",
                            boxShadow: "0 0 14px -4px rgba(0,229,255,0.4)",
                        }}
                    >
                        <Home size={14} /> Return home
                    </Link>
                </div>
            </div>
        </div>
    );
}

/* ── Role bar ─────────────────────────────────────────────── */
function RoleBar({ role }: { role: string }) {
    return (
        <div
            className="flex items-center gap-3 px-4 py-2.5 mb-6 rounded-sm"
            style={{
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.22)",
            }}
        >
            <span
                className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                style={{
                    background: "#f59e0b",
                    boxShadow:
                        "0 0 0 1px rgba(245,158,11,0.4),0 0 8px rgba(245,158,11,0.6)",
                }}
            />
            <span
                className="font-mono text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "#8b9ab0" }}
            >
                You are viewing as:{" "}
                <span style={{ color: "#f59e0b" }}>{role.toUpperCase()}</span>
            </span>
        </div>
    );
}

/* ── Stat banner ──────────────────────────────────────────── */
const STAT_CONFIGS = [
    { key: "members",       label: "TOTAL MEMBERS",   Icon: Users,         color: "#00e5ff" },
    { key: "pendingApps",   label: "PENDING APPS",    Icon: UserRoundPlus, color: "#f59e0b" },
    { key: "openRequests",  label: "OPEN REQUESTS",   Icon: PackageSearch, color: "#22c55e" },
    { key: "activeProjects",label: "ACTIVE PROJECTS", Icon: GitBranch,     color: "#a78bfa" },
] as const;

function StatBanner({ stats }: { stats: DashStats }) {
    return (
        <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-px mb-8 rounded-md overflow-hidden"
            style={{
                border: "1px solid rgba(0,229,255,0.12)",
                background: "rgba(0,229,255,0.10)",
            }}
        >
            {STAT_CONFIGS.map(({ key, label, Icon, color }) => (
                <div
                    key={key}
                    className="flex items-center gap-4 px-5 py-4"
                    style={{ background: "#0d1117" }}
                >
                    <div
                        className="grid place-items-center w-10 h-10 rounded-sm flex-shrink-0"
                        style={{
                            color,
                            background: `${color}14`,
                            border: `1px solid ${color}28`,
                        }}
                    >
                        <Icon size={18} />
                    </div>
                    <div>
                        <div
                            className="font-mono tabular-nums font-semibold text-[22px] leading-none"
                            style={{ color: "#f0f4ff" }}
                        >
                            {pad(stats[key])}
                        </div>
                        <div
                            className="font-mono text-[9.5px] uppercase tracking-[0.18em] mt-1"
                            style={{ color: "#8b9ab0" }}
                        >
                            {label}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Action card ──────────────────────────────────────────── */
function ActionCard({
    icon: Icon,
    title,
    subtitle,
    note,
    accentColor,
    badge,
    href,
}: {
    icon: React.ComponentType<{ size?: number }>;
    title: string;
    subtitle: string;
    note?: string;
    accentColor: string;
    badge?: number;
    href: string;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <Link
            href={href}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative block rounded-md overflow-hidden transition-all duration-200"
            style={{
                background: "#0d1117",
                border: `1px solid ${hovered ? `${accentColor}55` : `${accentColor}22`}`,
                padding: "24px",
                transform: hovered ? "translateY(-2px)" : "translateY(0)",
                boxShadow: hovered
                    ? `0 8px 32px -8px ${accentColor}30,0 0 0 1px ${accentColor}18`
                    : "none",
            }}
        >
            {/* Corner ticks */}
            <span
                className="absolute top-2 right-2 w-3 h-3 pointer-events-none"
                style={{
                    borderTop: `1px solid ${accentColor}40`,
                    borderRight: `1px solid ${accentColor}40`,
                }}
            />
            <span
                className="absolute bottom-2 left-2 w-3 h-3 pointer-events-none"
                style={{
                    borderBottom: `1px solid ${accentColor}40`,
                    borderLeft: `1px solid ${accentColor}40`,
                }}
            />
            {/* Top accent stripe */}
            <div
                className="absolute inset-x-0 top-0 h-px pointer-events-none transition-opacity duration-200"
                style={{
                    background: `linear-gradient(90deg,transparent,${accentColor}80,transparent)`,
                    opacity: hovered ? 1 : 0.35,
                }}
            />

            {/* Icon row */}
            <div className="flex items-start justify-between mb-5">
                <div
                    className="grid place-items-center w-12 h-12 rounded-md transition-all duration-200"
                    style={{
                        background: `${accentColor}12`,
                        border: `1px solid ${accentColor}30`,
                        boxShadow: hovered ? `0 0 20px -4px ${accentColor}60` : "none",
                        color: accentColor,
                    }}
                >
                    <Icon size={22} />
                </div>
                {badge != null && badge > 0 && (
                    <span
                        className="inline-flex items-center h-6 px-2.5 rounded-sm border font-mono text-[11px] font-medium"
                        style={{
                            color: "#f59e0b",
                            background: "rgba(245,158,11,0.10)",
                            borderColor: "rgba(245,158,11,0.45)",
                        }}
                    >
                        {pad(badge)}
                    </span>
                )}
            </div>

            <div
                className="font-sans font-semibold text-[16px] tracking-tight leading-snug"
                style={{ color: "#f0f4ff" }}
            >
                {title}
            </div>
            <div className="text-[13px] mt-1.5 leading-relaxed" style={{ color: "#8b9ab0" }}>
                {subtitle}
            </div>
            {note && (
                <div
                    className="font-mono text-[10px] uppercase tracking-[0.16em] mt-3"
                    style={{ color: "#4a5568" }}
                >
                    {note}
                </div>
            )}

            <div
                className="mt-5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors duration-150"
                style={{ color: hovered ? accentColor : "#4a5568" }}
            >
                Open
                <ArrowRight
                    size={12}
                    style={{
                        transition: "transform 0.15s",
                        transform: hovered ? "translateX(3px)" : "translateX(0)",
                    }}
                />
            </div>
        </Link>
    );
}

/* ── Activity feed ────────────────────────────────────────── */
const ACTIVITY = [
    {
        type: "success" as const,
        Icon: UserCheck,
        title: "Applicant approved",
        detail: "New member granted access by president.",
        tag: "MEMBERS",
    },
    {
        type: "warning" as const,
        Icon: PackageSearch,
        title: "Low stock alert",
        detail: "IMU-9DOF below minimum threshold — 2 of 5 available.",
        tag: "INVENTORY",
    },
    {
        type: "info" as const,
        Icon: GitBranch,
        title: "New project proposal",
        detail: "Awaiting moderator review in the proposals queue.",
        tag: "PROJECTS",
    },
    {
        type: "danger" as const,
        Icon: AlertTriangle,
        title: "Equipment request pending",
        detail: "Unreviewed requests require admin action.",
        tag: "REQUESTS",
    },
    {
        type: "success" as const,
        Icon: ShieldCheck,
        title: "Inventory audit closed",
        detail: "0 variance across all tracked SKUs.",
        tag: "INVENTORY",
    },
];

const ACT_MAP = {
    info:    { c: "#00e5ff", bg: "rgba(0,229,255,0.10)",  bd: "rgba(0,229,255,0.35)"  },
    success: { c: "#22c55e", bg: "rgba(34,197,94,0.10)",  bd: "rgba(34,197,94,0.35)"  },
    warning: { c: "#f59e0b", bg: "rgba(245,158,11,0.10)", bd: "rgba(245,158,11,0.35)" },
    danger:  { c: "#ef4444", bg: "rgba(239,68,68,0.10)",  bd: "rgba(239,68,68,0.35)"  },
};

function ActivityFeed() {
    return (
        <div
            className="rounded-md overflow-hidden"
            style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.12)" }}
        >
            <div
                className="flex items-center justify-between px-4 h-10 border-b"
                style={{ borderColor: "rgba(0,229,255,0.12)" }}
            >
                <div className="flex items-center gap-2.5">
                    <Activity size={14} style={{ color: "#00e5ff" }} />
                    <span
                        className="font-mono text-[11px] uppercase tracking-[0.18em]"
                        style={{ color: "#f0f4ff" }}
                    >
                        RECENT ACTIVITY
                    </span>
                </div>
            </div>
            {ACTIVITY.map((a, i) => {
                const m = ACT_MAP[a.type];
                return (
                    <div
                        key={i}
                        className="flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors"
                        style={{ borderColor: "rgba(0,229,255,0.08)" }}
                        onMouseOver={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.025)";
                        }}
                        onMouseOut={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                    >
                        <span
                            className="mt-0.5 grid place-items-center w-8 h-8 rounded-sm flex-shrink-0"
                            style={{ color: m.c, background: m.bg, border: `1px solid ${m.bd}` }}
                        >
                            <a.Icon size={14} />
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span
                                    className="text-[13px] font-medium tracking-tight"
                                    style={{ color: "#f0f4ff" }}
                                >
                                    {a.title}
                                </span>
                                <span
                                    className="font-mono text-[9.5px] uppercase tracking-[0.12em] px-1.5 h-4 grid place-items-center rounded-sm border"
                                    style={{ color: m.c, background: m.bg, borderColor: m.bd }}
                                >
                                    {a.tag}
                                </span>
                            </div>
                            <div className="text-[12px] mt-0.5" style={{ color: "#8b9ab0" }}>
                                {a.detail}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function AdminDashboard() {
    const { isModerator, isFaculty, loading: authLoading, role, profile } = useUser();
    const supabase = useMemo(() => createClient(), []);

    const canViewLabHistory = role === "faculty" || role === "president";
    const isAdmin = isModerator || isFaculty;

    const [stats, setStats] = useState<DashStats>({
        members: 0,
        pendingApps: 0,
        openRequests: 0,
        activeProjects: 0,
    });
    const [statsLoading, setStatsLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        const [membersRes, appsRes, reqsRes, projsRes] = await Promise.all([
            supabase
                .from("profiles")
                .select("id", { count: "exact", head: true })
                .neq("display_name", "Dr. Admin"),
            fetch("/api/admin/applicants")
                .then((r) => r.json())
                .catch(() => ({ applicants: [] })),
            supabase
                .from("equipment_requests")
                .select("id", { count: "exact", head: true })
                .eq("status", "pending"),
            supabase
                .from("projects")
                .select("id", { count: "exact", head: true })
                .in("status", ["in_progress", "ongoing", "planning", "on_hold"]),
        ]);

        const pendingApplicants = Array.isArray(appsRes?.applicants)
            ? appsRes.applicants.filter((a: { status: string }) => a.status === "pending").length
            : 0;

        setStats({
            members:        membersRes.count ?? 0,
            pendingApps:    pendingApplicants,
            openRequests:   reqsRes.count ?? 0,
            activeProjects: projsRes.count ?? 0,
        });
        setStatsLoading(false);
    }, [supabase]);

    useEffect(() => {
        if (isAdmin) fetchStats();
    }, [isAdmin, fetchStats]);

    if (authLoading) return <VajraLoader fullPage />;
    if (!isAdmin) return <AccessDenied />;

    const displayRole = role?.replace(/_/g, " ").toUpperCase() ?? "ADMIN";

    const cards = [
        {
            icon: Users,
            title: "Member Management",
            subtitle: "Manage roles, tags, certifications, and member access across all sub-teams.",
            accentColor: "#00e5ff",
            href: "/admin/members",
        },
        {
            icon: UserRoundPlus,
            title: "New Applicants",
            subtitle: "Review pending signup applications and approve or reject with notes.",
            accentColor: "#f59e0b",
            badge: stats.pendingApps,
            href: "/admin/applicants",
        },
        {
            icon: Package,
            title: "Inventory Management",
            subtitle: "Add, edit, and retire equipment items. Toggle availability, manage stock levels.",
            accentColor: "#22c55e",
            href: "/admin/inventory",
        },
        ...(canViewLabHistory
            ? [
                  {
                      icon: History,
                      title: "Lab Booking History",
                      subtitle:
                          "Full audit log of equipment check-outs, returns, and condition reports.",
                      accentColor: "#38bdf8",
                      note: "// Faculty · President only",
                      href: "/admin/inventory-history",
                  },
              ]
            : []),
    ];

    return (
        <div className="min-h-screen relative" style={{ background: "#07090f" }}>
            {/* Grid bg */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            <div
                className="fixed top-0 right-0 w-[600px] h-[500px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse,rgba(0,229,255,0.05) 0%,transparent 70%)",
                }}
            />
            <div
                className="fixed bottom-0 left-64 w-[500px] h-[400px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse,rgba(167,139,250,0.04) 0%,transparent 70%)",
                }}
            />

            <div className="relative max-w-6xl mx-auto px-8 pt-10 pb-20">
                {/* Page header */}
                <div className="flex items-start justify-between gap-6 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2.5">
                            <span
                                className="h-px w-8"
                                style={{ background: "rgba(0,229,255,0.6)" }}
                            />
                            <span
                                className="font-mono text-[10.5px] uppercase tracking-[0.24em]"
                                style={{ color: "#00e5ff" }}
                            >
                                // CONTROL PANEL
                            </span>
                        </div>
                        <h1
                            className="font-sans font-black tracking-tight leading-none"
                            style={{ fontSize: 34, color: "#f0f4ff" }}
                        >
                            Admin Dashboard
                        </h1>
                        <p className="text-[14px] mt-2" style={{ color: "#8b9ab0" }}>
                            Club management and oversight.
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        <div
                            className="font-mono text-[10.5px] uppercase tracking-[0.16em]"
                            style={{ color: "#4a5568" }}
                        >
                            {fmtDate(new Date())}
                        </div>
                        <div
                            className="font-mono text-[10px] uppercase tracking-[0.14em] mt-1"
                            style={{ color: "#4a5568" }}
                        >
                            VAJRAX / ADMIN / {displayRole}
                        </div>
                    </div>
                </div>

                {/* Role bar */}
                <RoleBar role={displayRole} />

                {/* Stat banner */}
                {statsLoading ? (
                    <div
                        className="grid grid-cols-2 lg:grid-cols-4 gap-px mb-8 rounded-md overflow-hidden"
                        style={{
                            border: "1px solid rgba(0,229,255,0.12)",
                            background: "rgba(0,229,255,0.10)",
                        }}
                    >
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="px-5 py-4"
                                style={{ background: "#0d1117" }}
                            >
                                <div
                                    className="h-6 w-12 rounded-sm mb-2 animate-pulse"
                                    style={{ background: "rgba(0,229,255,0.08)" }}
                                />
                                <div
                                    className="h-3 w-20 rounded-sm animate-pulse"
                                    style={{ background: "rgba(0,229,255,0.05)" }}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <StatBanner stats={stats} />
                )}

                {/* 2×2 action grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {cards.map((c) => (
                        <ActionCard key={c.title} {...c} />
                    ))}
                </div>

                {/* Activity feed */}
                <ActivityFeed />
            </div>
        </div>
    );
}
