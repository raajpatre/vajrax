"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { usePageSize } from "@/hooks/usePageSize";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { Paginator } from "@/components/ui/Paginator";
import {
    Users, AlertTriangle, CheckCircle2, ChevronDown,
    ChevronRight, BarChart2, ClipboardList, Search, X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

type MemberSummary = {
    member_id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    joined_at: string;
    sessions_eligible: number;
    sessions_attended: number;
    attendance_pct: number;
    is_flagged: boolean;
};

type MOMRow = {
    id: string;
    title: string;
    meeting_date: string;
    meeting_type: string;
    session_scope: string;
    attendee_ids: string[];
    counts_attendance: boolean;
};

type AttendanceRow = {
    mom_id: string;
    member_id: string;
    present: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    }).toUpperCase();
}

function getInitials(name: string) {
    return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function PctBar({ pct, flagged }: { pct: number; flagged: boolean }) {
    const color = pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
    return (
        <div className="flex items-center gap-2 w-full">
            <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
            >
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pct, 100)}%`, background: color }}
                />
            </div>
            <span
                className="font-mono text-[11px] tabular-nums w-10 text-right"
                style={{ color }}
            >
                {pct}%
            </span>
            {flagged && (
                <AlertTriangle size={12} style={{ color: "#ef4444", flexShrink: 0 }} />
            )}
        </div>
    );
}

const ROLE_LABEL: Record<string, string> = {
    faculty: "Faculty",
    president: "President",
    vice_president: "Vice Pres",
    project_manager: "Project Mgr",
    inventory_manager: "Inv Mgr",
    lead_developer: "Lead Dev",
    printing_head: "Print Head",
    social_media_head: "Social Head",
    social_media_co_head: "Social Co",
    sponsorship_head: "Sponsor Head",
    workshop_head: "Workshop Head",
    mechanics_head: "Mech Head",
    cad_head: "CAD Head",
    electronics_head: "Elec Head",
    procurement_head: "Procure Head",
    makerspace_head: "Maker Head",
    member: "Member",
};

// ─── CircuitTrace decoration ──────────────────────────────────
function CircuitTrace({ which = 0, className = "", style }: { which?: number; className?: string; style?: React.CSSProperties }) {
    const paths = [
        { viewBox: "0 0 600 400", d: ["M 0 200 L 120 200 L 140 220 L 280 220 L 300 240 L 600 240", "M 80 200 L 80 60  M 240 220 L 240 100", "M 380 240 L 380 360"], nodes: [[120, 200], [280, 220], [80, 60], [240, 100], [380, 360]] as [number, number][] },
        { viewBox: "0 0 500 400", d: ["M 500 80 L 380 80 L 360 100 L 220 100 L 200 120 L 80 120 L 0 120", "M 360 100 L 360 240", "M 200 120 L 200 300 L 0 300", "M 100 120 L 100 60"], nodes: [[380, 80], [220, 100], [80, 120], [360, 240], [200, 300], [100, 60]] as [number, number][] },
    ];
    const p = paths[which % paths.length];
    return (
        <svg className={className} style={style} viewBox={p.viewBox} preserveAspectRatio="none" fill="none" stroke="#00e5ff" strokeWidth="1.2">
            {p.d.map((d, i) => <path key={i} d={d} />)}
            {p.nodes.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2.5" fill="#00e5ff" />)}
        </svg>
    );
}

// ─── Main Component ───────────────────────────────────────────

export default function AttendanceClient({
    summary,
    moms,
    attendanceRows,
}: {
    summary: MemberSummary[];
    moms: MOMRow[];
    attendanceRows: AttendanceRow[];
}) {
    const [tab, setTab] = useState<"members" | "sessions">("members");
    const [search, setSearch] = useState("");
    const [filterFlagged, setFilterFlagged] = useState(false);
    const [expandedMember, setExpandedMember] = useState<string | null>(null);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);

    // Build lookup: momId → Map<memberId, present>
    const rowLookup = useMemo(() => {
        const map = new Map<string, Map<string, boolean>>();
        for (const row of attendanceRows) {
            if (!map.has(row.mom_id)) map.set(row.mom_id, new Map());
            map.get(row.mom_id)!.set(row.member_id, row.present);
        }
        return map;
    }, [attendanceRows]);

    // Build member lookup
    const memberMap = useMemo(() => {
        const m = new Map<string, MemberSummary>();
        for (const s of summary) m.set(s.member_id, s);
        return m;
    }, [summary]);

    const filtered = useMemo(() => {
        return summary.filter((m) => {
            if (filterFlagged && !m.is_flagged) return false;
            if (search && !m.display_name.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [summary, filterFlagged, search]);

    const totalSessions = moms.length;
    const flaggedCount = summary.filter((m) => m.is_flagged).length;
    const avgPct = summary.length > 0
        ? Math.round(summary.reduce((s, m) => s + Number(m.attendance_pct), 0) / summary.length)
        : 100;

    const pageSize = usePageSize({ desktop: 20, mobile: 12 });
    const { pageItems: paginatedMembers, page: memberPage, totalPages: memberTotalPages, setPage: setMemberPage } = usePaginatedList(filtered, pageSize);
    const { pageItems: paginatedSessions, page: sessionPage, totalPages: sessionTotalPages, setPage: setSessionPage } = usePaginatedList(moms, pageSize);

    useEffect(() => setMemberPage(1), [search, filterFlagged, setMemberPage]);

    const handleTabChange = (t: "members" | "sessions") => {
        setTab(t);
        setMemberPage(1);
        setSessionPage(1);
    };

    return (
        <div className="relative min-h-screen bg-[#07090f] overflow-hidden pt-[calc(var(--nav-height,0px)+2.5rem)] pb-24">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none animate-grid-pan" style={{ backgroundImage: "linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px),linear-gradient(90deg, rgba(0,229,255,0.04) 1px,transparent 1px)", backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 90%)", WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 90%)" }} />
            <div className="absolute -bottom-32 -left-32 w-[640px] h-[640px] pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(0,229,255,0.13) 0%, transparent 70%)" }} />
            <div className="absolute -top-40 -right-40 w-[560px] h-[560px] pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)" }} />
            <div className="absolute inset-0 pointer-events-none scanline animate-scanline-pan opacity-50 z-0" />
            <div className="absolute top-[6%] right-[-4%] w-[42vw] h-[40vh] pointer-events-none z-0" style={{ opacity: 0.05 }}>
                <CircuitTrace which={0} className="w-full h-full" />
            </div>
            <div className="absolute bottom-[12%] left-[-4%] w-[36vw] h-[44vh] pointer-events-none z-0" style={{ opacity: 0.05 }}>
                <CircuitTrace which={1} className="w-full h-full" />
            </div>

            <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-8">
                {/* ── Header ── */}
                <div className="mb-8">
                    <h1 className="font-sans font-extrabold text-[#f0f4ff] text-[32px] tracking-tight flex items-center gap-3">
                        <BarChart2 size={28} style={{ color: "#00e5ff" }} />
                        Attendance Tracker
                    </h1>
                    <p className="text-[#8b9ab0] text-[13px] mt-1.5">
                        Track member attendance across all mandatory sessions.
                    </p>
                </div>

                {/* ── Summary Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    {[
                        { label: "Total Members", value: summary.length, color: "#00e5ff", icon: Users },
                        { label: "Sessions Held", value: totalSessions, color: "#a78bfa", icon: ClipboardList },
                        { label: "Avg Attendance", value: `${avgPct}%`, color: "#22c55e", icon: CheckCircle2 },
                        { label: "Flagged (<75%)", value: flaggedCount, color: "#ef4444", icon: AlertTriangle },
                    ].map(({ label, value, color, icon: Icon }) => (
                        <div
                            key={label}
                            className="rounded-sm px-4 py-4"
                            style={{ border: "1px solid rgba(0,229,255,0.10)", background: "#0d1117" }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#4a5568]">{label}</span>
                                <Icon size={13} style={{ color }} />
                            </div>
                            <div className="font-sans font-extrabold text-[28px] tracking-tight" style={{ color }}>
                                {value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Tabs ── */}
                <div className="flex items-center gap-1 mb-5 p-1 rounded-sm w-fit" style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.10)" }}>
                    {(["members", "sessions"] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => handleTabChange(t)}
                            className="h-8 px-4 rounded-sm font-mono text-[10.5px] uppercase tracking-[0.14em] transition-all"
                            style={{
                                background: tab === t ? "#00e5ff" : "transparent",
                                color: tab === t ? "#07090f" : "#8b9ab0",
                            }}
                        >
                            {t === "members" ? "By Member" : "By Session"}
                        </button>
                    ))}
                </div>

                {/* ── Members Tab ── */}
                {tab === "members" && (
                    <>
                        {/* Filter bar */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative flex-1 max-w-xs">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4a5568" }} />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search member…"
                                    className="w-full h-9 rounded-sm border bg-[#0d1117] pl-9 pr-3 text-[12.5px] text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none focus:border-[#00e5ff] transition-colors"
                                    style={{ borderColor: "rgba(0,229,255,0.15)" }}
                                />
                                {search && (
                                    <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-[#f0f4ff]">
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setFilterFlagged((v) => !v)}
                                className="h-9 px-4 rounded-sm font-mono text-[10.5px] uppercase tracking-[0.14em] flex items-center gap-2 transition-all"
                                style={{
                                    border: filterFlagged ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(0,229,255,0.15)",
                                    background: filterFlagged ? "rgba(239,68,68,0.10)" : "#0d1117",
                                    color: filterFlagged ? "#ef4444" : "#8b9ab0",
                                }}
                            >
                                <AlertTriangle size={11} />
                                Flagged only
                            </button>
                        </div>

                        {/* Table */}
                        <div className="rounded-sm overflow-hidden" style={{ border: "1px solid rgba(0,229,255,0.10)", background: "#0d1117" }}>
                            {/* Header */}
                            <div
                                className="grid gap-4 px-5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-[#4a5568]"
                                style={{ gridTemplateColumns: "1fr 80px 80px 160px", background: "#07090f", borderBottom: "1px solid rgba(0,229,255,0.08)" }}
                            >
                                <span>Member</span>
                                <span className="text-center">Attended</span>
                                <span className="text-center">Eligible</span>
                                <span>Attendance</span>
                            </div>

                            {filtered.length === 0 && (
                                <div className="px-5 py-10 text-center font-mono text-[12px] text-[#4a5568]">
                                    No members match your filter.
                                </div>
                            )}

                            {paginatedMembers.map((m) => {
                                const isExpanded = expandedMember === m.member_id;
                                // Get per-session history for this member
                                const history = moms.map((mom) => {
                                    const momRows = rowLookup.get(mom.id);
                                    const hasRow = momRows?.has(m.member_id) ?? false;
                                    const present = momRows?.get(m.member_id) ?? false;
                                    const applicable = hasRow;
                                    return { mom, present, applicable };
                                }).filter((h) => h.applicable);

                                return (
                                    <div key={m.member_id} style={{ borderBottom: "1px solid rgba(0,229,255,0.06)" }}>
                                        {/* Row */}
                                        <button
                                            type="button"
                                            onClick={() => setExpandedMember(isExpanded ? null : m.member_id)}
                                            className="w-full grid gap-4 px-5 py-3 transition-colors text-left"
                                            style={{
                                                gridTemplateColumns: "1fr 80px 80px 160px",
                                                background: isExpanded ? "rgba(0,229,255,0.04)" : "transparent",
                                            }}
                                            onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "rgba(0,229,255,0.02)"; }}
                                            onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                                        >
                                            {/* Member info */}
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span
                                                    className="relative rounded-full overflow-hidden shrink-0 w-8 h-8"
                                                    style={{ border: `1px solid ${m.is_flagged ? "rgba(239,68,68,0.5)" : "rgba(0,229,255,0.3)"}` }}
                                                >
                                                    {m.avatar_url ? (
                                                        <Image src={m.avatar_url} alt={m.display_name} width={32} height={32} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="grid place-items-center w-full h-full font-mono text-[10px]" style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff" }}>
                                                            {getInitials(m.display_name)}
                                                        </span>
                                                    )}
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[13px] font-medium truncate" style={{ color: "#f0f4ff" }}>{m.display_name}</span>
                                                        {m.is_flagged && (
                                                            <AlertTriangle size={11} style={{ color: "#ef4444", flexShrink: 0 }} />
                                                        )}
                                                    </div>
                                                    <div className="font-mono text-[9.5px] uppercase tracking-[0.10em]" style={{ color: "#4a5568" }}>
                                                        {ROLE_LABEL[m.role] ?? m.role}
                                                    </div>
                                                </div>
                                                <ChevronDown
                                                    size={13}
                                                    className="ml-auto shrink-0 transition-transform"
                                                    style={{ color: "#4a5568", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                                                />
                                            </div>
                                            <span className="font-mono text-[13px] tabular-nums text-center self-center" style={{ color: "#f0f4ff" }}>
                                                {m.sessions_attended}
                                            </span>
                                            <span className="font-mono text-[13px] tabular-nums text-center self-center" style={{ color: "#8b9ab0" }}>
                                                {m.sessions_eligible}
                                            </span>
                                            <div className="self-center">
                                                <PctBar pct={Number(m.attendance_pct)} flagged={m.is_flagged} />
                                            </div>
                                        </button>

                                        {/* Expanded history */}
                                        {isExpanded && (
                                            <div className="px-5 pb-4 pt-1" style={{ borderTop: "1px solid rgba(0,229,255,0.06)", background: "rgba(0,229,255,0.02)" }}>
                                                <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#4a5568] mb-2">Session History</div>
                                                {history.length === 0 ? (
                                                    <p className="text-[12px] text-[#4a5568]">No sessions yet for this member.</p>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {history.map(({ mom, present }) => (
                                                            <div
                                                                key={mom.id}
                                                                className="flex items-center gap-3 rounded-sm px-3 py-1.5"
                                                                style={{ border: "1px solid rgba(0,229,255,0.06)", background: "#07090f" }}
                                                            >
                                                                <span
                                                                    className="w-2 h-2 rounded-full shrink-0"
                                                                    style={{ background: present ? "#22c55e" : "#ef4444", boxShadow: present ? "0 0 6px #22c55e" : "0 0 6px #ef4444" }}
                                                                />
                                                                <span className="flex-1 text-[12px] truncate" style={{ color: "#c8d3e0" }}>{mom.title}</span>
                                                                <span className="font-mono text-[10px] shrink-0" style={{ color: "#4a5568" }}>{fmtDate(mom.meeting_date)}</span>
                                                                <span
                                                                    className="font-mono text-[9.5px] uppercase tracking-[0.10em] shrink-0"
                                                                    style={{ color: present ? "#22c55e" : "#ef4444" }}
                                                                >
                                                                    {present ? "Present" : "Absent"}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            
                            {filtered.length > 0 && (
                                <div className="px-5 py-3">
                                    <Paginator page={memberPage} totalPages={memberTotalPages} onPageChange={setMemberPage} />
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── Sessions Tab ── */}
                {tab === "sessions" && (
                    <div className="rounded-sm overflow-hidden" style={{ border: "1px solid rgba(0,229,255,0.10)", background: "#0d1117" }}>
                        {moms.length === 0 && (
                            <div className="px-5 py-10 text-center font-mono text-[12px] text-[#4a5568]">
                                No sessions recorded yet.
                            </div>
                        )}
                        {paginatedSessions.map((mom) => {
                            const isExpanded = expandedSession === mom.id;
                            const momRows = rowLookup.get(mom.id) ?? new Map<string, boolean>();
                            const presentCount = [...momRows.values()].filter(Boolean).length;
                            const totalCount = momRows.size;
                            const sessionPct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

                            return (
                                <div key={mom.id} style={{ borderBottom: "1px solid rgba(0,229,255,0.06)" }}>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedSession(isExpanded ? null : mom.id)}
                                        className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors"
                                        style={{ background: isExpanded ? "rgba(0,229,255,0.04)" : "transparent" }}
                                        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "rgba(0,229,255,0.02)"; }}
                                        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = isExpanded ? "rgba(0,229,255,0.04)" : "transparent"; }}
                                    >
                                        {/* Date block */}
                                        <div className="shrink-0 w-14 text-center">
                                            <div className="font-mono text-[18px] font-bold text-[#f0f4ff] leading-none">
                                                {new Date(mom.meeting_date).getDate().toString().padStart(2, "0")}
                                            </div>
                                            <div className="font-mono text-[9px] text-[#00e5ff] uppercase tracking-[0.12em] mt-0.5">
                                                {new Date(mom.meeting_date).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}
                                            </div>
                                        </div>
                                        <span className="w-px h-10 shrink-0" style={{ background: "rgba(0,229,255,0.10)" }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                <span className="text-[14px] font-semibold truncate" style={{ color: "#f0f4ff" }}>{mom.title}</span>
                                                <span
                                                    className="font-mono text-[9px] uppercase tracking-[0.12em] px-1.5 rounded-sm"
                                                    style={{ background: mom.session_scope === "closed_session" ? "rgba(167,139,250,0.12)" : "rgba(0,229,255,0.10)", color: mom.session_scope === "closed_session" ? "#a78bfa" : "#00e5ff", border: `1px solid ${mom.session_scope === "closed_session" ? "rgba(167,139,250,0.3)" : "rgba(0,229,255,0.25)"}` }}
                                                >
                                                    {mom.session_scope === "closed_session" ? "Closed" : "Open"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <PctBar pct={sessionPct} flagged={false} />
                                                <span className="font-mono text-[10px] tabular-nums shrink-0" style={{ color: "#4a5568" }}>
                                                    {presentCount}/{totalCount}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight
                                            size={14}
                                            className="shrink-0 transition-transform"
                                            style={{ color: "#4a5568", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                                        />
                                    </button>

                                    {/* Expanded session detail */}
                                    {isExpanded && (
                                        <div className="px-5 pb-4 pt-2" style={{ borderTop: "1px solid rgba(0,229,255,0.06)", background: "rgba(0,229,255,0.02)" }}>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                                {[...momRows.entries()].map(([memberId, present]) => {
                                                    const member = memberMap.get(memberId);
                                                    if (!member) return null;
                                                    return (
                                                        <div
                                                            key={memberId}
                                                            className="flex items-center gap-2 rounded-sm px-2.5 py-1.5"
                                                            style={{ border: "1px solid rgba(0,229,255,0.06)", background: "#07090f" }}
                                                        >
                                                            <span
                                                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                                                style={{ background: present ? "#22c55e" : "#ef4444" }}
                                                            />
                                                            <span className="relative w-6 h-6 rounded-full overflow-hidden shrink-0" style={{ border: "1px solid rgba(0,229,255,0.2)" }}>
                                                                {member.avatar_url ? (
                                                                    <Image src={member.avatar_url} alt={member.display_name} width={24} height={24} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="grid place-items-center w-full h-full font-mono text-[8px]" style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff" }}>
                                                                        {getInitials(member.display_name)}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="text-[11.5px] truncate flex-1" style={{ color: present ? "#f0f4ff" : "#4a5568" }}>{member.display_name}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        
                        {moms.length > 0 && (
                            <div className="px-5 py-3">
                                <Paginator page={sessionPage} totalPages={sessionTotalPages} onPageChange={setSessionPage} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
