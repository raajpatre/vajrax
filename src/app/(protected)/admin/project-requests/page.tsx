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
    FolderOpen,
    User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProjectRequest {
    id: string;
    title: string;
    description: string | null;
    tech_stack: string[] | null;
    status: string | null;
    created_at: string | null;
    requester: { id: string; display_name: string; avatar_url: string | null };
}

export default function AdminProjectRequestsPage() {
    const { user, isModerator, isFaculty, loading: userLoading } = useUser();
    const supabase = createClient();
    const [requests, setRequests] = useState<ProjectRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from("project_requests")
            .select(
                "id, title, description, tech_stack, status, created_at, requester:profiles!project_requests_requester_id_fkey(id, display_name, avatar_url)"
            )
            .eq("status", "pending")
            .order("created_at", { ascending: true });

        if (data) {
            setRequests(
                data.map((r) => ({
                    id: r.id,
                    title: r.title,
                    description: r.description,
                    tech_stack: r.tech_stack,
                    status: r.status,
                    created_at: r.created_at,
                    requester: r.requester as unknown as {
                        id: string;
                        display_name: string;
                        avatar_url: string | null;
                    },
                }))
            );
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleAction = async (req: ProjectRequest, action: "approved" | "rejected") => {
        if (!user) return;
        setProcessingId(req.id);

        // Update request status
        await supabase
            .from("project_requests")
            .update({ status: action, reviewed_by: user.id })
            .eq("id", req.id);

        // If approved, create the actual project and add requester as lead
        if (action === "approved") {
            const { data: project } = await supabase
                .from("projects")
                .insert({
                    title: req.title,
                    description: req.description || "",
                    tech_stack: req.tech_stack || [],
                    status: "ongoing",
                    created_by: req.requester.id,
                })
                .select("id")
                .single();

            if (project) {
                // Add requester as project lead
                await supabase.from("project_members").insert({
                    project_id: project.id,
                    user_id: req.requester.id,
                    role: "lead",
                });
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
                <p className="text-text-muted text-sm">Only faculty and moderators can approve project requests.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-bold">Project Requests</h1>
                    <p className="text-xs text-text-muted">
                        Review and approve project proposals
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
                </div>
            ) : requests.length === 0 ? (
                <div className="glass p-16 text-center">
                    <FolderOpen className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">All clear!</h3>
                    <p className="text-text-muted text-sm">No pending project proposals to review.</p>
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
                                            <img src={req.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-4 h-4 text-primary-light" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold">{req.requester.display_name}</p>
                                        <p className="text-[10px] text-text-muted flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {req.created_at
                                                ? new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                                : "—"
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Project details */}
                                <h3 className="text-base font-bold mb-1">{req.title}</h3>
                                {req.description && (
                                    <p className="text-xs text-text-secondary mb-3 leading-relaxed">
                                        {req.description}
                                    </p>
                                )}

                                {req.tech_stack && req.tech_stack.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {req.tech_stack.map((tech) => (
                                            <span key={tech} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary-light text-[10px] font-mono border border-primary/20">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAction(req, "approved")}
                                        disabled={processingId === req.id}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                                    >
                                        {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Approve & Create
                                    </button>
                                    <button
                                        onClick={() => handleAction(req, "rejected")}
                                        disabled={processingId === req.id}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                    >
                                        <X className="w-4 h-4" />
                                        Reject
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
