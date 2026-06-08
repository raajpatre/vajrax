"use client";

import { useState, useEffect, useCallback, useTransition, useMemo } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import {
    ShieldOff,
    Loader2,
    X,
    RotateCcw,
    CheckCircle2,
    XCircle,
    ExternalLink,
    RefreshCw,
    ShoppingCart,
    ClipboardList,
    MessageSquare,
    CheckCheck,
    Minus,
    Plus,
    AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
    logBorrowedEquipmentReturns,
    reviewEquipmentRequest,
    reviewEquipmentCart,
} from "@/actions/equipment-requests";
import { syncInventorySheetsToGoogleSheets } from "@/actions/inventory-history";
import {
    RETURN_CONDITIONS,
    GIVING_CONDITIONS,
    CONDITION_COLORS,
    getConditionLabel,
    getReturnConditionLabel,
    type GivingCondition,
    type ReturnCondition,
} from "@/lib/inventory-requests";

/* ── Types ───────────────────────────────────────────────── */

interface RequestDetail {
    id: string;
    quantity: number;
    approved_quantity: number | null;
    reviewed_at: string | null;
    reason: string;
    status: string;
    status_note: string | null;
    request_type: "borrow" | "permanent";
    created_at: string;
    item: { id: string; name: string; category: string; available_quantity: number; is_consumable: boolean };
    requester: { id: string; display_name: string; avatar_url: string | null; username: string | null };
    return_units: Array<{
        id: string;
        unit_index: number;
        lifecycle_status: "return_pending" | "returned";
        giving_condition: ReturnCondition | null;
        return_condition: ReturnCondition | null;
    }>;
}

interface HistoryEntry {
    id: string;
    status: "approved" | "rejected" | "returned";
    reviewed_at: string | null;
    item: { name: string } | null;
    requester: { display_name: string; username: string | null } | null;
    approver: { display_name: string } | null;
}

interface CartDetail {
    id: string;
    reason: string;
    status: string;
    status_note: string | null;
    created_at: string;
    requester: { id: string; display_name: string; avatar_url: string | null; username: string | null };
    items: Array<{
        id: string;
        quantity: number;
        request_type: "borrow" | "permanent";
        item_status: string;
        approved_quantity: number | null;
        admin_note: string | null;
        item: { id: string; name: string; category: string; available_quantity: number; is_consumable: boolean };
    }>;
}

/* ── Config maps ─────────────────────────────────────────── */

const REQ_STATUS: Record<string, { fg: string; bg: string; bd: string; dot: string; label: string }> = {
    pending:            { fg: "#f59e0b", bg: "rgba(245,158,11,0.10)",  bd: "rgba(245,158,11,0.45)",  dot: "#f59e0b", label: "PENDING"  },
    approved:           { fg: "#22c55e", bg: "rgba(34,197,94,0.10)",   bd: "rgba(34,197,94,0.45)",   dot: "#22c55e", label: "APPROVED" },
    partially_approved: { fg: "#38bdf8", bg: "rgba(56,189,248,0.10)",  bd: "rgba(56,189,248,0.45)",  dot: "#38bdf8", label: "PARTIAL"  },
    rejected:           { fg: "#ef4444", bg: "rgba(239,68,68,0.10)",   bd: "rgba(239,68,68,0.45)",   dot: "#ef4444", label: "REJECTED" },
    returned:           { fg: "#5eead4", bg: "rgba(94,234,212,0.10)",  bd: "rgba(94,234,212,0.45)",  dot: "#5eead4", label: "RETURNED" },
    revoked:            { fg: "#4a5568", bg: "rgba(74,85,104,0.18)",   bd: "rgba(74,85,104,0.55)",   dot: "#4a5568", label: "REVOKED"  },
};

const TYPE_CFG: Record<string, { fg: string; bg: string; bd: string }> = {
    borrow:    { fg: "#38bdf8", bg: "rgba(56,189,248,0.10)",  bd: "rgba(56,189,248,0.40)"  },
    permanent: { fg: "#a78bfa", bg: "rgba(167,139,250,0.10)", bd: "rgba(167,139,250,0.40)" },
};

const COND_COLORS: Record<string, string> = CONDITION_COLORS;

const CAT_CFG: Record<string, { fg: string; bd: string }> = {
    sensor:          { fg: "#38bdf8", bd: "rgba(56,189,248,0.40)"  },
    microcontroller: { fg: "#a78bfa", bd: "rgba(167,139,250,0.40)" },
    motor:           { fg: "#22c55e", bd: "rgba(34,197,94,0.40)"   },
    battery:         { fg: "#f59e0b", bd: "rgba(245,158,11,0.40)"  },
    chassis:         { fg: "#00e5ff", bd: "rgba(0,229,255,0.40)"   },
    tool:            { fg: "#8b9ab0", bd: "rgba(139,154,176,0.40)" },
    cable:           { fg: "#5eead4", bd: "rgba(94,234,212,0.40)"  },
    general:         { fg: "#8b9ab0", bd: "rgba(139,154,176,0.40)" },
};

/* ── Atoms ───────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
    const c = REQ_STATUS[status] ?? REQ_STATUS.pending;
    return (
        <span className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-sm border font-mono text-[10.5px] uppercase tracking-[0.11em] font-medium shrink-0"
            style={{ color: c.fg, background: c.bg, borderColor: c.bd }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot, boxShadow: `0 0 5px ${c.dot}` }} />
            {c.label}
        </span>
    );
}

function TypeBadge({ type }: { type: string }) {
    const c = TYPE_CFG[type] ?? TYPE_CFG.borrow;
    return (
        <span className="inline-flex items-center h-[20px] px-1.5 rounded-sm border font-mono text-[9.5px] uppercase tracking-[0.12em] shrink-0"
            style={{ color: c.fg, background: c.bg, borderColor: c.bd }}>
            {type}
        </span>
    );
}

function CatBadge({ cat }: { cat: string }) {
    const c = CAT_CFG[cat.toLowerCase()] ?? { fg: "#8b9ab0", bd: "rgba(139,154,176,0.40)" };
    return (
        <span className="inline-flex items-center h-[20px] px-1.5 rounded-sm border font-mono text-[9.5px] uppercase tracking-[0.10em] shrink-0"
            style={{ color: c.fg, background: `${c.fg}12`, borderColor: c.bd }}>
            {cat}
        </span>
    );
}

function CondBadge({ cond, prefix }: { cond: string; prefix?: string }) {
    const col = COND_COLORS[cond.toLowerCase()] ?? "#8b9ab0";
    const label = (RETURN_CONDITIONS as readonly string[]).includes(cond)
        ? getConditionLabel(cond as ReturnCondition)
        : cond;
    return (
        <span className="inline-flex items-center gap-1 h-[20px] px-1.5 rounded-sm border font-mono text-[9.5px] uppercase tracking-[0.10em]"
            style={{ color: col, background: `${col}18`, borderColor: `${col}70` }}>
            {prefix ? `${prefix} ${label}` : label}
        </span>
    );
}

function MiniAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
    const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return (
        <div className="shrink-0 w-8 h-8 rounded-full grid place-items-center font-mono text-[11px] font-bold overflow-hidden"
            style={{ background: "rgba(0,229,255,0.10)", border: "1.5px solid rgba(0,229,255,0.40)", color: "#00e5ff" }}>
            {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : initials}
        </div>
    );
}

/* ── Modal shell ─────────────────────────────────────────── */

function ModalShell({ open, onClose, title, subtitle, width = "max-w-lg", children, footer }: {
    open: boolean; onClose: () => void; title: string; subtitle?: string; width?: string;
    children: React.ReactNode; footer?: React.ReactNode;
}) {
    const portalTarget = typeof document === "undefined" ? null : document.body;
    if (!open || !portalTarget) return null;
    return createPortal(
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 backdrop-blur-md" style={{ background: "rgba(7,9,15,0.75)" }} onClick={onClose} />
            <div className="absolute inset-0 grid place-items-center p-6 pointer-events-none">
                <div className={`relative w-full ${width} pointer-events-auto rounded-md overflow-hidden`}
                    style={{ background: "rgba(17,24,32,0.97)", border: "1px solid rgba(0,229,255,0.28)", boxShadow: "0 0 0 1px rgba(0,229,255,0.06),0 32px 80px -16px rgba(0,0,0,0.95)" }}>
                    <div className="absolute inset-x-0 top-0 h-px pointer-events-none" style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.6),transparent)" }} />
                    <div className="px-5 h-12 flex items-center justify-between border-b" style={{ borderColor: "rgba(0,229,255,0.12)" }}>
                        <div className="flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00e5ff" }} />
                            <div>
                                <div className="text-[14px] font-semibold leading-tight" style={{ color: "#f0f4ff" }}>{title}</div>
                                {subtitle && <div className="font-mono text-[10px] uppercase tracking-[0.14em] mt-0.5" style={{ color: "#8b9ab0" }}>{subtitle}</div>}
                            </div>
                        </div>
                        <button onClick={onClose} className="grid place-items-center w-7 h-7 border rounded-sm transition-colors"
                            style={{ borderColor: "rgba(0,229,255,0.20)", color: "#8b9ab0" }}>
                            <X size={14} />
                        </button>
                    </div>
                    <div className="p-5">{children}</div>
                    {footer && (
                        <div className="px-5 h-14 flex items-center justify-end gap-2 border-t"
                            style={{ borderColor: "rgba(0,229,255,0.10)", background: "rgba(7,9,15,0.40)" }}>
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        portalTarget
    );
}

/* ── Giving-condition picker (one row per handed-out unit) ─── */

function normalizeConditions(values: GivingCondition[], count: number): GivingCondition[] {
    return Array.from({ length: count }, (_, i) => values[i] ?? "perfect");
}

function GivingConditionRows({ count, values, onChange }: {
    count: number; values: GivingCondition[]; onChange: (next: GivingCondition[]) => void;
}) {
    if (count <= 0) return null;
    const setAt = (i: number, c: GivingCondition) => {
        const next = normalizeConditions(values, count);
        next[i] = c;
        onChange(next);
    };
    return (
        <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "#8b9ab0" }}>
                <span style={{ color: "rgba(0,229,255,0.70)" }}>$</span> Handout Condition
            </div>
            <div className="space-y-1.5">
                {Array.from({ length: count }).map((_, i) => {
                    const cur = values[i] ?? "perfect";
                    return (
                        <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-sm border" style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(0,229,255,0.03)" }}>
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em]" style={{ color: "#8b9ab0" }}>Unit {String(i + 1).padStart(2, "0")}</span>
                            <div className="flex gap-1.5 flex-wrap">
                                {GIVING_CONDITIONS.map(c => {
                                    const active = cur === c;
                                    const col = COND_COLORS[c] ?? "#8b9ab0";
                                    return (
                                        <button key={c} type="button" onClick={() => setAt(i, c)}
                                            className="h-7 px-2.5 rounded-sm border font-mono text-[9.5px] uppercase tracking-[0.10em] transition-all"
                                            style={active ? { color: col, background: `${col}18`, borderColor: col } : { color: "#4a5568", background: "transparent", borderColor: "rgba(74,85,104,0.40)" }}>
                                            {getConditionLabel(c)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Review Modal ────────────────────────────────────────── */

function ReviewModal({ request, onClose, onReviewed }: { request: RequestDetail; onClose: () => void; onReviewed: () => Promise<void> }) {
    const [approvedQty, setApprovedQty] = useState(request.quantity);
    const needsGiving = request.request_type === "borrow" && !request.item.is_consumable;
    const [givingConds, setGivingConds] = useState<GivingCondition[]>(() =>
        Array.from({ length: request.quantity }, () => "perfect" as GivingCondition)
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const unapproved = Math.max(request.quantity - approvedQty, 0);
    const isPartial = approvedQty < request.quantity && approvedQty > 0;

    const submit = async () => {
        setLoading(true);
        setError(null);
        const result = await reviewEquipmentRequest({
            requestId: request.id,
            action: "approved",
            approvedQuantity: approvedQty,
            givingConditions: needsGiving ? normalizeConditions(givingConds, approvedQty) : undefined,
        });
        if (!result.ok) { setError(result.error); setLoading(false); return; }
        await onReviewed();
        setLoading(false);
        onClose();
    };

    return (
        <ModalShell open title="Review Request" subtitle={`REQ-${request.id.slice(0, 6).toUpperCase()}`} onClose={onClose}
            footer={<>
                <button onClick={onClose} className="inline-flex items-center h-9 px-3.5 rounded-sm border font-medium text-[13px]" style={{ color: "#8b9ab0", borderColor: "rgba(139,154,176,0.30)" }}>Cancel</button>
                <button onClick={submit} disabled={loading || approvedQty < 1}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] disabled:opacity-60"
                    style={{ color: "#22c55e", background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.45)" }}>
                    {loading ? <><Loader2 size={14} className="animate-spin" />Working…</> : <><CheckCircle2 size={14} />Confirm Approval</>}
                </button>
            </>}>
            <div className="space-y-4">
                <div className="flex items-center justify-between px-4 py-3 rounded-sm" style={{ background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.15)" }}>
                    <div>
                        <div className="font-sans font-semibold text-[14px]" style={{ color: "#f0f4ff" }}>{request.item.name}</div>
                        <div className="flex items-center gap-2 mt-1"><CatBadge cat={request.item.category} /><TypeBadge type={request.request_type} /></div>
                    </div>
                    <div className="text-right">
                        <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "#4a5568" }}>Requested</div>
                        <div className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: "#f0f4ff" }}>{String(request.quantity).padStart(2, "0")}</div>
                    </div>
                </div>
                {error && <div className="rounded-sm border px-4 py-3 font-mono text-[12px]" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.35)", color: "#ef4444" }}>{error}</div>}
                <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "#8b9ab0" }}><span style={{ color: "rgba(0,229,255,0.70)" }}>$</span> Qty to Approve</div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setApprovedQty(q => Math.max(0, q - 1))} className="w-9 h-9 rounded-sm border grid place-items-center transition-all" style={{ borderColor: "rgba(0,229,255,0.20)", color: "#8b9ab0" }}><Minus size={14} /></button>
                        <span className="font-mono text-[22px] font-semibold tabular-nums w-10 text-center" style={{ color: "#f0f4ff" }}>{approvedQty}</span>
                        <button onClick={() => setApprovedQty(q => Math.min(request.quantity, q + 1))} className="w-9 h-9 rounded-sm border grid place-items-center transition-all" style={{ borderColor: "rgba(0,229,255,0.20)", color: "#8b9ab0" }}><Plus size={14} /></button>
                        <div className="font-mono text-[10.5px]" style={{ color: "#4a5568" }}>/ {request.quantity} max</div>
                    </div>
                    {isPartial && (
                        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10.5px]" style={{ color: "#f59e0b" }}>
                            <AlertTriangle size={11} /> Partial approval — {unapproved} unit(s) not approved
                        </div>
                    )}
                </div>
                {needsGiving && approvedQty > 0 && (
                    <GivingConditionRows count={approvedQty} values={givingConds} onChange={setGivingConds} />
                )}
            </div>
        </ModalShell>
    );
}

/* ── Return Modal ────────────────────────────────────────── */

function ReturnModal({ request, onClose, onLogged }: { request: RequestDetail; onClose: () => void; onLogged: () => Promise<void> }) {
    const pendingUnits = request.return_units.filter(u => u.lifecycle_status === "return_pending");
    const [selections, setSelections] = useState<Record<string, ReturnCondition | "">>(() =>
        Object.fromEntries(pendingUnits.map(u => [u.id, "" as const]))
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const selectedReturns = pendingUnits
        .map(u => { const c = selections[u.id]; return c ? { unitId: u.id, condition: c as ReturnCondition } : null; })
        .filter(Boolean) as { unitId: string; condition: ReturnCondition }[];

    const submit = async () => {
        setLoading(true);
        setError(null);
        const result = await logBorrowedEquipmentReturns({ requestId: request.id, returns: selectedReturns });
        if (!result.ok) { setError(result.error); setLoading(false); return; }
        await onLogged();
        setLoading(false);
        onClose();
    };

    return (
        <ModalShell open title="Log Returns" subtitle={request.item.name} onClose={onClose}
            footer={<>
                <button onClick={onClose} className="inline-flex items-center h-9 px-3.5 rounded-sm border font-medium text-[13px]" style={{ color: "#8b9ab0", borderColor: "rgba(139,154,176,0.30)" }}>Cancel</button>
                <button onClick={submit} disabled={loading || selectedReturns.length === 0}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] disabled:opacity-60"
                    style={{ color: "#5eead4", background: "rgba(94,234,212,0.10)", borderColor: "rgba(94,234,212,0.45)" }}>
                    {loading ? <><Loader2 size={14} className="animate-spin" />Working…</> : <><RotateCcw size={14} />Confirm Return</>}
                </button>
            </>}>
            <div className="space-y-4">
                {error && <div className="rounded-sm border px-4 py-3 font-mono text-[12px]" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.35)", color: "#ef4444" }}>{error}</div>}
                <div className="flex flex-wrap gap-2">
                    {RETURN_CONDITIONS.map(c => (
                        <span key={c} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.10em]" style={{ color: COND_COLORS[c] ?? "#8b9ab0" }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: COND_COLORS[c] ?? "#8b9ab0" }} />
                            {getReturnConditionLabel(c)}
                        </span>
                    ))}
                </div>
                {pendingUnits.length === 0 ? (
                    <div className="rounded-sm border px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.14em]" style={{ borderColor: "rgba(0,229,255,0.12)", color: "#4a5568" }}>No pending units</div>
                ) : (
                    <div className="space-y-2">
                        {pendingUnits.map((unit, i) => (
                            <div key={unit.id} className="flex items-center justify-between px-3 py-2 rounded-sm border" style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(0,229,255,0.03)" }}>
                                <span className="font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: "#8b9ab0" }}>Unit {String(i + 1).padStart(2, "0")}</span>
                                <div className="flex gap-1.5 flex-wrap">
                                    {RETURN_CONDITIONS.map(c => {
                                        const isActive = selections[unit.id] === c;
                                        const col = COND_COLORS[c] ?? "#8b9ab0";
                                        return (
                                            <button key={c} onClick={() => setSelections(s => ({ ...s, [unit.id]: c }))}
                                                className="h-7 px-2.5 rounded-sm border font-mono text-[9.5px] uppercase tracking-[0.10em] transition-all"
                                                style={isActive ? { color: col, background: `${col}18`, borderColor: col } : { color: "#4a5568", background: "transparent", borderColor: "rgba(74,85,104,0.40)" }}>
                                                {getReturnConditionLabel(c)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ModalShell>
    );
}

/* ── Cart Review Modal ───────────────────────────────────── */

function CartReviewModal({ cart, onClose, onReviewed }: { cart: CartDetail; onClose: () => void; onReviewed: () => Promise<void> }) {
    const [cartNote, setCartNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    type CartItemDecision = { action: "approved" | "rejected"; approvedQuantity: number; note: string; givingConditions: GivingCondition[] };
    const [itemDecisions, setItemDecisions] = useState<Record<string, CartItemDecision>>(() =>
        Object.fromEntries(cart.items.map(ci => [ci.id, {
            action: "approved" as const,
            approvedQuantity: ci.quantity,
            note: "",
            givingConditions: Array.from({ length: ci.quantity }, () => "perfect" as GivingCondition),
        }]))
    );
    const update = (id: string, patch: Partial<CartItemDecision>) =>
        setItemDecisions(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

    const needsGiving = (ci: CartDetail["items"][number]) => ci.request_type === "borrow" && !ci.item.is_consumable;

    const submit = async () => {
        setLoading(true);
        setError(null);
        const result = await reviewEquipmentCart({
            cartId: cart.id, action: "manual", cartNote: cartNote.trim() || undefined,
            items: cart.items.map(ci => {
                const d = itemDecisions[ci.id];
                return {
                    cartItemId: ci.id,
                    action: d.action,
                    approvedQuantity: d.action === "approved" ? d.approvedQuantity : undefined,
                    note: d.note.trim() || undefined,
                    givingConditions: d.action === "approved" && needsGiving(ci)
                        ? normalizeConditions(d.givingConditions, d.approvedQuantity)
                        : undefined,
                };
            }),
        });
        if (!result.ok) { setError(result.error); setLoading(false); return; }
        await onReviewed();
        setLoading(false);
        onClose();
    };

    const requesterName = cart.requester.username || cart.requester.display_name;

    return (
        <ModalShell open title="Review Cart" subtitle={cart.id.slice(0, 8).toUpperCase()} width="max-w-2xl" onClose={onClose}
            footer={<>
                <button onClick={onClose} className="inline-flex items-center h-9 px-3.5 rounded-sm border font-medium text-[13px]" style={{ color: "#8b9ab0", borderColor: "rgba(139,154,176,0.30)" }}>Cancel</button>
                <button onClick={submit} disabled={loading} className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] disabled:opacity-60"
                    style={{ color: "#22c55e", background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.45)" }}>
                    {loading ? <><Loader2 size={14} className="animate-spin" />Working…</> : <><CheckCircle2 size={14} />Submit Review</>}
                </button>
            </>}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="flex items-center gap-3 px-3 py-2 rounded-sm" style={{ background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.14)" }}>
                    <MiniAvatar name={requesterName} avatarUrl={cart.requester.avatar_url} />
                    <div>
                        <div className="font-sans font-semibold text-[13px]" style={{ color: "#f0f4ff" }}>{requesterName}</div>
                        <div className="font-mono text-[10.5px] italic mt-0.5" style={{ color: "#8b9ab0" }}>"{cart.reason}"</div>
                    </div>
                </div>
                {error && <div className="rounded-sm border px-4 py-3 font-mono text-[12px]" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.35)", color: "#ef4444" }}>{error}</div>}
                <div className="space-y-2">
                    {cart.items.map(ci => {
                        const d = itemDecisions[ci.id];
                        const isApproved = d.action === "approved";
                        return (
                            <div key={ci.id} className="rounded-sm border p-3 space-y-2 transition-all"
                                style={{ borderColor: isApproved ? "rgba(34,197,94,0.30)" : "rgba(239,68,68,0.30)", background: isApproved ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.04)" }}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-sans font-medium text-[13px]" style={{ color: "#f0f4ff" }}>{ci.item.name}</span>
                                        <TypeBadge type={ci.request_type} />
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        {(["approved", "rejected"] as const).map(dec => (
                                            <button key={dec} onClick={() => update(ci.id, { action: dec })}
                                                className="h-7 px-2.5 rounded-sm border font-mono text-[9.5px] uppercase tracking-[0.10em] transition-all"
                                                style={d.action === dec
                                                    ? dec === "approved"
                                                        ? { color: "#22c55e", background: "rgba(34,197,94,0.15)", borderColor: "rgba(34,197,94,0.55)" }
                                                        : { color: "#ef4444", background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.55)" }
                                                    : { color: "#4a5568", background: "transparent", borderColor: "rgba(74,85,104,0.35)" }}>
                                                {dec === "approved" ? "✓ Approve" : "✗ Reject"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {isApproved && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "#4a5568" }}>Qty</span>
                                        <button onClick={() => update(ci.id, { approvedQuantity: Math.max(1, d.approvedQuantity - 1) })} className="w-6 h-6 rounded-sm border grid place-items-center" style={{ borderColor: "rgba(0,229,255,0.20)", color: "#8b9ab0" }}><Minus size={11} /></button>
                                        <span className="font-mono text-[13px] tabular-nums w-5 text-center" style={{ color: "#f0f4ff" }}>{d.approvedQuantity}</span>
                                        <button onClick={() => update(ci.id, { approvedQuantity: Math.min(ci.quantity, d.approvedQuantity + 1) })} className="w-6 h-6 rounded-sm border grid place-items-center" style={{ borderColor: "rgba(0,229,255,0.20)", color: "#8b9ab0" }}><Plus size={11} /></button>
                                        <span className="font-mono text-[10px]" style={{ color: "#4a5568" }}>/ {ci.quantity}</span>
                                    </div>
                                )}
                                {isApproved && needsGiving(ci) && d.approvedQuantity > 0 && (
                                    <GivingConditionRows count={d.approvedQuantity} values={d.givingConditions} onChange={next => update(ci.id, { givingConditions: next })} />
                                )}
                                <input value={d.note} onChange={e => update(ci.id, { note: e.target.value })} placeholder="Item note…"
                                    className="w-full h-7 text-[11.5px] placeholder:text-[#4a5568] border rounded-sm px-2 outline-none transition-all"
                                    style={{ background: "#07090f", color: "#f0f4ff", borderColor: "rgba(0,229,255,0.15)" }}
                                    onFocus={e => { e.target.style.borderColor = "rgba(0,229,255,0.50)"; }}
                                    onBlur={e => { e.target.style.borderColor = "rgba(0,229,255,0.15)"; }} />
                            </div>
                        );
                    })}
                </div>
                <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "#8b9ab0" }}><span style={{ color: "rgba(0,229,255,0.70)" }}>$</span> Cart Note</div>
                    <textarea rows={2} value={cartNote} onChange={e => setCartNote(e.target.value)} placeholder="Overall note for this cart review…"
                        className="w-full text-[12.5px] placeholder:text-[#4a5568] border rounded-sm px-3 py-2 resize-none outline-none transition-all"
                        style={{ background: "#07090f", color: "#f0f4ff", borderColor: "rgba(0,229,255,0.18)" }}
                        onFocus={e => { e.target.style.borderColor = "rgba(0,229,255,0.55)"; }}
                        onBlur={e => { e.target.style.borderColor = "rgba(0,229,255,0.18)"; }} />
                </div>
            </div>
        </ModalShell>
    );
}

/* ── Admin Tabs (pill) ───────────────────────────────────── */

const ADMIN_TABS = [
    { key: "all", label: "All" }, { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" }, { key: "rejected", label: "Rejected" },
    { key: "returned", label: "Returned" },
] as const;

function AdminTabs({ value, onChange, counts }: { value: string; onChange: (k: string) => void; counts: Record<string, number> }) {
    return (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {ADMIN_TABS.map(t => {
                const active = value === t.key;
                const cnt = counts[t.key] ?? 0;
                return (
                    <button key={t.key} onClick={() => onChange(t.key)}
                        className="shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] whitespace-nowrap transition-all"
                        style={{ color: active ? "#00e5ff" : "#8b9ab0", background: active ? "rgba(0,229,255,0.10)" : "transparent", border: `1px solid ${active ? "rgba(0,229,255,0.55)" : "rgba(0,229,255,0.12)"}`, boxShadow: active ? "0 0 16px -4px rgba(0,229,255,0.45)" : "none" }}>
                        {t.label}
                        {cnt > 0 && <span className="font-mono text-[9.5px] tabular-nums" style={{ color: active ? "rgba(0,229,255,0.85)" : "#4a5568" }}>{String(cnt).padStart(2, "0")}</span>}
                    </button>
                );
            })}
        </div>
    );
}

/* ── Cart filter pills ───────────────────────────────────── */

const CART_FILTERS = [
    { key: "pending", label: "Pending", color: "#f59e0b" },
    { key: "approved", label: "Approved", color: "#22c55e" },
    { key: "partially_approved", label: "Partial", color: "#38bdf8" },
    { key: "rejected", label: "Rejected", color: "#ef4444" },
];

function FilterPills({ value, onChange, options }: { value: string; onChange: (k: string) => void; options: { key: string; label: string; color: string }[] }) {
    return (
        <div className="flex flex-wrap gap-2 mb-5">
            {options.map(o => {
                const active = value === o.key;
                return (
                    <button key={o.key} onClick={() => onChange(o.key)}
                        className="h-7 px-3 rounded-sm border font-mono text-[10px] uppercase tracking-[0.14em] transition-all"
                        style={active ? { color: o.color, background: `${o.color}16`, borderColor: o.color } : { color: "#8b9ab0", background: "transparent", borderColor: "rgba(139,154,176,0.22)" }}>
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/* ── Request card ─────────────────────────────────────────── */

function ReturnBar({ pct }: { pct: number }) {
    return (
        <div className="mt-2 mb-3">
            <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "#4a5568" }}>RETURN PROGRESS</span>
                <span className="font-mono text-[10.5px] tabular-nums" style={{ color: "#00e5ff" }}>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,229,255,0.12)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: "linear-gradient(90deg,rgba(0,229,255,0.7),#00e5ff)", boxShadow: "0 0 8px rgba(0,229,255,0.6)" }} />
            </div>
        </div>
    );
}

function RequestCard({ r, onReview, onReject, onMarkReturned, onOpenDrawer, processingId }: {
    r: RequestDetail;
    onReview: (r: RequestDetail) => void;
    onReject: (r: RequestDetail) => void;
    onMarkReturned: (r: RequestDetail) => void;
    onOpenDrawer: (r: RequestDetail) => void;
    processingId: string | null;
}) {
    const isPending = r.status === "pending";
    const isApproved = r.status === "approved";
    const canReturn = isApproved && r.request_type === "borrow" && !r.item.is_consumable;
    const c = REQ_STATUS[r.status] ?? REQ_STATUS.pending;
    const isBusy = processingId === r.id;

    const approvedQty = r.approved_quantity ?? 0;
    const notApproved = Math.max(r.quantity - approvedQty, 0);
    const returnedCount = r.return_units.filter(u => u.lifecycle_status === "returned").length;
    const returnPct = approvedQty > 0 ? Math.round((returnedCount / approvedQty) * 100) : 0;
    const returnConds = r.return_units.filter(u => u.return_condition).map(u => u.return_condition!);
    const requesterName = r.requester.username || r.requester.display_name;

    const dateStr = new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
    const timeStr = new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

    return (
        <div className="rounded-md overflow-hidden" style={{ background: "#0d1117", border: `1px solid ${isPending ? "rgba(0,229,255,0.14)" : `${c.bd}55`}` }}>
            <div className="h-[2px]" style={{ background: `linear-gradient(90deg,transparent,${c.fg}90,transparent)` }} />
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <MiniAvatar name={requesterName} avatarUrl={r.requester.avatar_url} />
                    <div className="flex-1 min-w-0">
                        <span className="font-sans font-semibold text-[13.5px]" style={{ color: "#f0f4ff" }}>{requesterName}</span>
                    </div>
                    <span className="font-mono text-[10.5px]" style={{ color: "#4a5568" }}>{dateStr} {timeStr}</span>
                    <StatusBadge status={r.status} />
                    <button onClick={() => onOpenDrawer(r)}
                        className="grid place-items-center w-7 h-7 border rounded-sm transition-colors"
                        style={{ borderColor: "rgba(0,229,255,0.18)", color: "#4a5568" }}
                        title="View full details"
                        onMouseOver={e => { e.currentTarget.style.color = "#00e5ff"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.45)"; }}
                        onMouseOut={e => { e.currentTarget.style.color = "#4a5568"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.18)"; }}>
                        <ExternalLink size={12} />
                    </button>
                </div>
                {/* Item */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-sans font-semibold text-[15px] tracking-tight" style={{ color: "#f0f4ff" }}>{r.item.name}</span>
                    <CatBadge cat={r.item.category} />
                    <TypeBadge type={r.request_type} />
                    <span className="font-mono text-[10px]" style={{ color: "#4a5568" }}>REQ-{r.id.slice(0, 6).toUpperCase()}</span>
                </div>
                {/* Qty breakdown */}
                <div className="flex items-center gap-4 mb-3 font-mono text-[11px]">
                    <span style={{ color: "#8b9ab0" }}>Requested: <span style={{ color: "#f0f4ff" }}>{r.quantity}</span></span>
                    <span style={{ color: "rgba(0,229,255,0.55)" }}>|</span>
                    <span style={{ color: "#8b9ab0" }}>Approved: <span style={{ color: approvedQty > 0 ? "#22c55e" : "#4a5568" }}>{approvedQty || "—"}</span></span>
                    {notApproved > 0 && (
                        <>
                            <span style={{ color: "rgba(0,229,255,0.55)" }}>|</span>
                            <span style={{ color: "#8b9ab0" }}>Not Approved: <span style={{ color: "#ef4444" }}>{notApproved}</span></span>
                        </>
                    )}
                </div>
                {/* Return progress */}
                {canReturn && approvedQty > 0 && <ReturnBar pct={returnPct} />}
                {/* Reason */}
                <div className="text-[12.5px] italic mb-2 pl-3 border-l-2" style={{ color: "#8b9ab0", borderColor: "rgba(0,229,255,0.35)" }}>
                    {r.reason}
                </div>
                {/* Status note */}
                {r.status_note && (
                    <div className="font-mono text-[10.5px] mb-3 flex items-start gap-1.5" style={{ color: "#8b9ab0" }}>
                        <MessageSquare size={11} style={{ color: "#4a5568", marginTop: 1, flexShrink: 0 }} />
                        <span>&ldquo;{r.status_note}&rdquo;</span>
                    </div>
                )}
                {/* Return conditions */}
                {returnConds.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] mr-1" style={{ color: "#4a5568" }}>CONDITIONS:</span>
                        {returnConds.map((cond, i) => <CondBadge key={i} cond={cond} />)}
                    </div>
                )}
                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                    {isBusy && <Loader2 size={14} className="animate-spin" style={{ color: "#8b9ab0" }} />}
                    {!isBusy && isPending && (
                        <>
                            <button onClick={() => onReview(r)}
                                className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] transition-all"
                                style={{ color: "#22c55e", background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.45)" }}
                                onMouseOver={e => { e.currentTarget.style.background = "rgba(34,197,94,0.22)"; }}
                                onMouseOut={e => { e.currentTarget.style.background = "rgba(34,197,94,0.12)"; }}>
                                <CheckCircle2 size={14} /> Review & Approve
                            </button>
                            <button onClick={() => onReject(r)}
                                className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] transition-all"
                                style={{ color: "#ef4444", background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.45)" }}
                                onMouseOver={e => { e.currentTarget.style.background = "rgba(239,68,68,0.20)"; }}
                                onMouseOut={e => { e.currentTarget.style.background = "rgba(239,68,68,0.10)"; }}>
                                <XCircle size={14} /> Reject All
                            </button>
                        </>
                    )}
                    {!isBusy && canReturn && (
                        <button onClick={() => onMarkReturned(r)}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] transition-all"
                            style={{ color: "#5eead4", background: "rgba(94,234,212,0.10)", borderColor: "rgba(94,234,212,0.40)" }}
                            onMouseOver={e => { e.currentTarget.style.background = "rgba(94,234,212,0.18)"; }}
                            onMouseOut={e => { e.currentTarget.style.background = "rgba(94,234,212,0.10)"; }}>
                            <RotateCcw size={14} /> Log Returns
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Cart Card ───────────────────────────────────────────── */

function CartCard({ cart, onApproveAll, onRejectAll, onManualReview, processing }: {
    cart: CartDetail; onApproveAll: (id: string) => void; onRejectAll: (id: string) => void;
    onManualReview: (cart: CartDetail) => void; processing: boolean;
}) {
    const isPending = cart.status === "pending";
    const s = REQ_STATUS[cart.status] ?? REQ_STATUS.pending;
    const requesterName = cart.requester.username || cart.requester.display_name;

    return (
        <div className="rounded-md overflow-hidden" style={{ background: "#0d1117", border: `1px solid ${isPending ? "rgba(0,229,255,0.14)" : `${s.bd}55`}` }}>
            <div className="h-[2px]" style={{ background: `linear-gradient(90deg,transparent,${s.fg}90,transparent)` }} />
            <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                    <MiniAvatar name={requesterName} avatarUrl={cart.requester.avatar_url} />
                    <div className="flex-1 min-w-0">
                        <span className="font-sans font-semibold text-[14px]" style={{ color: "#f0f4ff" }}>{requesterName}</span>
                        <span className="font-mono text-[10px] ml-2" style={{ color: "#4a5568" }}>{cart.id.slice(0, 8)}</span>
                    </div>
                    <span className="font-mono text-[10.5px]" style={{ color: "#4a5568" }}>
                        {new Date(cart.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" })}
                    </span>
                    <StatusBadge status={cart.status} />
                </div>
                <div className="font-mono text-[11.5px] italic mb-3 pl-3 border-l-2" style={{ color: "#8b9ab0", borderColor: "rgba(0,229,255,0.40)" }}>"{cart.reason}"</div>
                <div className="rounded-sm border px-3 mb-4" style={{ borderColor: "rgba(0,229,255,0.10)", background: "rgba(0,229,255,0.03)" }}>
                    {cart.items.map(ci => (
                        <div key={ci.id} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "rgba(0,229,255,0.08)" }}>
                            <span className="font-sans text-[13px] flex-1" style={{ color: "#f0f4ff" }}>{ci.item.name}</span>
                            <span className="font-mono text-[11px] tabular-nums" style={{ color: "#8b9ab0" }}>×{ci.quantity}</span>
                            <TypeBadge type={ci.request_type} />
                            {ci.item_status !== "pending" && <StatusBadge status={ci.item_status} />}
                        </div>
                    ))}
                </div>
                {cart.status_note && <div className="font-mono text-[10.5px] italic mb-3" style={{ color: "#8b9ab0" }}>Note: {cart.status_note}</div>}
                {isPending && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => onApproveAll(cart.id)} disabled={processing}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] transition-all disabled:opacity-60"
                            style={{ color: "#22c55e", background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.40)" }}>
                            {processing ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />} Approve All
                        </button>
                        <button onClick={() => onManualReview(cart)} disabled={processing}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] transition-all disabled:opacity-60"
                            style={{ color: "#8b9ab0", background: "transparent", borderColor: "rgba(0,229,255,0.20)" }}>
                            <MessageSquare size={14} /> Manual
                        </button>
                        <button onClick={() => onRejectAll(cart.id)} disabled={processing}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] transition-all disabled:opacity-60"
                            style={{ color: "#ef4444", background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.35)" }}>
                            <XCircle size={14} /> Reject All
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Request detail drawer ───────────────────────────────── */

function AdminReqDrawer({ req, open, onClose, onOpenReview, onOpenReturn, onReject, processingId }: {
    req: RequestDetail | null; open: boolean; onClose: () => void;
    onOpenReview: (r: RequestDetail) => void; onOpenReturn: (r: RequestDetail) => void;
    onReject: (r: RequestDetail) => void; processingId: string | null;
}) {
    const [mounted, setMounted] = useState(false);
    const [anim, setAnim] = useState(false);
    const portalTarget = typeof document === "undefined" ? null : document.body;

    useEffect(() => {
        if (open) { setMounted(true); requestAnimationFrame(() => setAnim(true)); }
        else {
            setAnim(false);
            const t = setTimeout(() => setMounted(false), 300);
            return () => clearTimeout(t);
        }
    }, [open]);

    if (!mounted || !req || !portalTarget) return null;

    const s = REQ_STATUS[req.status] ?? REQ_STATUS.pending;
    const requesterName = req.requester.username || req.requester.display_name;
    const shortId = `REQ-${req.id.slice(0, 6).toUpperCase()}`;
    const isPending = req.status === "pending";
    const isApproved = req.status === "approved";
    const approvedQty = req.approved_quantity ?? 0;
    const returnedCount = req.return_units.filter(u => u.lifecycle_status === "returned").length;
    const returnConds = req.return_units.filter(u => u.return_condition);
    const givingConds = req.return_units.filter(u => u.giving_condition);
    const isBusy = processingId === req.id;

    return createPortal(
        <div className="fixed inset-0 z-40">
            <div className="absolute inset-0" style={{ background: "rgba(7,9,15,0.55)" }} onClick={onClose} />
            <div className="absolute top-0 right-0 h-full w-[400px] flex flex-col"
                style={{ background: "#0d1117", borderLeft: "1px solid rgba(0,229,255,0.16)", boxShadow: "-24px 0 80px -16px rgba(0,0,0,0.8)", transform: anim ? "translateX(0)" : "translateX(100%)", transition: "transform 280ms cubic-bezier(.5,.05,.2,1)" }}>
                <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.5),transparent)" }} />
                <div className="px-5 h-14 flex items-center justify-between border-b shrink-0" style={{ borderColor: "rgba(0,229,255,0.12)" }}>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "#00e5ff" }}>{shortId}</span>
                        <StatusBadge status={req.status} />
                    </div>
                    <button onClick={onClose} className="grid place-items-center w-7 h-7 border rounded-sm transition-colors" style={{ borderColor: "rgba(0,229,255,0.20)", color: "#8b9ab0" }}><X size={14} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div className="rounded-sm border p-4" style={{ background: "rgba(0,229,255,0.03)", borderColor: "rgba(0,229,255,0.14)" }}>
                        <div className="font-sans font-bold text-[18px] tracking-tight mb-2" style={{ color: "#f0f4ff" }}>{req.item.name}</div>
                        <div className="flex items-center gap-2 flex-wrap"><CatBadge cat={req.item.category} /><TypeBadge type={req.request_type} /></div>
                    </div>
                    <div>
                        <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] mb-2" style={{ color: "#4a5568" }}>// REQUESTER</div>
                        <div className="flex items-center gap-3">
                            <MiniAvatar name={requesterName} avatarUrl={req.requester.avatar_url} />
                            <div>
                                <div className="font-sans font-medium text-[13px]" style={{ color: "#f0f4ff" }}>{requesterName}</div>
                                <div className="font-mono text-[10px]" style={{ color: "#4a5568" }}>
                                    {new Date(req.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] mb-2" style={{ color: "#4a5568" }}>// QUANTITIES</div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: "Requested", val: req.quantity, color: "#f0f4ff" },
                                { label: "Approved",  val: approvedQty || "—", color: approvedQty > 0 ? "#22c55e" : "#4a5568" },
                            ].map(({ label, val, color }) => (
                                <div key={label} className="rounded-sm border p-3 text-center" style={{ background: "rgba(0,229,255,0.03)", borderColor: "rgba(0,229,255,0.10)" }}>
                                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] mb-1" style={{ color: "#4a5568" }}>{label}</div>
                                    <div className="font-mono text-[20px] font-semibold tabular-nums" style={{ color }}>{val}</div>
                                </div>
                            ))}
                        </div>
                        {isApproved && req.request_type === "borrow" && (
                            <div className="mt-2 font-mono text-[10.5px]" style={{ color: "#8b9ab0" }}>Returns: {returnedCount} / {approvedQty}</div>
                        )}
                    </div>
                    <div>
                        <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] mb-2" style={{ color: "#4a5568" }}>// REASON</div>
                        <p className="text-[13px] italic border-l-2 pl-3" style={{ color: "#8b9ab0", borderColor: "rgba(0,229,255,0.35)" }}>{req.reason}</p>
                    </div>
                    {req.status_note && (
                        <div>
                            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] mb-2" style={{ color: "#4a5568" }}>// ADMIN NOTE</div>
                            <p className="text-[12px] italic border-l-2 pl-3" style={{ color: "#8b9ab0", borderColor: s.bd }}>"{req.status_note}"</p>
                        </div>
                    )}
                    {givingConds.length > 0 && (
                        <div>
                            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] mb-2" style={{ color: "#4a5568" }}>// HANDOUT CONDITIONS</div>
                            <div className="flex flex-wrap gap-1.5">
                                {givingConds.map(u => <CondBadge key={u.id} cond={u.giving_condition!} />)}
                            </div>
                        </div>
                    )}
                    {returnConds.length > 0 && (
                        <div>
                            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] mb-2" style={{ color: "#4a5568" }}>// RETURN CONDITIONS</div>
                            <div className="flex flex-wrap gap-1.5">
                                {returnConds.map(u => <CondBadge key={u.id} cond={u.return_condition!} />)}
                            </div>
                        </div>
                    )}
                </div>
                {(isPending || (isApproved && req.request_type === "borrow" && !req.item.is_consumable)) && (
                    <div className="px-5 py-4 border-t space-y-2 shrink-0" style={{ borderColor: "rgba(0,229,255,0.10)", background: "rgba(7,9,15,0.40)" }}>
                        {isPending && (
                            <div className="flex gap-2">
                                <button onClick={() => { onOpenReview(req); onClose(); }} disabled={isBusy}
                                    className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] disabled:opacity-60"
                                    style={{ color: "#22c55e", background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.40)" }}>
                                    <CheckCircle2 size={14} /> Approve
                                </button>
                                <button onClick={() => { onReject(req); onClose(); }} disabled={isBusy}
                                    className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] disabled:opacity-60"
                                    style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.40)" }}>
                                    <XCircle size={14} /> Reject
                                </button>
                            </div>
                        )}
                        {isApproved && req.request_type === "borrow" && (
                            <button onClick={() => { onOpenReturn(req); onClose(); }}
                                className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em]"
                                style={{ color: "#5eead4", background: "rgba(94,234,212,0.08)", borderColor: "rgba(94,234,212,0.40)" }}>
                                <RotateCcw size={14} /> Log Returns
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>,
        portalTarget
    );
}

/* ── History table ───────────────────────────────────────── */

const HIST_COLS = ["DATE", "REQUESTER", "ITEM", "DECISION", "REVIEWED BY"];

function HistoryTable({ entries }: { entries: HistoryEntry[] }) {
    if (entries.length === 0) return (
        <div className="rounded-md border text-center py-10 font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ borderColor: "rgba(0,229,255,0.12)", color: "#4a5568", background: "#0d1117" }}>// no history</div>
    );
    return (
        <div className="rounded-md overflow-hidden" style={{ border: "1px solid rgba(0,229,255,0.12)" }}>
            <div className="grid border-b px-4 h-9 items-center" style={{ gridTemplateColumns: "1fr 1fr 1.5fr 0.8fr 1fr", background: "rgba(0,229,255,0.05)", borderColor: "rgba(0,229,255,0.12)" }}>
                {HIST_COLS.map(c => <span key={c} className="font-mono text-[9.5px] uppercase tracking-[0.18em]" style={{ color: "#4a5568" }}>{c}</span>)}
            </div>
            {entries.map((h, i) => (
                <div key={h.id} className="grid px-4 py-3 items-center border-b last:border-0 transition-colors hover:bg-[rgba(0,229,255,0.025)]"
                    style={{ gridTemplateColumns: "1fr 1fr 1.5fr 0.8fr 1fr", borderColor: "rgba(0,229,255,0.08)", background: i % 2 === 0 ? "#0d1117" : "rgba(0,229,255,0.018)" }}>
                    <span className="font-mono text-[11px]" style={{ color: "#8b9ab0" }}>
                        {h.reviewed_at ? new Date(h.reviewed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—"}
                    </span>
                    <span className="font-sans text-[13px]" style={{ color: "#f0f4ff" }}>{h.requester?.username?.trim() || h.requester?.display_name || "Unknown"}</span>
                    <span className="font-sans text-[12.5px] truncate" style={{ color: "#8b9ab0" }}>{h.item?.name ?? "Unknown"}</span>
                    <StatusBadge status={h.status} />
                    <span className="font-mono text-[11px]" style={{ color: "#8b9ab0" }}>{h.approver?.display_name || "Unknown"}</span>
                </div>
            ))}
        </div>
    );
}

/* ── Empty state ─────────────────────────────────────────── */

function EmptyState({ Icon, title, subtitle }: { Icon: React.FC<{ size?: number; className?: string }>; title: string; subtitle?: string }) {
    return (
        <div className="relative border border-dashed rounded-md overflow-hidden corner-ticks" style={{ borderColor: "rgba(0,229,255,0.15)", background: "rgba(0,229,255,0.02)" }}>
            <div className="relative text-center py-14 px-6">
                <div className="mx-auto w-14 h-14 grid place-items-center border rounded-md mb-4" style={{ borderColor: "rgba(0,229,255,0.18)", background: "#07090f" }}>
                    <Icon size={22} className="text-[#4a5568]" />
                </div>
                <h3 className="font-sans font-bold text-[18px] tracking-tight" style={{ color: "#f0f4ff" }}>{title}</h3>
                {subtitle && <p className="text-[13px] mt-1.5 max-w-[42ch] mx-auto" style={{ color: "#8b9ab0" }}>{subtitle}</p>}
            </div>
        </div>
    );
}

/* ── Main Page ───────────────────────────────────────────── */

const MGMT_TABS = [
    { key: "carts",    label: "Carts"    },
    { key: "requests", label: "Requests" },
    { key: "history",  label: "History"  },
] as const;

export default function AdminRequestsPage() {
    const { isModerator, isFaculty, isInventoryManager, loading: userLoading } = useUser();
    const supabase = createClient();
    const router = useRouter();

    const [managementTab, setManagementTabState] = useState<"carts" | "requests" | "history">("carts");
    const [requests, setRequests] = useState<RequestDetail[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyFilterAction, setHistoryFilterAction] = useState<"approved" | "rejected" | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [reqFilter, setReqFilter] = useState("all");
    const [actionError, setActionError] = useState<string | null>(null);

    const [carts, setCarts] = useState<CartDetail[]>([]);
    const [cartsLoading, setCartsLoading] = useState(true);
    const [cartFilter, setCartFilter] = useState("pending");
    const [cartProcessingId, setCartProcessingId] = useState<string | null>(null);
    const [cartReviewTarget, setCartReviewTarget] = useState<CartDetail | null>(null);

    const [reviewTarget, setReviewTarget] = useState<RequestDetail | null>(null);
    const [returnTarget, setReturnTarget] = useState<RequestDetail | null>(null);
    const [drawerReq, setDrawerReq] = useState<RequestDetail | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [isSyncPending, startSyncTransition] = useTransition();
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    const canAccess = isModerator || isFaculty || isInventoryManager;
    const googleSheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL?.trim() || null;

    const setManagementTab = useCallback((tab: "carts" | "requests" | "history") => {
        const params = new URLSearchParams(window.location.search);
        if (tab === "carts") { params.delete("tab"); } else { params.set("tab", tab); }
        const nextQuery = params.toString();
        setManagementTabState(tab);
        router.replace(nextQuery ? `/admin/requests?${nextQuery}` : "/admin/requests", { scroll: false });
    }, [router]);

    const fetchRequests = useCallback(async () => {
        setRequestsLoading(true);
        const { data } = await supabase
            .from("equipment_requests")
            .select(`id,quantity,approved_quantity,reviewed_at,reason,status,status_note,request_type,created_at,item:inventory_items!equipment_requests_item_id_fkey(id,name,category,available_quantity,is_consumable),requester:profiles!equipment_requests_requester_id_fkey(id,display_name,avatar_url,username),return_units:equipment_request_return_units(id,unit_index,lifecycle_status,giving_condition,return_condition)`)
            .order("created_at", { ascending: false });
        if (data) {
            setRequests(data.map(r => ({
                ...r,
                request_type: r.request_type as "borrow" | "permanent",
                item: r.item as unknown as RequestDetail["item"],
                requester: r.requester as unknown as RequestDetail["requester"],
                return_units: (r.return_units || []) as unknown as RequestDetail["return_units"],
            })));
        }
        setRequestsLoading(false);
    }, [supabase]);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        let query = supabase.from("equipment_requests")
            .select(`id,status,reviewed_at,item:inventory_items!equipment_requests_item_id_fkey(name),requester:profiles!equipment_requests_requester_id_fkey(display_name,username),approver:profiles!equipment_requests_approved_by_fkey(display_name)`)
            .in("status", ["approved", "rejected", "returned"])
            .not("approved_by", "is", null)
            .order("reviewed_at", { ascending: false })
            .limit(100);
        if (historyFilterAction === "approved") { query = query.in("status", ["approved", "returned"]); }
        else if (historyFilterAction === "rejected") { query = query.eq("status", "rejected"); }
        const { data } = await query;
        setHistoryEntries((data as unknown as HistoryEntry[]) || []);
        setHistoryLoading(false);
    }, [historyFilterAction, supabase]);

    const fetchCarts = useCallback(async () => {
        setCartsLoading(true);
        const { data } = await supabase.from("equipment_carts")
            .select(`id,reason,status,status_note,created_at,requester:profiles!equipment_carts_requester_id_fkey(id,display_name,avatar_url,username)`)
            .eq("status", cartFilter)
            .order("created_at", { ascending: cartFilter === "pending" });
        if (data) {
            const cartsWithItems: CartDetail[] = [];
            for (const cart of data) {
                const { data: items } = await supabase.from("equipment_cart_items")
                    .select(`id,quantity,request_type,item_status,approved_quantity,admin_note,item:inventory_items!equipment_cart_items_item_id_fkey(id,name,category,available_quantity,is_consumable)`)
                    .eq("cart_id", cart.id);
                cartsWithItems.push({
                    ...cart,
                    requester: cart.requester as unknown as CartDetail["requester"],
                    items: (items || []).map(ci => ({ ...ci, request_type: ci.request_type as "borrow" | "permanent", item: ci.item as unknown as CartDetail["items"][0]["item"] })),
                });
            }
            setCarts(cartsWithItems);
        }
        setCartsLoading(false);
    }, [supabase, cartFilter]);

    useEffect(() => {
        const syncTabFromUrl = () => {
            const tab = new URLSearchParams(window.location.search).get("tab");
            if (tab === "history") setManagementTabState("history");
            else if (tab === "requests") setManagementTabState("requests");
            else setManagementTabState("carts");
        };
        syncTabFromUrl();
        window.addEventListener("popstate", syncTabFromUrl);
        return () => window.removeEventListener("popstate", syncTabFromUrl);
    }, []);

    useEffect(() => {
        if (managementTab !== "requests") return;
        const t = window.setTimeout(() => { void fetchRequests(); }, 0);
        return () => window.clearTimeout(t);
    }, [fetchRequests, managementTab]);

    useEffect(() => {
        if (managementTab !== "history") return;
        const t = window.setTimeout(() => { void fetchHistory(); }, 0);
        return () => window.clearTimeout(t);
    }, [fetchHistory, managementTab]);

    useEffect(() => {
        if (managementTab !== "carts") return;
        const t = window.setTimeout(() => { void fetchCarts(); }, 0);
        return () => window.clearTimeout(t);
    }, [fetchCarts, managementTab]);

    const filteredReqs = useMemo(() =>
        reqFilter === "all" ? requests : requests.filter(r => r.status === reqFilter),
        [requests, reqFilter]
    );
    const reqCounts = useMemo(() => {
        const c: Record<string, number> = { all: requests.length };
        requests.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1; });
        return c;
    }, [requests]);
    const pendingCount = reqCounts.pending ?? 0;

    const handleReject = async (req: RequestDetail) => {
        setProcessingId(req.id);
        setActionError(null);
        const result = await reviewEquipmentRequest({ requestId: req.id, action: "rejected" });
        if (!result.ok) { setActionError(result.error); }
        await fetchRequests();
        setProcessingId(null);
    };

    const handleCartApproveAll = async (cartId: string) => {
        setCartProcessingId(cartId);
        const result = await reviewEquipmentCart({ cartId, action: "approve_all" });
        if (!result.ok) setActionError(result.error);
        await fetchCarts();
        setCartProcessingId(null);
    };

    const handleCartRejectAll = async (cartId: string) => {
        setCartProcessingId(cartId);
        const result = await reviewEquipmentCart({ cartId, action: "reject_all" });
        if (!result.ok) setActionError(result.error);
        await fetchCarts();
        setCartProcessingId(null);
    };

    const handleSheetSync = () => {
        setSyncMessage(null);
        startSyncTransition(async () => {
            const result = await syncInventorySheetsToGoogleSheets();
            if (!result.ok) { setSyncMessage(result.error); return; }
            setSyncMessage(`Synced ${result.historyCount} history entr${result.historyCount === 1 ? "y" : "ies"} and ${result.stockCount} stock row${result.stockCount === 1 ? "" : "s"} to Google Sheets.`);
        });
    };

    const openDrawer = (r: RequestDetail) => { setDrawerReq(r); setDrawerOpen(true); };
    const closeDrawer = () => setDrawerOpen(false);

    if (userLoading) return <VajraLoader fullPage />;

    if (!canAccess) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <div className="mx-auto w-16 h-16 grid place-items-center border rounded-md mb-6" style={{ borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.08)" }}>
                    <ShieldOff size={28} className="text-amber-400" />
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] mb-2" style={{ color: "#f59e0b" }}>// ACCESS DENIED</div>
                <h2 className="font-sans font-black text-[24px] tracking-tight mb-2" style={{ color: "#f0f4ff" }}>Restricted Area</h2>
                <p className="text-[13.5px]" style={{ color: "#8b9ab0" }}>Inventory manager, faculty, or moderator role required.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative" style={{ background: "#07090f" }}>
        <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative max-w-5xl mx-auto px-8 pt-10 pb-20">
            {/* Page header */}
            <div className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                    <span className="h-px w-8" style={{ background: "rgba(0,229,255,0.6)" }} />
                    <span className="font-mono text-[11px] uppercase tracking-[0.24em]" style={{ color: "#00e5ff" }}>// ADMIN / EQUIPMENT REQUESTS</span>
                </div>
                <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="font-sans font-black tracking-tight" style={{ fontSize: 30, color: "#f0f4ff" }}>Equipment Requests</h1>
                        <p className="text-[13.5px] mt-1.5" style={{ color: "#8b9ab0" }}>Review carts, approve individual requests, and log returns.</p>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10.5px]" style={{ color: "#8b9ab0" }}>
                        <span className="w-[7px] h-[7px] rounded-full animate-pulse"
                            style={{ background: pendingCount > 0 ? "#f59e0b" : "#22c55e", boxShadow: `0 0 6px ${pendingCount > 0 ? "#f59e0b" : "#22c55e"}` }} />
                        {pendingCount > 0 ? `${pendingCount} awaiting review` : "All clear"}
                    </div>
                </div>
            </div>

            {/* Management tabs (underline) */}
            <div className="flex items-center border-b mb-7" style={{ borderColor: "rgba(0,229,255,0.12)" }}>
                {MGMT_TABS.map(t => {
                    const active = managementTab === t.key;
                    const tabCount = t.key === "requests" ? pendingCount : null;
                    return (
                        <button key={t.key} onClick={() => setManagementTab(t.key)}
                            className="relative flex items-center gap-2 h-10 px-4 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors"
                            style={{ color: active ? "#f0f4ff" : "#8b9ab0" }}>
                            {t.label}
                            {tabCount != null && tabCount > 0 && (
                                <span className="font-mono text-[9.5px] px-1.5 h-4 grid place-items-center rounded-sm"
                                    style={{ color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.40)" }}>
                                    {tabCount}
                                </span>
                            )}
                            {active && <span className="absolute left-0 right-0 -bottom-px h-[2px] rounded-t-sm" style={{ background: "#00e5ff", boxShadow: "0 0 8px rgba(0,229,255,0.8)" }} />}
                        </button>
                    );
                })}
            </div>

            {actionError && (
                <div className="mb-5 rounded-sm border px-4 py-3 font-mono text-[12px]" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.35)", color: "#ef4444" }}>{actionError}</div>
            )}

            {/* ── CARTS ── */}
            {managementTab === "carts" && (
                <div>
                    <FilterPills value={cartFilter} onChange={setCartFilter} options={CART_FILTERS} />
                    {cartsLoading ? (
                        <div className="flex items-center justify-center py-16"><VajraLoader /></div>
                    ) : carts.length === 0 ? (
                        <EmptyState Icon={ShoppingCart} title="No carts found" subtitle={`No ${cartFilter} carts to review.`} />
                    ) : (
                        <div className="space-y-4">
                            {carts.map(cart => (
                                <CartCard key={cart.id} cart={cart}
                                    onApproveAll={id => { void handleCartApproveAll(id); }}
                                    onRejectAll={id => { void handleCartRejectAll(id); }}
                                    onManualReview={c => setCartReviewTarget(c)}
                                    processing={cartProcessingId === cart.id} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── REQUESTS ── */}
            {managementTab === "requests" && (
                <div>
                    <div className="mb-5"><AdminTabs value={reqFilter} onChange={setReqFilter} counts={reqCounts} /></div>
                    <div className="flex items-center justify-between mb-4 font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: "#8b9ab0" }}>
                        <div className="flex items-center gap-3">
                            <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
                            <span>{filteredReqs.length} of {requests.length} showing</span>
                        </div>
                        <span className="hidden md:block" style={{ color: "#4a5568" }}>Click any row to view details</span>
                    </div>
                    {requestsLoading ? (
                        <div className="flex items-center justify-center py-16"><VajraLoader /></div>
                    ) : filteredReqs.length === 0 ? (
                        <EmptyState Icon={ClipboardList} title="No requests found" subtitle="No requests match this filter." />
                    ) : (
                        <div className="space-y-4">
                            {filteredReqs.map(r => (
                                <RequestCard key={r.id} r={r}
                                    onReview={(req: RequestDetail) => setReviewTarget(req)}
                                    onReject={(req: RequestDetail) => { void handleReject(req); }}
                                    onMarkReturned={(req: RequestDetail) => setReturnTarget(req)}
                                    onOpenDrawer={openDrawer}
                                    processingId={processingId} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── HISTORY ── */}
            {managementTab === "history" && (
                <div>
                    <div className="rounded-md mb-6 p-4" style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.12)" }}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="font-sans font-semibold text-[13px] mb-0.5" style={{ color: "#f0f4ff" }}>Google Sheets Sync</div>
                                <div className="font-mono text-[10.5px]" style={{ color: "#8b9ab0" }}>
                                    {googleSheetUrl ? "Backfills inventory history and stock tabs in the linked sheet." : "Set NEXT_PUBLIC_GOOGLE_SHEET_URL to link Google Sheets."}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={handleSheetSync} disabled={isSyncPending || !googleSheetUrl}
                                    className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] transition-all disabled:opacity-50"
                                    style={{ color: "#00e5ff", background: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.35)" }}>
                                    {isSyncPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync to Sheet
                                </button>
                                <a href={googleSheetUrl ?? "#"} target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] transition-all"
                                    style={{ color: "#8b9ab0", background: "transparent", borderColor: "rgba(139,154,176,0.30)" }}>
                                    <ExternalLink size={14} /> Open Sheet
                                </a>
                            </div>
                        </div>
                        {syncMessage && <div className="mt-3 font-mono text-[10.5px]" style={{ color: "#8b9ab0" }}>{syncMessage}</div>}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-5">
                        {[
                            { key: null as null, label: "All", color: "#00e5ff" },
                            { key: "approved" as const, label: "Approved", color: "#22c55e" },
                            { key: "rejected" as const, label: "Rejected", color: "#ef4444" },
                        ].map(o => {
                            const active = historyFilterAction === o.key;
                            return (
                                <button key={o.label} onClick={() => setHistoryFilterAction(o.key)}
                                    className="h-7 px-3 rounded-sm border font-mono text-[10px] uppercase tracking-[0.14em] transition-all"
                                    style={active ? { color: o.color, background: `${o.color}16`, borderColor: o.color } : { color: "#8b9ab0", background: "transparent", borderColor: "rgba(139,154,176,0.22)" }}>
                                    {o.label}
                                </button>
                            );
                        })}
                    </div>
                    {historyLoading ? (
                        <div className="flex items-center justify-center py-16"><VajraLoader /></div>
                    ) : (
                        <HistoryTable entries={historyEntries} />
                    )}
                </div>
            )}

            {/* Modals */}
            {reviewTarget && <ReviewModal request={reviewTarget} onClose={() => setReviewTarget(null)} onReviewed={fetchRequests} />}
            {returnTarget && <ReturnModal request={returnTarget} onClose={() => setReturnTarget(null)} onLogged={fetchRequests} />}
            {cartReviewTarget && <CartReviewModal cart={cartReviewTarget} onClose={() => setCartReviewTarget(null)} onReviewed={fetchCarts} />}

            {/* Detail drawer */}
            <AdminReqDrawer req={drawerReq} open={drawerOpen} onClose={closeDrawer}
                onOpenReview={r => setReviewTarget(r)} onOpenReturn={r => setReturnTarget(r)}
                onReject={r => { void handleReject(r); }} processingId={processingId} />
        </div>
        </div>
    );
}
