"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import Link from "next/link";
import {
    Clock,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Ban,
    ShoppingCart,
    ChevronRight,
    X,
    User,
} from "lucide-react";
import {
    RETURN_CONDITIONS,
    type ReturnCondition,
} from "@/lib/inventory-requests";

/* ─── Types ───────────────────────────────────────────────────────── */

interface RequestWithItem {
    id: string;
    quantity: number;
    approved_quantity: number | null;
    reason: string;
    status: string;
    status_note: string | null;
    request_type: "borrow" | "permanent";
    created_at: string;
    reviewed_at: string | null;
    approver: { display_name: string; username: string | null } | null;
    item: { name: string; category: string };
    return_units: Array<{
        id: string;
        lifecycle_status: "return_pending" | "returned";
        return_condition: ReturnCondition | null;
    }>;
}

/* ─── Config maps ─────────────────────────────────────────────────── */

const REQ_STATUS: Record<string, {
    label: string; fg: string; bg: string; bd: string; dot: string;
    Icon: React.ElementType; barBg: string;
}> = {
    pending:  { label: "PENDING",  fg: "#f59e0b", bg: "rgba(245,158,11,0.10)",  bd: "rgba(245,158,11,0.50)",  dot: "#f59e0b", Icon: Clock,        barBg: "#f59e0b" },
    approved: { label: "APPROVED", fg: "#22c55e", bg: "rgba(34,197,94,0.10)",   bd: "rgba(34,197,94,0.50)",   dot: "#22c55e", Icon: CheckCircle2, barBg: "#22c55e" },
    rejected: { label: "REJECTED", fg: "#ef4444", bg: "rgba(239,68,68,0.10)",   bd: "rgba(239,68,68,0.50)",   dot: "#ef4444", Icon: XCircle,      barBg: "#ef4444" },
    returned: { label: "RETURNED", fg: "#38bdf8", bg: "rgba(56,189,248,0.10)",  bd: "rgba(56,189,248,0.50)",  dot: "#38bdf8", Icon: RotateCcw,    barBg: "#38bdf8" },
    revoked:  { label: "REVOKED",  fg: "#8b9ab0", bg: "rgba(139,154,176,0.10)", bd: "rgba(139,154,176,0.40)", dot: "#8b9ab0", Icon: Ban,          barBg: "#4a5568" },
};

const TYPE_CONFIG: Record<string, { label: string; fg: string; bg: string; bd: string }> = {
    borrow:    { label: "BORROWING", fg: "#00e5ff", bg: "rgba(0,229,255,0.10)",   bd: "rgba(0,229,255,0.40)"   },
    permanent: { label: "PERMANENT", fg: "#a78bfa", bg: "rgba(167,139,250,0.10)", bd: "rgba(167,139,250,0.45)" },
};

const CONDITION_CONFIG: Record<string, { label: string; fg: string; bg: string; bd: string }> = {
    perfect:        { label: "PERFECT",        fg: "#22c55e", bg: "rgba(34,197,94,0.10)",  bd: "rgba(34,197,94,0.45)"  },
    partly_damaged: { label: "PARTLY DAMAGED", fg: "#f59e0b", bg: "rgba(245,158,11,0.10)", bd: "rgba(245,158,11,0.45)" },
    trash:          { label: "TRASH",          fg: "#ef4444", bg: "rgba(239,68,68,0.10)",  bd: "rgba(239,68,68,0.45)"  },
};

const CAT_COLOR: Record<string, { fg: string; bg: string; bd: string }> = {
    microcontroller: { fg: "#00e5ff", bg: "rgba(0,229,255,0.10)",   bd: "rgba(0,229,255,0.40)"  },
    motor:           { fg: "#f59e0b", bg: "rgba(245,158,11,0.10)",  bd: "rgba(245,158,11,0.40)" },
    sensor:          { fg: "#a78bfa", bg: "rgba(167,139,250,0.10)", bd: "rgba(167,139,250,0.40)"},
    battery:         { fg: "#ef4444", bg: "rgba(239,68,68,0.10)",   bd: "rgba(239,68,68,0.40)"  },
    chassis:         { fg: "#5eead4", bg: "rgba(94,234,212,0.10)",  bd: "rgba(94,234,212,0.40)" },
    tool:            { fg: "#fbbf24", bg: "rgba(251,191,36,0.10)",  bd: "rgba(251,191,36,0.40)" },
    cable:           { fg: "#f472b6", bg: "rgba(244,114,182,0.10)", bd: "rgba(244,114,182,0.40)"},
    general:         { fg: "#8b9ab0", bg: "rgba(139,154,176,0.10)", bd: "rgba(139,154,176,0.35)"},
};

const TABS = [
    { key: "all",      label: "All"      },
    { key: "pending",  label: "Pending"  },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "returned", label: "Returned" },
    { key: "revoked",  label: "Revoked"  },
];

/* ─── Helpers ─────────────────────────────────────────────────────── */

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .format(new Date(value))
        .toUpperCase();
}

function formatTime(value: string) {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
        .format(new Date(value));
}

function shortId(id: string) {
    return `REQ-${id.slice(0, 6).toUpperCase()}`;
}

function getConditionSummary(req: RequestWithItem) {
    const counts = req.return_units.reduce<Record<ReturnCondition, number>>(
        (acc, u) => {
            if (u.return_condition) acc[u.return_condition] += 1;
            return acc;
        },
        { perfect: 0, partly_damaged: 0, trash: 0 }
    );
    return RETURN_CONDITIONS.filter(c => counts[c] > 0).map(c => ({ condition: c, count: counts[c] }));
}

/* ─── Small shared components ─────────────────────────────────────── */

function CatBadge({ cat }: { cat: string }) {
    const c = CAT_COLOR[cat] ?? CAT_COLOR.general;
    return (
        <span
            className="inline-flex items-center h-[20px] px-1.5 rounded-sm border font-mono text-[9.5px] uppercase tracking-[0.12em]"
            style={{ color: c.fg, background: c.bg, borderColor: c.bd }}
        >
            {cat}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const s = REQ_STATUS[status] ?? REQ_STATUS.pending;
    const Icon = s.Icon;
    return (
        <span
            className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-sm border font-mono text-[10px] uppercase tracking-[0.12em]"
            style={{ color: s.fg, background: s.bg, borderColor: s.bd }}
        >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot, boxShadow: `0 0 6px ${s.dot}` }} />
            {s.label}
        </span>
    );
}

function TypeBadge({ type, small }: { type: string; small?: boolean }) {
    const t = TYPE_CONFIG[type] ?? TYPE_CONFIG.borrow;
    return (
        <span
            className={`inline-flex items-center rounded-sm border font-mono uppercase tracking-[0.10em] ${small ? "h-[18px] px-1.5 text-[9px]" : "h-[20px] px-1.5 text-[9.5px]"}`}
            style={{ color: t.fg, background: t.bg, borderColor: t.bd }}
        >
            {t.label}
        </span>
    );
}

/* ─── Tab strip ───────────────────────────────────────────────────── */

function MyReqTabs({ value, onChange, counts }: {
    value: string; onChange: (k: string) => void; counts: Record<string, number>;
}) {
    return (
        <div className="flex items-center gap-0 border-b overflow-x-auto" style={{ borderColor: "rgba(0,229,255,0.12)" }}>
            {TABS.map(t => {
                const active = value === t.key;
                const cnt = counts[t.key] ?? 0;
                return (
                    <button
                        key={t.key}
                        onClick={() => onChange(t.key)}
                        className="relative flex items-center gap-2 h-10 px-4 text-[12.5px] font-medium tracking-tight whitespace-nowrap transition-colors"
                        style={{ color: active ? "#f0f4ff" : "#8b9ab0" }}
                    >
                        {t.label}
                        {cnt > 0 && (
                            <span
                                className="font-mono text-[9.5px] tabular-nums px-1.5 h-[16px] grid place-items-center rounded-sm border"
                                style={{
                                    color: active ? "#00e5ff" : "#4a5568",
                                    borderColor: active ? "rgba(0,229,255,0.45)" : "rgba(0,229,255,0.12)",
                                    background: active ? "rgba(0,229,255,0.10)" : "transparent",
                                }}
                            >
                                {String(cnt).padStart(2, "0")}
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

/* ─── Request card ────────────────────────────────────────────────── */

function ReqCard({ req, onClick }: { req: RequestWithItem; onClick: (r: RequestWithItem) => void }) {
    const [hover, setHover] = useState(false);
    const s = REQ_STATUS[req.status] ?? REQ_STATUS.pending;
    const conditionSummary = getConditionSummary(req);

    return (
        <button
            onClick={() => onClick(req)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="relative w-full text-left rounded-md overflow-hidden flex transition-all"
            style={{
                background: "#0d1117",
                border: `1px solid ${hover ? "rgba(0,229,255,0.30)" : "rgba(0,229,255,0.12)"}`,
                boxShadow: hover ? "0 0 0 1px rgba(0,229,255,0.10), 0 8px 24px -14px rgba(0,0,0,0.7)" : "none",
            }}
        >
            {/* Left status bar */}
            <div
                className="w-[3px] shrink-0 self-stretch"
                style={{ background: s.barBg, boxShadow: hover ? `0 0 10px ${s.barBg}` : "none" }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0 px-4 py-3 space-y-1.5">
                {/* Row 1: ID + name + cat */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11.5px] text-[#00e5ff] tracking-[0.14em] shrink-0">
                        {shortId(req.id)}
                    </span>
                    <span className="font-sans font-semibold text-[#f0f4ff] text-[14px] tracking-tight flex-1 truncate">
                        {req.item.name}
                    </span>
                    <CatBadge cat={req.item.category} />
                </div>

                {/* Row 2: date + time + type */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10.5px] text-[#4a5568] tracking-[0.06em] tabular-nums">
                        {formatDate(req.created_at)} · {formatTime(req.created_at)}
                    </span>
                    <TypeBadge type={req.request_type} small />
                </div>

                {/* Row 3: quantities */}
                <div className="flex items-center gap-4 font-mono text-[10.5px] tracking-[0.08em]">
                    <span className="text-[#8b9ab0]">
                        Qty Requested: <span className="text-[#f0f4ff] tabular-nums">{req.quantity}</span>
                    </span>
                    <span className="text-[#8b9ab0]">
                        Qty Approved: <span className="text-[#f0f4ff] tabular-nums">
                            {req.approved_quantity != null ? req.approved_quantity : "—"}
                        </span>
                    </span>
                </div>

                {/* Row 4: status badge + reviewer */}
                <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={req.status} />
                    {req.approver && (
                        <span className="font-mono text-[10px] text-[#8b9ab0] tracking-[0.08em]">
                            Reviewed by <span className="text-[#f0f4ff]">
                                {req.approver.username ?? req.approver.display_name}
                            </span>
                        </span>
                    )}
                </div>

                {/* Row 5: admin note */}
                {req.status_note && (
                    <div
                        className="font-mono text-[10.5px] text-[#8b9ab0] italic leading-relaxed border-l-2 pl-2"
                        style={{ borderColor: "rgba(0,229,255,0.20)" }}
                    >
                        &ldquo;{req.status_note}&rdquo;
                    </div>
                )}

                {/* Row 6: return conditions */}
                {conditionSummary.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4a5568]">
                            Condition:
                        </span>
                        {conditionSummary.map(({ condition, count }) => {
                            const c = CONDITION_CONFIG[condition];
                            return c ? (
                                <span
                                    key={condition}
                                    className="inline-flex items-center h-[18px] px-1.5 rounded-sm border font-mono text-[9.5px] uppercase tracking-[0.10em]"
                                    style={{ color: c.fg, background: c.bg, borderColor: c.bd }}
                                >
                                    {c.label}{count > 1 ? ` ×${count}` : ""}
                                </span>
                            ) : null;
                        })}
                    </div>
                )}
            </div>

            {/* Right chevron */}
            <div className="flex items-center px-3">
                <ChevronRight size={14} style={{ color: hover ? "#00e5ff" : "#4a5568" }} />
            </div>
        </button>
    );
}

/* ─── Status history timeline ─────────────────────────────────────── */

interface HistoryEntry {
    status: string;
    ts: string;
    by: string;
}

function StatusTimeline({ history }: { history: HistoryEntry[] }) {
    return (
        <div className="space-y-0">
            {history.map((h, i) => {
                const s = REQ_STATUS[h.status] ?? REQ_STATUS.pending;
                const isLast = i === history.length - 1;
                const Icon = s.Icon;
                return (
                    <div key={i} className="relative pl-6">
                        <div
                            className="absolute left-[7px] top-0 bottom-0 w-px"
                            style={{ background: isLast ? "transparent" : "rgba(0,229,255,0.15)" }}
                        />
                        <div
                            className="absolute left-[3px] top-1 w-[9px] h-[9px] rounded-full border-2"
                            style={{
                                borderColor: s.dot,
                                background: i === 0 ? s.dot : "#0d1117",
                                boxShadow: i === 0 ? `0 0 8px ${s.dot}` : "none",
                            }}
                        />
                        <div className="pb-5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <StatusBadge status={h.status} />
                                <span className="font-mono text-[10.5px] text-[#4a5568] tracking-[0.06em]">{h.ts}</span>
                                <span className="font-mono text-[10.5px] text-[#8b9ab0]">· {h.by}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Request detail drawer ───────────────────────────────────────── */

function RequestDrawer({ req, open, onClose }: {
    req: RequestWithItem | null;
    open: boolean;
    onClose: () => void;
}) {
    useEffect(() => {
        if (!open) return;
        const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [open, onClose]);

    // Build a derived timeline from the request data
    const timeline: HistoryEntry[] = req ? (() => {
        const entries: HistoryEntry[] = [{
            status: "pending",
            ts: formatDate(req.created_at) + " · " + formatTime(req.created_at),
            by: "You",
        }];
        if (req.reviewed_at && req.status !== "pending") {
            entries.push({
                status: req.status,
                ts: formatDate(req.reviewed_at) + " · " + formatTime(req.reviewed_at),
                by: req.approver ? (req.approver.username ?? req.approver.display_name) : "Admin",
            });
        }
        return entries;
    })() : [];

    const conditionSummary = req ? getConditionSummary(req) : [];

    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 z-[90] backdrop-blur-sm"
                    style={{ background: "rgba(7,9,15,0.60)" }}
                    onClick={onClose}
                />
            )}
            <div
                className="fixed top-0 right-0 bottom-0 z-[91] flex flex-col w-full sm:w-[400px]"
                style={{
                    background: "#0d1117",
                    borderLeft: "1px solid rgba(0,229,255,0.18)",
                    boxShadow: "-8px 0 32px rgba(0,0,0,0.55)",
                    transform: open ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 280ms cubic-bezier(.5,.05,.2,1)",
                }}
            >
                {req && (
                    <>
                        {/* Header */}
                        <div
                            className="px-5 h-14 flex items-center gap-3 border-b shrink-0"
                            style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(7,9,15,0.60)" }}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#00e5ff]">
                                    {shortId(req.id)}
                                </div>
                                <div className="font-sans font-semibold text-[#f0f4ff] text-[14px] tracking-tight truncate">
                                    {req.item.name}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="grid place-items-center w-8 h-8 rounded-sm border text-[#8b9ab0] hover:text-[#f0f4ff] transition-colors"
                                style={{ borderColor: "rgba(0,229,255,0.14)" }}
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
                            {/* Request details */}
                            <div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#4a5568] mb-3">
                                    // REQUEST DETAILS
                                </div>
                                <div className="space-y-2">
                                    {([
                                        ["Item",       req.item.name,    null],
                                        ["Category",   null,             <CatBadge key="cat" cat={req.item.category} />],
                                        ["Qty req.",   String(req.quantity), null],
                                        ["Qty appr.",  req.approved_quantity != null ? String(req.approved_quantity) : "—", null],
                                        ["Type",       null,             <TypeBadge key="type" type={req.request_type} />],
                                        ["Submitted",  formatDate(req.created_at) + " · " + formatTime(req.created_at), null],
                                    ] as [string, string | null, React.ReactNode | null][]).map(([k, v, el]) => (
                                        <div
                                            key={k}
                                            className="flex items-center justify-between gap-4 border-b pb-2 last:border-0"
                                            style={{ borderColor: "rgba(0,229,255,0.08)" }}
                                        >
                                            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#8b9ab0] shrink-0">
                                                {k}
                                            </span>
                                            <span className="font-mono text-[11.5px] text-[#f0f4ff] tabular-nums text-right">
                                                {el ?? v}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3">
                                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4a5568] mb-1.5">
                                        REASON
                                    </div>
                                    <p className="text-[#8b9ab0] text-[12.5px] leading-relaxed italic">
                                        {req.reason}
                                    </p>
                                </div>
                            </div>

                            {/* Status history */}
                            <div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#4a5568] mb-3">
                                    // STATUS HISTORY
                                </div>
                                <StatusTimeline history={timeline} />
                            </div>

                            {/* Admin review */}
                            {(req.approver || req.status_note) && (
                                <div>
                                    <div className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#4a5568] mb-3">
                                        // ADMIN REVIEW
                                    </div>
                                    {req.approver && (
                                        <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b9ab0] mb-2">
                                            <User size={12} className="text-[#00e5ff]" />
                                            Reviewed by{" "}
                                            <span className="text-[#f0f4ff]">
                                                {req.approver.username ?? req.approver.display_name}
                                            </span>
                                        </div>
                                    )}
                                    {req.status_note && (
                                        <div
                                            className="px-3 py-2.5 rounded-sm border font-mono text-[11px] text-[#8b9ab0] italic leading-relaxed"
                                            style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(7,9,15,0.50)" }}
                                        >
                                            {req.status_note}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Return condition */}
                            {conditionSummary.length > 0 && (
                                <div>
                                    <div className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#4a5568] mb-2">
                                        // RETURN CONDITION
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {conditionSummary.map(({ condition, count }) => {
                                            const c = CONDITION_CONFIG[condition];
                                            return c ? (
                                                <span
                                                    key={condition}
                                                    className="inline-flex items-center h-[22px] px-2 rounded-sm border font-mono text-[10px] uppercase tracking-[0.12em]"
                                                    style={{ color: c.fg, background: c.bg, borderColor: c.bd }}
                                                >
                                                    {c.label}{count > 1 ? ` ×${count}` : ""}
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

/* ─── Empty state ─────────────────────────────────────────────────── */

function EmptyState({ filter }: { filter: string }) {
    return (
        <div
            className="relative border border-dashed rounded-md overflow-hidden corner-ticks"
            style={{ borderColor: "rgba(0,229,255,0.15)", background: "rgba(13,17,23,0.40)" }}
        >
            <div className="relative text-center py-16 px-6">
                <div
                    className="mx-auto w-14 h-14 grid place-items-center border rounded-md text-[#4a5568] mb-4"
                    style={{ borderColor: "rgba(0,229,255,0.18)", background: "#07090f" }}
                >
                    <ShoppingCart size={22} />
                </div>
                <h3 className="text-[#f0f4ff] font-bold text-[18px] tracking-tight">No requests yet</h3>
                <p className="text-[#8b9ab0] text-[13px] mt-1.5 max-w-[42ch] mx-auto leading-relaxed">
                    {filter !== "all"
                        ? `No ${filter} requests. Switch to "All" to see everything.`
                        : "Head to the inventory to check out equipment."}
                </p>
                <div className="mt-5">
                    <Link
                        href="/inventory"
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-all"
                        style={{ background: "#00e5ff", color: "#07090f" }}
                    >
                        <ShoppingCart size={13} /> Browse Inventory
                    </Link>
                </div>
            </div>
        </div>
    );
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function MyRequestsPage() {
    const { user, loading: userLoading } = useUser();
    const supabase = createClient();
    const [requests, setRequests] = useState<RequestWithItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("all");
    const [drawer, setDrawer] = useState<RequestWithItem | null>(null);

    const fetchRequests = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from("equipment_requests")
            .select(`
                id,
                quantity,
                approved_quantity,
                reason,
                status,
                status_note,
                request_type,
                created_at,
                reviewed_at,
                approver:profiles!equipment_requests_approved_by_fkey(display_name, username),
                item:inventory_items!equipment_requests_item_id_fkey(name, category),
                return_units:equipment_request_return_units(id, lifecycle_status, return_condition)
            `)
            .eq("requester_id", user.id)
            .order("created_at", { ascending: false });

        if (data) {
            setRequests(data.map(r => ({
                id: r.id,
                quantity: r.quantity,
                approved_quantity: r.approved_quantity,
                reason: r.reason,
                status: r.status,
                status_note: r.status_note,
                request_type: r.request_type as "borrow" | "permanent",
                created_at: r.created_at,
                reviewed_at: r.reviewed_at,
                approver: r.approver as RequestWithItem["approver"],
                item: r.item as unknown as { name: string; category: string },
                return_units: (r.return_units ?? []) as unknown as RequestWithItem["return_units"],
            })));
        }
        setLoading(false);
    }, [user, supabase]);

    useEffect(() => {
        const id = window.setTimeout(() => { if (user) void fetchRequests(); }, 0);
        return () => window.clearTimeout(id);
    }, [user, fetchRequests]);

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: requests.length };
        requests.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1; });
        return c;
    }, [requests]);

    const filtered = useMemo(
        () => tab === "all" ? requests : requests.filter(r => r.status === tab),
        [requests, tab]
    );

    if (userLoading || loading) return <VajraLoader fullPage />;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-16">
            {/* Page header */}
            <div className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                    <span className="h-px w-8" style={{ background: "rgba(0,229,255,0.6)" }} />
                    <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#00e5ff]">
                        // WORKSPACE / REQUESTS
                    </span>
                </div>
                <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="font-sans font-extrabold tracking-tight text-[#f0f4ff] leading-none" style={{ fontSize: "clamp(24px, 5vw, 36px)" }}>
                            My Requests
                        </h1>
                        <p className="text-[#8b9ab0] text-[13.5px] mt-2">
                            Track your equipment requests and their approval status.
                        </p>
                    </div>
                    <Link
                        href="/inventory"
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] text-[#8b9ab0] hover:text-[#f0f4ff] transition-all"
                        style={{ borderColor: "rgba(0,229,255,0.20)", background: "rgba(0,229,255,0.04)" }}
                    >
                        <ShoppingCart size={13} /> New Request
                    </Link>
                </div>
            </div>

            {/* Tab strip */}
            <MyReqTabs value={tab} onChange={setTab} counts={counts} />

            {/* Meta strip */}
            <div className="flex items-center justify-between my-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#8b9ab0]">
                <div className="flex items-center gap-3">
                    <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }}
                    />
                    <span>{filtered.length} of {requests.length} showing</span>
                </div>
                <span className="text-[#4a5568] hidden md:block">Click any row to view details</span>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <EmptyState filter={tab} />
            ) : (
                <div className="space-y-2">
                    {filtered.map(r => (
                        <ReqCard key={r.id} req={r} onClick={setDrawer} />
                    ))}
                </div>
            )}

            {/* Detail drawer */}
            <RequestDrawer
                req={drawer}
                open={!!drawer}
                onClose={() => setDrawer(null)}
            />
        </div>
    );
}
