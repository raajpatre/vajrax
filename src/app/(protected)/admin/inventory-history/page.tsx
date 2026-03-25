"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
    History,
    Loader2,
    ShieldCheck,
    Check,
    X,
    RotateCcw,
    Ban,
    Package,
    User,
    Filter,
} from "lucide-react";
import { motion } from "framer-motion";

interface HistoryEntry {
    id: string;
    action: string;
    quantity: number;
    note: string | null;
    created_at: string | null;
    item: { name: string; category: string };
    actor: { display_name: string; avatar_url: string | null };
}

const actionConfig: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    approved: {
        icon: <Check className="w-3.5 h-3.5" />,
        label: "Approved",
        cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    },
    rejected: {
        icon: <X className="w-3.5 h-3.5" />,
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

export default function InventoryHistoryPage() {
    const { isModerator, isFaculty, loading: userLoading } = useUser();
    const supabase = createClient();
    const [entries, setEntries] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from("inventory_history")
            .select(
                "id, action, quantity, note, created_at, item:inventory_items!inventory_history_item_id_fkey(name, category), actor:profiles!inventory_history_actor_id_fkey(display_name, avatar_url)"
            )
            .order("created_at", { ascending: false })
            .limit(100);

        if (filterAction) {
            query = query.eq("action", filterAction);
        }

        const { data } = await query;

        if (data) {
            setEntries(
                data.map((e) => ({
                    ...e,
                    item: e.item as unknown as { name: string; category: string },
                    actor: e.actor as unknown as { display_name: string; avatar_url: string | null },
                }))
            );
        }
        setLoading(false);
    }, [supabase, filterAction]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    if (userLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
            </div>
        );
    }

    if (!isModerator && !isFaculty) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <ShieldCheck className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                <p className="text-text-muted text-sm">Admin access required.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-bold">Inventory History</h1>
                    <p className="text-xs text-text-muted">
                        Audit log of all equipment actions
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 flex-wrap items-center">
                <Filter className="w-3.5 h-3.5 text-text-muted" />
                <button
                    onClick={() => setFilterAction(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!filterAction
                        ? "bg-primary/20 text-primary-light border border-primary/30"
                        : "text-text-muted hover:text-foreground border border-border"
                        }`}
                >
                    All
                </button>
                {Object.entries(actionConfig).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => setFilterAction(filterAction === key ? null : key)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterAction === key
                            ? "bg-primary/20 text-primary-light border border-primary/30"
                            : "text-text-muted hover:text-foreground border border-border"
                            }`}
                    >
                        {config.icon}
                        {config.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
                </div>
            ) : entries.length === 0 ? (
                <div className="glass p-16 text-center">
                    <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No history yet</h3>
                    <p className="text-text-muted text-sm">
                        Actions on equipment requests will appear here.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {entries.map((entry, i) => {
                        const config = actionConfig[entry.action] || actionConfig.approved;
                        return (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="glass p-4 flex items-center gap-3"
                            >
                                {/* Actor avatar */}
                                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {entry.actor.avatar_url ? (
                                        <img
                                            src={entry.actor.avatar_url}
                                            alt={entry.actor.display_name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-4 h-4 text-primary-light" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm">
                                        <span className="font-semibold">{entry.actor.display_name}</span>
                                        {" "}
                                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${config.cls}`}>
                                            {config.icon}
                                            {config.label}
                                        </span>
                                        {" "}
                                        <span className="font-medium">{entry.item.name}</span>
                                        <span className="text-text-muted"> ×{entry.quantity}</span>
                                    </p>
                                    {entry.note && (
                                        <p className="text-xs text-text-muted mt-0.5 italic">{entry.note}</p>
                                    )}
                                </div>

                                {/* Timestamp */}
                                <p className="text-[10px] text-text-muted whitespace-nowrap flex-shrink-0">
                                    {entry.created_at ? new Date(entry.created_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "numeric",
                                        minute: "2-digit",
                                    }) : "—"}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
