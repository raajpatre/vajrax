"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import {
    ShieldCheck,
    Loader2,
    X,
    Clock,
    Package,
    User,
    RotateCcw,
    Ban,
    CheckCircle2,
    XCircle,
    History,
    ClipboardCheck,
    Filter,
    ExternalLink,
    RefreshCw,
    Sheet,
    ShoppingCart,
    Eye,
    CheckCheck,
    MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { logBorrowedEquipmentReturns, reviewEquipmentRequest, reviewEquipmentCart } from "@/actions/equipment-requests";
import { syncInventorySheetsToGoogleSheets } from "@/actions/inventory-history";
import {
    RETURN_CONDITIONS,
    getReturnConditionLabel,
    returnConditionAccentClass,
    returnConditionBadgeClass,
    type ReturnCondition,
} from "@/lib/inventory-requests";

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
    item: {
        id: string;
        name: string;
        category: string;
        available_quantity: number;
    };
    requester: { id: string; display_name: string; avatar_url: string | null; username: string | null };
    return_units: Array<{
        id: string;
        unit_index: number;
        lifecycle_status: "return_pending" | "returned";
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
        item: {
            id: string;
            name: string;
            category: string;
            available_quantity: number;
        };
    }>;
}

const statusTabs = [
    { key: "pending", label: "Pending", icon: <Clock className="w-3.5 h-3.5" /> },
    { key: "approved", label: "Approved", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { key: "returned", label: "Returned", icon: <RotateCcw className="w-3.5 h-3.5" /> },
    { key: "rejected", label: "Rejected", icon: <XCircle className="w-3.5 h-3.5" /> },
    { key: "revoked", label: "Revoked", icon: <Ban className="w-3.5 h-3.5" /> },
];

const statusColors: Record<string, string> = {
    pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    approved: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    returned: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    rejected: "text-red-400 bg-red-400/10 border-red-400/20",
    revoked: "text-text-muted bg-surface border-border",
    partially_approved: "text-amber-300 bg-amber-300/10 border-amber-300/20",
};

const managementTabs = [
    { key: "carts", label: "Carts", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { key: "requests", label: "Requests", icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
    { key: "history", label: "History", icon: <History className="w-3.5 h-3.5" /> },
] as const;

const historyActionConfig = {
    approved: {
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        label: "Approved",
        cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    },
    rejected: {
        icon: <XCircle className="w-3.5 h-3.5" />,
        label: "Rejected",
        cls: "text-red-400 bg-red-400/10 border-red-400/20",
    },
} as const;

// ── Review Modal (for individual legacy requests) ────────────────────────────

function ReviewModal({
    request,
    onClose,
    onReviewed,
}: {
    request: RequestDetail;
    onClose: () => void;
    onReviewed: () => Promise<void>;
}) {
    const [approvedQuantity, setApprovedQuantity] = useState(request.quantity);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const unapprovedQuantity = Math.max(request.quantity - approvedQuantity, 0);
    const portalTarget = typeof document === "undefined" ? null : document.body;

    const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const result = await reviewEquipmentRequest({
            requestId: request.id,
            action: "approved",
            approvedQuantity,
        });

        if (!result.ok) {
            setError(result.error);
            setLoading(false);
            return;
        }

        await onReviewed();
        setLoading(false);
        onClose();
    };

    if (!portalTarget) {
        return null;
    }

    return createPortal((
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="glass-strong relative z-10 w-full max-w-md p-4 md:p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-bold">Review Request</h3>
                        <p className="text-xs text-text-muted mt-1">
                            Approve any quantity from 1 to {request.quantity}.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="glass p-4 mb-4">
                    <p className="text-sm font-semibold">{request.item.name}</p>
                    <p className="text-xs text-text-muted mt-1">
                        Requested by {request.requester.username || request.requester.display_name}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                        Requested {request.quantity}, available {request.item.available_quantity}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <form onSubmit={submitReview} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Approved quantity
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={Math.min(request.quantity, request.item.available_quantity)}
                            value={approvedQuantity}
                            onChange={(event) => setApprovedQuantity(Number(event.target.value))}
                            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                    </div>

                    <div className="rounded-lg border border-border/80 bg-surface/40 px-4 py-3 text-xs text-text-muted">
                        <p>Approved: {approvedQuantity}</p>
                        <p>Not approved: {unapprovedQuantity}</p>
                        <p className="mt-1">
                            {request.request_type === "permanent"
                                ? "Approved units will be marked as Permanent use."
                                : "Approved units will enter the return-pending flow individually."}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            onMouseDown={(event) => event.preventDefault()}
                            disabled={loading || approvedQuantity < 1 || approvedQuantity > request.quantity}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 border border-emerald-500/25 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                            Approve Quantity
                        </button>
                        <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={onClose}
                            disabled={loading}
                            className="btn-ghost text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ), portalTarget);
}

// ── Return Modal ─────────────────────────────────────────────────────────────

function ReturnModal({
    request,
    onClose,
    onLogged,
}: {
    request: RequestDetail;
    onClose: () => void;
    onLogged: () => Promise<void>;
}) {
    const pendingUnits = request.return_units.filter((unit) => unit.lifecycle_status === "return_pending");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selections, setSelections] = useState<Record<string, ReturnCondition | "">>(
        Object.fromEntries(pendingUnits.map((unit) => [unit.id, ""]))
    );
    const portalTarget = typeof document === "undefined" ? null : document.body;

    const selectedReturns = pendingUnits
        .map((unit) => {
            const condition = selections[unit.id];
            return condition ? { unitId: unit.id, condition } : null;
        })
        .filter((entry): entry is { unitId: string; condition: ReturnCondition } => Boolean(entry));

    const submitReturns = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const result = await logBorrowedEquipmentReturns({
            requestId: request.id,
            returns: selectedReturns,
        });

        if (!result.ok) {
            setError(result.error);
            setLoading(false);
            return;
        }

        await onLogged();
        setLoading(false);
        onClose();
    };

    if (!portalTarget) {
        return null;
    }

    return createPortal((
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="glass-strong relative z-10 w-full max-w-2xl p-4 md:p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-bold">Log Returned Items</h3>
                        <p className="text-xs text-text-muted mt-1">
                            Each approved borrowed unit needs its own return condition.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <form onSubmit={submitReturns} className="space-y-5">
                    {pendingUnits.length === 0 ? (
                        <div className="rounded-lg border border-border/70 bg-surface/30 px-4 py-6 text-sm text-text-muted">
                            No pending borrowed units remain for this request.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingUnits.map((unit) => (
                                <div
                                    key={unit.id}
                                    className="rounded-lg border border-border/70 bg-surface/30 px-4 py-4"
                                >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold">Unit {unit.unit_index}</p>
                                            <p className="text-xs text-text-muted mt-1">{request.item.name}</p>
                                        </div>
                                        <select
                                            value={selections[unit.id]}
                                            onChange={(event) =>
                                                setSelections((current) => ({
                                                    ...current,
                                                    [unit.id]: event.target.value as ReturnCondition | "",
                                                }))
                                            }
                                            className="w-full md:w-56 bg-surface border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                        >
                                            <option value="">Select condition</option>
                                            {RETURN_CONDITIONS.map((condition) => (
                                                <option key={condition} value={condition}>
                                                    {getReturnConditionLabel(condition)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {selections[unit.id] && (
                                        <div className={`mt-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${returnConditionBadgeClass[selections[unit.id] as ReturnCondition]}`}>
                                            {getReturnConditionLabel(selections[unit.id] as ReturnCondition)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {RETURN_CONDITIONS.map((condition) => (
                            <span
                                key={condition}
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${returnConditionAccentClass[condition]}`}
                            >
                                {getReturnConditionLabel(condition)}
                            </span>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            onMouseDown={(event) => event.preventDefault()}
                            disabled={loading || selectedReturns.length === 0}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 border border-sky-500/25 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                            Log {selectedReturns.length || ""} Return{selectedReturns.length === 1 ? "" : "s"}
                        </button>
                        <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={onClose}
                            disabled={loading}
                            className="btn-ghost text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ), portalTarget);
}

// ── Cart Review Modal (Manual Approval) ──────────────────────────────────────

function CartReviewModal({
    cart,
    onClose,
    onReviewed,
}: {
    cart: CartDetail;
    onClose: () => void;
    onReviewed: () => Promise<void>;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cartNote, setCartNote] = useState("");
    const [itemDecisions, setItemDecisions] = useState<
        Record<string, { action: "approved" | "rejected"; approvedQuantity: number; note: string }>
    >(
        Object.fromEntries(
            cart.items.map((ci) => [
                ci.id,
                { action: "approved" as const, approvedQuantity: ci.quantity, note: "" },
            ])
        )
    );
    const portalTarget = typeof document === "undefined" ? null : document.body;

    const updateDecision = (itemId: string, updates: Partial<{ action: "approved" | "rejected"; approvedQuantity: number; note: string }>) => {
        setItemDecisions((prev) => ({
            ...prev,
            [itemId]: { ...prev[itemId], ...updates },
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        const result = await reviewEquipmentCart({
            cartId: cart.id,
            action: "manual",
            cartNote: cartNote.trim() || undefined,
            items: cart.items.map((ci) => {
                const decision = itemDecisions[ci.id];
                return {
                    cartItemId: ci.id,
                    action: decision.action,
                    approvedQuantity: decision.action === "approved" ? decision.approvedQuantity : undefined,
                    note: decision.note.trim() || undefined,
                };
            }),
        });

        if (!result.ok) {
            setError(result.error);
            setLoading(false);
            return;
        }

        await onReviewed();
        setLoading(false);
        onClose();
    };

    if (!portalTarget) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="glass-strong relative z-10 w-full max-w-2xl p-4 md:p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-bold">Manual Cart Review</h3>
                        <p className="text-xs text-text-muted mt-1">
                            Approve or reject each item individually.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Cart info */}
                <div className="glass p-3 mb-4">
                    <p className="text-xs text-text-muted">
                        Requested by <span className="font-semibold text-foreground">{cart.requester.username || cart.requester.display_name}</span>
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                        Reason: <span className="text-text-secondary">{cart.reason}</span>
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <div className="space-y-3 mb-5">
                    {cart.items.map((ci) => {
                        const decision = itemDecisions[ci.id];
                        return (
                            <div key={ci.id} className="rounded-lg border border-border/70 bg-surface/30 px-4 py-4">
                                <div className="mb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-semibold">{ci.item.name}</p>
                                        <div className="flex gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => updateDecision(ci.id, { action: "approved" })}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                    decision.action === "approved"
                                                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                                                        : "text-text-muted border-border hover:border-emerald-500/20"
                                                }`}
                                            >
                                                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => updateDecision(ci.id, { action: "rejected" })}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                    decision.action === "rejected"
                                                        ? "bg-red-500/15 text-red-300 border-red-500/25"
                                                        : "text-text-muted border-border hover:border-red-500/20"
                                                }`}
                                            >
                                                <XCircle className="w-3 h-3 inline mr-1" />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-xs text-text-muted capitalize">{ci.item.category}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                            ci.request_type === "permanent"
                                                ? "bg-amber-400/10 text-amber-300 border-amber-400/20"
                                                : "bg-sky-400/10 text-sky-300 border-sky-400/20"
                                        }`}>
                                            {ci.request_type === "permanent" ? "Permanent" : "Borrow"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-text-muted mt-1">
                                        Requested: {ci.quantity} · Available: {ci.item.available_quantity}
                                    </p>
                                </div>

                                {decision.action === "approved" && (
                                    <div className="mb-3">
                                        <label className="block text-xs font-medium text-text-secondary mb-1">
                                            Approved quantity
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={Math.min(ci.quantity, ci.item.available_quantity)}
                                            value={decision.approvedQuantity}
                                            onChange={(e) => updateDecision(ci.id, { approvedQuantity: Number(e.target.value) })}
                                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1">
                                        Note (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={decision.note}
                                        onChange={(e) => updateDecision(ci.id, { note: e.target.value })}
                                        placeholder="Add a note for this item..."
                                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                        Cart-level note (optional)
                    </label>
                    <textarea
                        value={cartNote}
                        onChange={(e) => setCartNote(e.target.value)}
                        rows={2}
                        placeholder="Overall note for this cart review..."
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary/15 px-4 py-3 text-sm font-semibold text-primary-light border border-primary/25 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                        Submit Review
                    </button>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="btn-ghost text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        portalTarget
    );
}

// ── Helper functions ─────────────────────────────────────────────────────────

function getReturnSummary(req: RequestDetail) {
    const approvedQuantity = req.approved_quantity || 0;
    const returnedCount = req.return_units.filter((unit) => unit.lifecycle_status === "returned").length;
    return `${returnedCount} of ${approvedQuantity} returned`;
}

function getConditionSummary(req: RequestDetail) {
    const counts = req.return_units.reduce<Record<ReturnCondition, number>>(
        (acc, unit) => {
            if (unit.return_condition) {
                acc[unit.return_condition] += 1;
            }
            return acc;
        },
        {
            perfect: 0,
            moderate: 0,
            poor: 0,
            disposable: 0,
        }
    );

    return RETURN_CONDITIONS.filter((condition) => counts[condition] > 0).map((condition) => ({
        condition,
        count: counts[condition],
    }));
}

function formatHistoryDate(value: string | null) {
    if (!value) {
        return "—";
    }

    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function getHistoryRequesterName(entry: HistoryEntry) {
    return entry.requester?.username?.trim() || entry.requester?.display_name || "Unknown user";
}

function getHistoryApproverName(entry: HistoryEntry) {
    return entry.approver?.display_name || "Unknown user";
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AdminRequestsPage() {
    const { isModerator, isFaculty, isInventoryManager, loading: userLoading } = useUser();
    const supabase = createClient();
    const router = useRouter();
    const [requests, setRequests] = useState<RequestDetail[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("pending");
    const [actionError, setActionError] = useState<string | null>(null);
    const [historyFilterAction, setHistoryFilterAction] = useState<"approved" | "rejected" | null>(null);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [reviewTarget, setReviewTarget] = useState<RequestDetail | null>(null);
    const [returnTarget, setReturnTarget] = useState<RequestDetail | null>(null);
    const [managementTab, setManagementTabState] = useState<"carts" | "requests" | "history">("carts");
    const [isSyncPending, startSyncTransition] = useTransition();
    const canAccess = isModerator || isFaculty || isInventoryManager;
    const googleSheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL?.trim() || null;
    const isGoogleSheetConfigured = Boolean(googleSheetUrl);

    // Cart state
    const [carts, setCarts] = useState<CartDetail[]>([]);
    const [cartsLoading, setCartsLoading] = useState(true);
    const [cartFilter, setCartFilter] = useState<string>("pending");
    const [cartReviewTarget, setCartReviewTarget] = useState<CartDetail | null>(null);
    const [cartProcessingId, setCartProcessingId] = useState<string | null>(null);

    const setManagementTab = useCallback((tab: "carts" | "requests" | "history") => {
        const params = new URLSearchParams(window.location.search);
        if (tab === "carts") {
            params.delete("tab");
        } else {
            params.set("tab", tab);
        }

        const nextQuery = params.toString();
        setManagementTabState(tab);
        router.replace(nextQuery ? `/admin/requests?${nextQuery}` : "/admin/requests", { scroll: false });
    }, [router]);

    const fetchRequests = useCallback(async () => {
        setRequestsLoading(true);
        const { data } = await supabase
            .from("equipment_requests")
            .select(
                `
                id,
                quantity,
                approved_quantity,
                reviewed_at,
                reason,
                status,
                status_note,
                request_type,
                created_at,
                item:inventory_items!equipment_requests_item_id_fkey(id, name, category, available_quantity),
                requester:profiles!equipment_requests_requester_id_fkey(id, display_name, avatar_url, username),
                return_units:equipment_request_return_units(id, unit_index, lifecycle_status, return_condition)
            `
            )
            .eq("status", activeTab as "pending" | "approved" | "rejected" | "returned" | "revoked")
            .order(activeTab === "pending" ? "created_at" : "reviewed_at", {
                ascending: activeTab === "pending",
            });

        if (data) {
            setRequests(
                data.map((r) => ({
                    ...r,
                    request_type: r.request_type as "borrow" | "permanent",
                    item: r.item as unknown as RequestDetail["item"],
                    requester: r.requester as unknown as RequestDetail["requester"],
                    return_units: (r.return_units || []) as unknown as RequestDetail["return_units"],
                }))
            );
        }
        setRequestsLoading(false);
    }, [supabase, activeTab]);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);

        let query = supabase
            .from("equipment_requests")
            .select(
                `
                id,
                status,
                reviewed_at,
                item:inventory_items!equipment_requests_item_id_fkey(
                    name
                ),
                requester:profiles!equipment_requests_requester_id_fkey(
                    display_name,
                    username
                ),
                approver:profiles!equipment_requests_approved_by_fkey(
                    display_name
                )
            `
            )
            .in("status", ["approved", "rejected", "returned"])
            .not("approved_by", "is", null)
            .order("reviewed_at", { ascending: false })
            .limit(100);

        if (historyFilterAction) {
            if (historyFilterAction === "approved") {
                query = query.in("status", ["approved", "returned"]);
            } else {
                query = query.eq("status", "rejected");
            }
        }

        const { data } = await query;
        setHistoryEntries((data as unknown as HistoryEntry[]) || []);
        setHistoryLoading(false);
    }, [historyFilterAction, supabase]);

    const fetchCarts = useCallback(async () => {
        setCartsLoading(true);
        const { data } = await supabase
            .from("equipment_carts")
            .select(`
                id,
                reason,
                status,
                status_note,
                created_at,
                requester:profiles!equipment_carts_requester_id_fkey(id, display_name, avatar_url, username)
            `)
            .eq("status", cartFilter)
            .order("created_at", { ascending: cartFilter === "pending" });

        if (data) {
            const cartsWithItems: CartDetail[] = [];
            for (const cart of data) {
                const { data: items } = await supabase
                    .from("equipment_cart_items")
                    .select(`
                        id,
                        quantity,
                        request_type,
                        item_status,
                        approved_quantity,
                        admin_note,
                        item:inventory_items!equipment_cart_items_item_id_fkey(id, name, category, available_quantity)
                    `)
                    .eq("cart_id", cart.id);

                cartsWithItems.push({
                    ...cart,
                    requester: cart.requester as unknown as CartDetail["requester"],
                    items: (items || []).map((ci) => ({
                        ...ci,
                        request_type: ci.request_type as "borrow" | "permanent",
                        item: ci.item as unknown as CartDetail["items"][0]["item"],
                    })),
                });
            }
            setCarts(cartsWithItems);
        }
        setCartsLoading(false);
    }, [supabase, cartFilter]);

    useEffect(() => {
        if (managementTab === "requests") {
            const timeoutId = window.setTimeout(() => {
                void fetchRequests();
            }, 0);
            return () => window.clearTimeout(timeoutId);
        }
    }, [fetchRequests, managementTab]);

    useEffect(() => {
        const syncTabFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get("tab");
            if (tab === "history") {
                setManagementTabState("history");
            } else if (tab === "requests") {
                setManagementTabState("requests");
            } else {
                setManagementTabState("carts");
            }
        };

        syncTabFromUrl();
        window.addEventListener("popstate", syncTabFromUrl);
        return () => window.removeEventListener("popstate", syncTabFromUrl);
    }, []);

    useEffect(() => {
        if (managementTab !== "history") {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void fetchHistory();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [fetchHistory, managementTab]);

    useEffect(() => {
        if (managementTab !== "carts") {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void fetchCarts();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [fetchCarts, managementTab]);

    const handleReject = async (req: RequestDetail) => {
        setProcessingId(req.id);
        setActionError(null);

        const result = await reviewEquipmentRequest({
            requestId: req.id,
            action: "rejected",
        });

        if (!result.ok) {
            setActionError(result.error);
            setProcessingId(null);
            return;
        }

        await fetchRequests();
        setProcessingId(null);
    };

    const handleCartApproveAll = async (cartId: string) => {
        setCartProcessingId(cartId);
        setActionError(null);

        const result = await reviewEquipmentCart({
            cartId,
            action: "approve_all",
        });

        if (!result.ok) {
            setActionError(result.error);
            setCartProcessingId(null);
            return;
        }

        await fetchCarts();
        setCartProcessingId(null);
    };

    const handleCartRejectAll = async (cartId: string) => {
        setCartProcessingId(cartId);
        setActionError(null);

        const result = await reviewEquipmentCart({
            cartId,
            action: "reject_all",
        });

        if (!result.ok) {
            setActionError(result.error);
            setCartProcessingId(null);
            return;
        }

        await fetchCarts();
        setCartProcessingId(null);
    };

    const handleSheetSync = () => {
        setSyncMessage(null);
        startSyncTransition(async () => {
            const result = await syncInventorySheetsToGoogleSheets();
            if (!result.ok) {
                setSyncMessage(result.error);
                return;
            }

            setSyncMessage(
                `Synced ${result.historyCount} history entr${result.historyCount === 1 ? "y" : "ies"} and ${result.stockCount} stock row${result.stockCount === 1 ? "" : "s"} to Google Sheets.`
            );
        });
    };

    if (userLoading) {
        return <VajraLoader fullPage />;
    }

    if (!canAccess) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <ShieldCheck className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                <p className="text-text-muted text-sm">
                    Inventory management access is required.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Inventory Requests</h1>
                    <p className="text-xs text-text-muted">
                        Review carts, individual requests, and inventory history from one workspace
                    </p>
                </div>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
                {managementTabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setManagementTab(tab.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${managementTab === tab.key
                            ? "bg-primary/20 text-primary-light border border-primary/30"
                            : "text-text-muted hover:text-foreground border border-border"
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Carts Tab ── */}
            {managementTab === "carts" ? (
                <>
                    {actionError && (
                        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {actionError}
                        </div>
                    )}

                    <div className="flex gap-2 mb-6 flex-wrap">
                        {[
                            { key: "pending", label: "Pending", icon: <Clock className="w-3.5 h-3.5" /> },
                            { key: "approved", label: "Approved", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                            { key: "partially_approved", label: "Partial", icon: <Eye className="w-3.5 h-3.5" /> },
                            { key: "rejected", label: "Rejected", icon: <XCircle className="w-3.5 h-3.5" /> },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setCartFilter(tab.key)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${cartFilter === tab.key
                                    ? "bg-primary/20 text-primary-light border border-primary/30"
                                    : "text-text-muted hover:text-foreground border border-border hover:border-border"
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {cartsLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <VajraLoader />
                        </div>
                    ) : carts.length === 0 ? (
                        <div className="glass p-4 md:p-5 md:p-8 md:p-16 text-center">
                            <ShoppingCart className="w-12 h-12 text-text-muted mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                {cartFilter === "pending" ? "No pending carts" : `No ${cartFilter} carts`}
                            </h3>
                            <p className="text-text-muted text-sm">
                                {cartFilter === "pending"
                                    ? "All carts have been reviewed."
                                    : `No carts with "${cartFilter}" status.`}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {carts.map((cart) => (
                                    <motion.div
                                        key={cart.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        layout
                                        className="glass p-4 md:p-5"
                                    >
                                        {/* Cart Header */}
                                        <div className="flex items-center gap-2.5 mb-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center overflow-hidden">
                                                {cart.requester.avatar_url ? (
                                                    <img
                                                        src={cart.requester.avatar_url}
                                                        alt={cart.requester.display_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="w-4 h-4 text-primary-light" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold">
                                                    {cart.requester.username || cart.requester.display_name}
                                                </p>
                                                <p className="text-[10px] text-text-muted">
                                                    {new Date(cart.created_at).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${statusColors[cart.status] || statusColors.pending}`}>
                                                {cart.status === "partially_approved" ? "Partial" : cart.status}
                                            </span>
                                        </div>

                                        {/* Cart Reason */}
                                        <p className="text-xs text-text-secondary mb-3">
                                            <span className="text-text-muted">Reason:</span> {cart.reason}
                                        </p>

                                        {cart.status_note && (
                                            <p className="text-xs text-text-muted italic mb-3">
                                                Note: {cart.status_note}
                                            </p>
                                        )}

                                        {/* Cart Items */}
                                        <div className="space-y-2 mb-4">
                                            {cart.items.map((ci) => (
                                                <div
                                                    key={ci.id}
                                                    className="glass p-3 flex items-center justify-between gap-2"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{ci.item.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-text-muted capitalize">{ci.item.category}</span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${
                                                                ci.request_type === "permanent"
                                                                    ? "text-amber-300 border-amber-400/30 bg-amber-500/10"
                                                                    : "text-sky-300 border-sky-400/30 bg-sky-500/10"
                                                            }`}>
                                                                {ci.request_type === "permanent" ? "Permanent" : "Borrow"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg font-bold text-primary-light">×{ci.quantity}</span>
                                                        {ci.item_status !== "pending" && (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${statusColors[ci.item_status] || statusColors.pending}`}>
                                                                {ci.item_status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Cart Actions */}
                                        {cartFilter === "pending" && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => void handleCartApproveAll(cart.id)}
                                                    disabled={cartProcessingId === cart.id}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                                                >
                                                    {cartProcessingId === cart.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                                                    Approve Cart
                                                </button>
                                                <button
                                                    onClick={() => setCartReviewTarget(cart)}
                                                    disabled={cartProcessingId === cart.id}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary/10 text-primary-light border border-primary/20 text-xs font-semibold hover:bg-primary/20 transition-all disabled:opacity-50"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    Manual Approval
                                                </button>
                                                <button
                                                    onClick={() => void handleCartRejectAll(cart.id)}
                                                    disabled={cartProcessingId === cart.id}
                                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </>
            ) : managementTab === "requests" ? (
                <>
                    {actionError && (
                        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {actionError}
                        </div>
                    )}

                    <div className="flex gap-2 mb-6 flex-wrap">
                        {statusTabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.key
                                    ? "bg-primary/20 text-primary-light border border-primary/30"
                                    : "text-text-muted hover:text-foreground border border-border hover:border-border"
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {requestsLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <VajraLoader />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="glass p-4 md:p-5 md:p-8 md:p-16 text-center">
                            <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                {activeTab === "pending" ? "All clear!" : `No ${activeTab} requests`}
                            </h3>
                            <p className="text-text-muted text-sm">
                                {activeTab === "pending"
                                    ? "No pending requests to review."
                                    : `No requests with "${activeTab}" status.`}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {requests.map((req) => {
                                    const approvedQuantity = req.approved_quantity || 0;
                                    const conditionSummary = getConditionSummary(req);
                                    return (
                                        <motion.div
                                            key={req.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            layout
                                            className="glass p-4 md:p-5"
                                        >
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center overflow-hidden">
                                                    {req.requester.avatar_url ? (
                                                        <img
                                                            src={req.requester.avatar_url}
                                                            alt={req.requester.display_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <User className="w-4 h-4 text-primary-light" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold">
                                                        {req.requester.username || req.requester.display_name}
                                                    </p>
                                                    <p className="text-[10px] text-text-muted">
                                                        {new Date(req.created_at).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "numeric",
                                                            minute: "2-digit",
                                                        })}
                                                    </p>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${statusColors[req.status] || statusColors.pending}`}>
                                                    {req.status}
                                                </span>
                                            </div>

                                            <div className="glass p-3 mb-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-medium">{req.item.name}</p>
                                                        <p className="text-xs text-text-muted capitalize">
                                                            {req.item.category}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-md px-1.5 py-0.5 border ${req.request_type === "permanent"
                                                            ? "text-amber-300 border-amber-400/30 bg-amber-500/10"
                                                            : "text-sky-300 border-sky-400/30 bg-sky-500/10"
                                                            }`}>
                                                            {req.request_type === "permanent" ? "Permanent use" : "Borrowing"}
                                                        </span>
                                                        <span className="text-lg font-bold text-primary-light">
                                                            ×{req.quantity}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-3 text-xs text-text-secondary space-y-1">
                                                <p>
                                                    Requested: <span className="font-semibold text-foreground">{req.quantity}</span>
                                                </p>
                                                {req.status !== "pending" && (
                                                    <p>
                                                        Approved: <span className="font-semibold text-foreground">{approvedQuantity}</span>
                                                    </p>
                                                )}
                                                {req.status !== "pending" && approvedQuantity < req.quantity && (
                                                    <p>
                                                        Not approved: <span className="font-semibold text-foreground">{req.quantity - approvedQuantity}</span>
                                                    </p>
                                                )}
                                                {req.request_type === "borrow" && req.status !== "pending" && approvedQuantity > 0 && (
                                                    <p>
                                                        Return progress: <span className="font-semibold text-foreground">{getReturnSummary(req)}</span>
                                                    </p>
                                                )}
                                            </div>

                                            <p className="text-xs text-text-secondary mb-3">
                                                <span className="text-text-muted">Reason:</span> {req.reason}
                                            </p>

                                            {req.status_note && (
                                                <p className="text-xs text-text-muted italic mb-3">
                                                    Note: {req.status_note}
                                                </p>
                                            )}

                                            {conditionSummary.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {conditionSummary.map(({ condition, count }) => (
                                                        <span
                                                            key={condition}
                                                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${returnConditionBadgeClass[condition]}`}
                                                        >
                                                            {getReturnConditionLabel(condition)} ×{count}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                {activeTab === "pending" && (
                                                    <>
                                                        <button
                                                            onClick={() => setReviewTarget(req)}
                                                            disabled={processingId === req.id}
                                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                                                        >
                                                            <ClipboardCheck className="w-4 h-4" />
                                                            Review & Approve
                                                        </button>
                                                        <button
                                                            onClick={() => void handleReject(req)}
                                                            disabled={processingId === req.id}
                                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                                        >
                                                            <X className="w-4 h-4" />
                                                            Reject All
                                                        </button>
                                                    </>
                                                )}
                                                {activeTab === "approved" && req.request_type === "borrow" && (
                                                    <button
                                                        onClick={() => setReturnTarget(req)}
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/20 text-xs font-semibold hover:bg-sky-500/25 transition-all"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                        Log Returns
                                                    </button>
                                                )}
                                                {activeTab === "approved" && req.request_type === "permanent" && (
                                                    <p className="text-xs text-text-muted text-center w-full py-2">
                                                        Permanent-use requests do not have a return flow.
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="glass p-4 mb-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-medium">Google Sheets Sync</p>
                                <p className="text-xs text-text-muted mt-1">
                                    {isGoogleSheetConfigured
                                        ? "Backfills both the inventory history tab and the Inventory Stocks tab in the linked sheet."
                                        : "Set NEXT_PUBLIC_GOOGLE_SHEET_URL and GOOGLE_SHEETS_WEBHOOK_URL to link Google Sheets."}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleSheetSync}
                                    disabled={isSyncPending || !isGoogleSheetConfigured}
                                    className="btn-primary text-sm disabled:opacity-50"
                                >
                                    {isSyncPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                    Sync to Sheet
                                </button>
                                <a
                                    href={googleSheetUrl || "https://docs.google.com/spreadsheets/d/1NGiGWa8EceraGPMWFoxipQPOKS6YJbGXjczBaIEgc6k/edit?usp=sharing"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-ghost text-sm"
                                >
                                    <Sheet className="w-4 h-4" />
                                    Open Sheet
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                        {syncMessage && (
                            <p className="mt-3 text-xs text-text-muted">{syncMessage}</p>
                        )}
                    </div>

                    <div className="flex gap-2 mb-6 flex-wrap items-center">
                        <Filter className="w-3.5 h-3.5 text-text-muted" />
                        <button
                            onClick={() => setHistoryFilterAction(null)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!historyFilterAction
                                ? "bg-primary/20 text-primary-light border border-primary/30"
                                : "text-text-muted hover:text-foreground border border-border"
                                }`}
                        >
                            All
                        </button>
                        {(Object.keys(historyActionConfig) as Array<keyof typeof historyActionConfig>).map((key) => (
                            <button
                                key={key}
                                onClick={() => setHistoryFilterAction(historyFilterAction === key ? null : key)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${historyFilterAction === key
                                    ? "bg-primary/20 text-primary-light border border-primary/30"
                                    : "text-text-muted hover:text-foreground border border-border"
                                    }`}
                            >
                                {historyActionConfig[key].icon}
                                {historyActionConfig[key].label}
                            </button>
                        ))}
                    </div>

                    {historyLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <VajraLoader />
                        </div>
                    ) : historyEntries.length === 0 ? (
                        <div className="glass p-4 md:p-5 md:p-8 md:p-16 text-center">
                            <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No history yet</h3>
                            <p className="text-text-muted text-sm">
                                Approved and rejected requests will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="glass overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-sm">
                                    <thead>
                                        <tr className="border-b border-border/50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">Requester</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">Item</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">Decision</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">Reviewed By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyEntries.map((entry, index) => {
                                            const decision = entry.status === "rejected" ? "rejected" : "approved";
                                            const config = historyActionConfig[decision];
                                            return (
                                                <motion.tr
                                                    key={entry.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    className="border-b border-border/30 last:border-0 hover:bg-surface/20"
                                                >
                                                    <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                                                        {formatHistoryDate(entry.reviewed_at)}
                                                    </td>
                                                    <td className="px-4 py-4 font-medium">
                                                        {getHistoryRequesterName(entry)}
                                                    </td>
                                                    <td className="px-4 py-4 text-text-secondary">
                                                        {entry.item?.name || "Unknown item"}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${config.cls}`}>
                                                            {config.icon}
                                                            {config.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-text-secondary">
                                                        {getHistoryApproverName(entry)}
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {reviewTarget && (
                <ReviewModal
                    request={reviewTarget}
                    onClose={() => setReviewTarget(null)}
                    onReviewed={fetchRequests}
                />
            )}

            {returnTarget && (
                <ReturnModal
                    request={returnTarget}
                    onClose={() => setReturnTarget(null)}
                    onLogged={fetchRequests}
                />
            )}

            {cartReviewTarget && (
                <CartReviewModal
                    cart={cartReviewTarget}
                    onClose={() => setCartReviewTarget(null)}
                    onReviewed={fetchCarts}
                />
            )}
        </div>
    );
}
