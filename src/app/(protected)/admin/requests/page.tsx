"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
    ShieldCheck,
    Loader2,
    Check,
    X,
    Clock,
    Package,
    User,
    RotateCcw,
    Ban,
    CheckCircle2,
    XCircle,
    History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface RequestDetail {
    id: string;
    quantity: number;
    reason: string;
    status: string;
    status_note: string | null;
    created_at: string;
    item: { id: string; name: string; category: string; available_quantity: number };
    requester: { id: string; display_name: string; avatar_url: string | null };
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
};

export default function AdminRequestsPage() {
    const { user, isModerator, isFaculty, loading: userLoading } = useUser();
    const supabase = createClient();
    const [requests, setRequests] = useState<RequestDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("pending");

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from("equipment_requests")
            .select(
                "id, quantity, reason, status, status_note, created_at, item:inventory_items!equipment_requests_item_id_fkey(id, name, category, available_quantity), requester:profiles!equipment_requests_requester_id_fkey(id, display_name, avatar_url)"
            )
            .eq("status", activeTab as "pending" | "approved" | "rejected" | "returned" | "revoked")
            .order("created_at", { ascending: activeTab === "pending" });

        if (data) {
            setRequests(
                data.map((r) => ({
                    ...r,
                    item: r.item as unknown as { id: string; name: string; category: string; available_quantity: number },
                    requester: r.requester as unknown as {
                        id: string;
                        display_name: string;
                        avatar_url: string | null;
                    },
                }))
            );
        }
        setLoading(false);
    }, [supabase, activeTab]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleAction = async (
        req: RequestDetail,
        action: "approved" | "rejected" | "returned" | "revoked"
    ) => {
        if (!user) return;
        setProcessingId(req.id);

        // Update the request status
        await supabase
            .from("equipment_requests")
            .update({
                status: action,
                approved_by: user.id,
                status_note: null,
            })
            .eq("id", req.id);

        // Log to inventory_history
        await supabase.from("inventory_history").insert({
            request_id: req.id,
            item_id: req.item.id,
            actor_id: user.id,
            action,
            quantity: req.quantity,
        });

        // Adjust available_quantity
        if (action === "approved") {
            await supabase
                .from("inventory_items")
                .update({ available_quantity: req.item.available_quantity - req.quantity })
                .eq("id", req.item.id);
        } else if (action === "returned") {
            // Get current quantity first
            const { data: item } = await supabase
                .from("inventory_items")
                .select("available_quantity")
                .eq("id", req.item.id)
                .single();
            if (item) {
                await supabase
                    .from("inventory_items")
                    .update({ available_quantity: item.available_quantity + req.quantity })
                    .eq("id", req.item.id);
            }
        }

        setRequests((prev) => prev.filter((r) => r.id !== req.id));
        setProcessingId(null);
    };

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
                <p className="text-text-muted text-sm">
                    Only club moderators and faculty can approve requests.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Equipment Requests</h1>
                    <p className="text-xs text-text-muted">
                        Review, approve, and track equipment requests
                    </p>
                </div>
                <Link
                    href="/admin/inventory-history"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-primary-light hover:bg-primary/10 border border-border hover:border-primary/30 transition-all"
                >
                    <History className="w-3.5 h-3.5" />
                    History
                </Link>
            </div>

            {/* Status Tabs */}
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

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
                </div>
            ) : requests.length === 0 ? (
                <div className="glass p-16 text-center">
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
                        {requests.map((req) => (
                            <motion.div
                                key={req.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                layout
                                className="glass p-5"
                            >
                                {/* Requester */}
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
                                            {req.requester.display_name}
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

                                {/* Item + details */}
                                <div className="glass p-3 mb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{req.item.name}</p>
                                            <p className="text-xs text-text-muted capitalize">
                                                {req.item.category}
                                            </p>
                                        </div>
                                        <span className="text-lg font-bold text-primary-light">
                                            ×{req.quantity}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-xs text-text-secondary mb-4">
                                    <span className="text-text-muted">Reason:</span> {req.reason}
                                </p>

                                {/* Actions based on status */}
                                <div className="flex gap-2">
                                    {activeTab === "pending" && (
                                        <>
                                            <button
                                                onClick={() => handleAction(req, "approved")}
                                                disabled={processingId === req.id}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                                            >
                                                <Check className="w-4 h-4" />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleAction(req, "rejected")}
                                                disabled={processingId === req.id}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                            >
                                                <X className="w-4 h-4" />
                                                Reject
                                            </button>
                                        </>
                                    )}
                                    {activeTab === "approved" && (
                                        <button
                                            onClick={() => handleAction(req, "returned")}
                                            disabled={processingId === req.id}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/20 text-xs font-semibold hover:bg-sky-500/25 transition-all disabled:opacity-50"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            Mark as Returned
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
