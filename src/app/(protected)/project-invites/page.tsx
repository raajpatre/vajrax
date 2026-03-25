"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
    Mail,
    Loader2,
    Check,
    X,
    Clock,
    FolderOpen,
    User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Invite {
    id: string;
    status: string;
    created_at: string;
    project: { id: string; title: string; status: string };
    inviter: { id: string; display_name: string; avatar_url: string | null };
}

export default function ProjectInvitesPage() {
    const { user, loading: userLoading } = useUser();
    const supabase = useMemo(() => createClient(), []);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchInvites = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from("project_invites")
            .select(
                "id, status, created_at, project:projects!project_invites_project_id_fkey(id, title, status), inviter:profiles!project_invites_inviter_id_fkey(id, display_name, avatar_url)"
            )
            .eq("invitee_id", user.id)
            .order("created_at", { ascending: false });

        if (data) {
            setInvites(
                data.map((inv) => ({
                    id: inv.id,
                    status: inv.status,
                    created_at: inv.created_at,
                    project: inv.project as unknown as { id: string; title: string; status: string },
                    inviter: inv.inviter as unknown as { id: string; display_name: string; avatar_url: string | null },
                }))
            );
        }
        setLoading(false);
    }, [user, supabase]);

    useEffect(() => {
        if (user) fetchInvites();
    }, [user, fetchInvites]);

    const handleRespond = async (invite: Invite, action: "accepted" | "rejected") => {
        setProcessingId(invite.id);

        // Update invite status
        await supabase
            .from("project_invites")
            .update({ status: action })
            .eq("id", invite.id);

        // If accepted, add to project_members
        if (action === "accepted" && user) {
            await supabase.from("project_members").insert({
                project_id: invite.project.id,
                user_id: user.id,
                role: "member",
            });
        }

        // Update local state
        setInvites((prev) =>
            prev.map((inv) =>
                inv.id === invite.id ? { ...inv, status: action } : inv
            )
        );
        setProcessingId(null);
    };

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
            </div>
        );
    }

    const pending = invites.filter((inv) => inv.status === "pending");
    const past = invites.filter((inv) => inv.status !== "pending");

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-bold">Project Invites</h1>
                    <p className="text-xs text-text-muted">
                        Accept or decline project team invitations
                    </p>
                </div>
            </div>

            {/* Pending Invites */}
            {pending.length === 0 && past.length === 0 ? (
                <div className="glass p-16 text-center">
                    <Mail className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No invites yet</h3>
                    <p className="text-text-muted text-sm">
                        When a project lead invites you, it will appear here.
                    </p>
                </div>
            ) : (
                <>
                    {pending.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                Pending ({pending.length})
                            </h2>
                            <div className="space-y-3">
                                <AnimatePresence mode="popLayout">
                                    {pending.map((invite) => (
                                        <motion.div
                                            key={invite.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            layout
                                            className="glass p-5"
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Project info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <FolderOpen className="w-4 h-4 text-primary-light flex-shrink-0" />
                                                        <Link
                                                            href={`/projects/${invite.project.id}`}
                                                            className="text-sm font-bold hover:text-primary-light transition-colors truncate"
                                                        >
                                                            {invite.project.title}
                                                        </Link>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center overflow-hidden">
                                                            {invite.inviter.avatar_url ? (
                                                                <img src={invite.inviter.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-2.5 h-2.5 text-primary-light" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-text-secondary">
                                                            <span className="font-medium text-foreground">{invite.inviter.display_name}</span>{" "}
                                                            invited you to join
                                                        </p>
                                                    </div>
                                                    <p className="text-[10px] text-text-muted mt-1.5">
                                                        {new Date(invite.created_at).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })}
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleRespond(invite, "accepted")}
                                                        disabled={processingId === invite.id}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                                                    >
                                                        {processingId === invite.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Check className="w-3.5 h-3.5" />
                                                        )}
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespond(invite, "rejected")}
                                                        disabled={processingId === invite.id}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                        Decline
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* Past invites */}
                    {past.length > 0 && (
                        <div>
                            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                                Past Invites
                            </h2>
                            <div className="space-y-2">
                                {past.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="glass p-4 flex items-center gap-3 opacity-60"
                                    >
                                        <FolderOpen className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">
                                                {invite.project.title}
                                            </p>
                                            <p className="text-[10px] text-text-muted">
                                                From {invite.inviter.display_name}
                                            </p>
                                        </div>
                                        <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                                invite.status === "accepted"
                                                    ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                                                    : "text-red-400 bg-red-400/10 border-red-400/20"
                                            }`}
                                        >
                                            {invite.status === "accepted" ? "Accepted" : "Declined"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
