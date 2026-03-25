"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Ban,
    Package,
} from "lucide-react";
import { motion } from "framer-motion";

interface RequestWithItem {
    id: string;
    quantity: number;
    reason: string;
    status: string;
    status_note: string | null;
    request_type: string;
    created_at: string;
    item: {
        name: string;
        category: string;
    };
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
                "id, quantity, reason, status, status_note, request_type, created_at, item:inventory_items!equipment_requests_item_id_fkey(name, category)"
            )
            .eq("requester_id", user.id)
            .order("created_at", { ascending: false });

        if (data) {
            setRequests(
                data.map((r) => ({
                    id: r.id,
                    quantity: r.quantity,
                    reason: r.reason,
                    status: r.status,
                    status_note: r.status_note,
                    request_type: r.request_type,
                    created_at: r.created_at,
                    item: r.item as unknown as { name: string; category: string },
                }))
            );
        }
        setLoading(false);
    }, [user, supabase]);

    useEffect(() => {
        if (user) fetchRequests();
    }, [user, fetchRequests]);

    const filtered = filter
        ? requests.filter((r) => r.status === filter)
        : requests;

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-bold">My Requests</h1>
                    <p className="text-xs text-text-muted">
                        Track your equipment requests
                    </p>
                </div>
            </div>

            {/* Filters */}
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

            {/* List */}
            {filtered.length === 0 ? (
                <div className="glass p-16 text-center">
                    <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No requests</h3>
                    <p className="text-text-muted text-sm">
                        Request equipment from the inventory page.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((req) => {
                        const status = statusConfig[req.status] || statusConfig.pending;
                        return (
                            <motion.div
                                key={req.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm">
                                                {req.item.name}
                                            </span>
                                            <span className="text-xs text-text-muted">
                                                × {req.quantity}
                                            </span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${req.request_type === 'permanent' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'bg-sky-400/10 text-sky-400 border border-sky-400/20'}`}>
                                                {req.request_type === 'permanent' ? '📌 Permanent' : '🔄 Borrow'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-text-secondary mb-2">
                                            {req.reason}
                                        </p>
                                        {req.status_note && (
                                            <p className="text-xs text-text-muted italic">
                                                Note: {req.status_note}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-text-muted mt-1">
                                            {new Date(req.created_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </p>
                                    </div>

                                    <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${status.cls}`}
                                    >
                                        {status.icon}
                                        {status.label}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
