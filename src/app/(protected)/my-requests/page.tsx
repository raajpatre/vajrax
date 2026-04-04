"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import {
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Ban,
    Package,
} from "lucide-react";
import { RETURN_CONDITIONS, getReturnConditionLabel, returnConditionBadgeClass, type ReturnCondition } from "@/lib/inventory-requests";

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
    approver: {
        display_name: string;
        username: string | null;
    } | null;
    item: {
        name: string;
        category: string;
    };
    return_units: Array<{
        id: string;
        lifecycle_status: "return_pending" | "returned";
        return_condition: ReturnCondition | null;
    }>;
}

const statusConfig: Record<
    string,
    { icon: React.ReactNode; label: string; cls: string }
> = {
    pending: {
        icon: <Clock className="w-3.5 h-3.5" />,
        label: "Pending",
        cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
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
    returned: {
        icon: <RotateCcw className="w-3.5 h-3.5" />,
        label: "Returned",
        cls: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    },
    revoked: {
        icon: <Ban className="w-3.5 h-3.5" />,
        label: "Revoked",
        cls: "text-text-muted bg-surface border-border",
    },
};

function getConditionSummary(req: RequestWithItem) {
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

export default function MyRequestsPage() {
    const { user, loading: userLoading } = useUser();
    const supabase = createClient();
    const [requests, setRequests] = useState<RequestWithItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from("equipment_requests")
            .select(
                `
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
            `
            )
            .eq("requester_id", user.id)
            .order("created_at", { ascending: false });

        if (data) {
            setRequests(
                data.map((r) => ({
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
                    return_units: (r.return_units || []) as unknown as RequestWithItem["return_units"],
                }))
            );
        }
        setLoading(false);
    }, [user, supabase]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            if (user) {
                void fetchRequests();
            }
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [user, fetchRequests]);

    const filtered = filter
        ? requests.filter((r) => r.status === filter)
        : requests;

    const formatDate = (value: string) =>
        new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(value));

    const formatTime = (value: string) =>
        new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(new Date(value));

    const getDecisionLabel = (status: string) => {
        if (status === "rejected") return "Rejected";
        if (status === "pending") return "Pending";
        return "Approved";
    };

    if (userLoading || loading) {
        return <VajraLoader fullPage />;
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-bold">My Requests</h1>
                    <p className="text-xs text-text-muted">
                        Track approvals, permanent use, and borrowing returns
                    </p>
                </div>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
                <button
                    onClick={() => setFilter(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!filter
                            ? "bg-primary/20 text-primary-light border border-primary/30"
                            : "text-text-muted hover:text-foreground border border-border"
                        }`}
                >
                    All ({requests.length})
                </button>
                {Object.entries(statusConfig).map(([key, config]) => {
                    const count = requests.filter((r) => r.status === key).length;
                    if (count === 0) return null;
                    return (
                        <button
                            key={key}
                            onClick={() => setFilter(filter === key ? null : key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === key
                                    ? "bg-primary/20 text-primary-light border border-primary/30"
                                    : "text-text-muted hover:text-foreground border border-border"
                                }`}
                        >
                            {config.label} ({count})
                        </button>
                    );
                })}
            </div>

            {filtered.length === 0 ? (
                <div className="glass p-4 md:p-5 md:p-8 md:p-16 text-center">
                    <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No requests</h3>
                    <p className="text-text-muted text-sm">
                        Request equipment from the inventory page.
                    </p>
                </div>
            ) : (
                <div className="glass overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-sm">
                            <thead>
                                <tr className="border-b border-border/50">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">Request No.</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">Item Requested</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">Qty Requested</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">Decision</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">Qty Approved</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-muted">By Whom</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((req) => {
                                    const status = statusConfig[req.status] || statusConfig.pending;
                                    const approvedQuantity = req.approved_quantity || 0;
                                    const conditionSummary = getConditionSummary(req);
                                    return (
                                        <tr
                                            key={req.id}
                                            className="border-b border-border/30 align-top last:border-0 hover:bg-surface/20"
                                        >
                                            <td className="px-4 py-4 font-mono text-xs text-text-secondary">
                                                {req.id.slice(0, 8).toUpperCase()}
                                            </td>
                                            <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                                                {formatDate(req.created_at)}
                                            </td>
                                            <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                                                {formatTime(req.created_at)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div>
                                                    <p className="font-medium text-foreground">{req.item.name}</p>
                                                    <div className="mt-1 flex flex-wrap gap-2">
                                                        <span className="text-[10px] text-text-muted capitalize">{req.item.category}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${req.request_type === "permanent"
                                                                ? "bg-amber-400/10 text-amber-300 border-amber-400/20"
                                                                : "bg-sky-400/10 text-sky-300 border-sky-400/20"
                                                            }`}>
                                                            {req.request_type === "permanent" ? "Permanent use" : "Borrowing"}
                                                        </span>
                                                    </div>
                                                    {req.status_note && (
                                                        <p className="mt-2 text-xs italic text-text-muted">{req.status_note}</p>
                                                    )}
                                                    {conditionSummary.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {conditionSummary.map(({ condition, count }) => (
                                                                <span
                                                                    key={condition}
                                                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${returnConditionBadgeClass[condition]}`}
                                                                >
                                                                    {getReturnConditionLabel(condition)} x{count}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-foreground font-semibold">
                                                {req.quantity}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${status.cls}`}
                                                >
                                                    {status.icon}
                                                    {getDecisionLabel(req.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-foreground font-semibold">
                                                {req.status === "pending" ? "—" : approvedQuantity}
                                            </td>
                                            <td className="px-4 py-4 text-text-secondary">
                                                {req.approver
                                                    ? req.approver.username || req.approver.display_name
                                                    : "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
