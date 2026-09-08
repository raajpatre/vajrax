"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, Trash2, Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/types/database";
import Image from "next/image";

type Comment = Tables<"mom_comments">;
type Profile = Tables<"profiles">;

interface CommentWithProfile extends Comment {
    profile: Pick<Profile, "display_name" | "avatar_url" | "role"> | null;
}

function getInitials(name: string) {
    return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function fmtTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffH = (now.getTime() - d.getTime()) / 3600000;
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${Math.floor(diffH)}h ago`;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function canDelete(role: string | undefined | null) {
    return role === "faculty" || role === "president" || role === "vice_president";
}

export default function MOMComments({
    momId,
    currentUserId,
    currentUserRole,
}: {
    momId: string;
    currentUserId: string | null;
    currentUserRole: string | null;
}) {
    const supabase = createClient();
    const [comments, setComments] = useState<CommentWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");

    const fetchComments = useCallback(async () => {
        const { data } = await supabase
            .from("mom_comments")
            .select("*, profile:profiles(display_name, avatar_url, role)")
            .eq("mom_id", momId)
            .order("created_at", { ascending: true });
        setComments((data as CommentWithProfile[]) ?? []);
        setLoading(false);
    }, [supabase, momId]);

    useEffect(() => {
        void fetchComments();
        const channel = supabase
            .channel(`mom-comments:${momId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "mom_comments", filter: `mom_id=eq.${momId}` }, () => void fetchComments())
            .subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [fetchComments, supabase, momId]);

    const submitComment = async () => {
        if (!text.trim() || !currentUserId) return;
        setSubmitting(true);
        await supabase.from("mom_comments").insert({ mom_id: momId, author_id: currentUserId, content: text.trim() });
        setText("");
        setSubmitting(false);
    };

    const deleteComment = async (id: string) => {
        await supabase.from("mom_comments").delete().eq("id", id);
        setComments((prev) => prev.filter((c) => c.id !== id));
    };

    const startEdit = (c: Comment) => {
        setEditingId(c.id);
        setEditText(c.content);
    };

    const saveEdit = async () => {
        if (!editingId) return;
        await supabase.from("mom_comments").update({ content: editText }).eq("id", editingId);
        setComments((prev) => prev.map((c) => c.id === editingId ? { ...c, content: editText } : c));
        setEditingId(null);
    };

    return (
        <div className="space-y-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#4a5568] flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm border border-[rgba(0,229,255,0.3)]" />
                {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
            </div>

            {/* Comment list */}
            {!loading && comments.length === 0 && (
                <p className="text-[13px] text-[#4a5568] font-mono">No comments yet. Be the first to comment.</p>
            )}
            <div className="space-y-3">
                {comments.map((c) => {
                    const isOwn = c.author_id === currentUserId;
                    const isAdmin = canDelete(currentUserRole);
                    const name = c.profile?.display_name ?? "Member";
                    return (
                        <div key={c.id} className="flex gap-3 group">
                            {/* Avatar */}
                            <span
                                className="relative rounded-full overflow-hidden shrink-0 w-7 h-7 mt-0.5"
                                style={{ border: "1px solid rgba(0,229,255,0.3)" }}
                            >
                                {c.profile?.avatar_url ? (
                                    <Image src={c.profile.avatar_url} alt={name} width={28} height={28} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="grid place-items-center w-full h-full font-mono text-[9px]" style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff" }}>
                                        {getInitials(name)}
                                    </span>
                                )}
                            </span>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[12.5px] font-semibold text-[#f0f4ff]">{name}</span>
                                    <span className="font-mono text-[10px] text-[#4a5568]">{fmtTime(c.created_at)}</span>
                                </div>

                                {editingId === c.id ? (
                                    <div className="space-y-1.5">
                                        <textarea
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            rows={2}
                                            className="w-full rounded-sm border border-[rgba(0,229,255,0.25)] bg-[#0d1117] px-3 py-2 text-[13px] text-[#f0f4ff] focus:outline-none focus:border-[#00e5ff] transition-colors resize-none"
                                        />
                                        <div className="flex gap-2">
                                            <button type="button" onClick={saveEdit} className="flex items-center gap-1 h-6 px-2 rounded-sm font-mono text-[10px] text-[#22c55e] border border-[rgba(34,197,94,0.3)] hover:bg-[rgba(34,197,94,0.08)] transition-colors">
                                                <Check size={11} /> Save
                                            </button>
                                            <button type="button" onClick={() => setEditingId(null)} className="flex items-center gap-1 h-6 px-2 rounded-sm font-mono text-[10px] text-[#8b9ab0] border border-[rgba(139,154,176,0.3)] hover:bg-[rgba(139,154,176,0.08)] transition-colors">
                                                <X size={11} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[13px] text-[#c8d3e0] leading-relaxed whitespace-pre-wrap break-words">{c.content}</p>
                                )}
                            </div>

                            {/* Actions */}
                            {(isOwn || isAdmin) && editingId !== c.id && (
                                <div className="shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
                                    {isOwn && (
                                        <button type="button" onClick={() => startEdit(c)} className="p-1 rounded-sm text-[#4a5568] hover:text-[#8b9ab0] transition-colors">
                                            <Pencil size={12} />
                                        </button>
                                    )}
                                    <button type="button" onClick={() => void deleteComment(c.id)} className="p-1 rounded-sm text-[#4a5568] hover:text-[#ef4444] transition-colors">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Compose box */}
            {currentUserId && (
                <div
                    className="rounded-sm overflow-hidden"
                    style={{ border: "1px solid rgba(0,229,255,0.14)" }}
                >
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                void submitComment();
                            }
                        }}
                        placeholder="Write a comment… (⌘+Enter to post)"
                        rows={2}
                        className="w-full bg-[#0d1117] px-4 py-3 text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none resize-none"
                    />
                    <div
                        className="flex justify-end px-3 py-2"
                        style={{ borderTop: "1px solid rgba(0,229,255,0.08)", background: "#0d1117" }}
                    >
                        <button
                            type="button"
                            onClick={submitComment}
                            disabled={!text.trim() || submitting}
                            className="flex items-center gap-1.5 h-7 px-3 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] transition-all disabled:opacity-40"
                            style={{ background: "#00e5ff", color: "#07090f" }}
                        >
                            <Send size={11} />
                            {submitting ? "Posting…" : "Post"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
