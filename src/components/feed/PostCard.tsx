"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
    Heart,
    MessageCircle,
    Film,
    Trash2,
    User,
    ChevronDown,
    ChevronUp,
    Send,
    Loader2,
} from "lucide-react";

// Role badge config
const roleLabels: Record<string, { label: string; cls: string }> = {
    member: { label: "Member", cls: "badge-member" },
    president: { label: "President", cls: "badge-president" },
    vice_president: { label: "VP", cls: "badge-vp" },
    faculty: { label: "Faculty", cls: "badge-faculty" },
};

// Types
interface PostAuthor {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    author: PostAuthor;
}

interface PostData {
    id: string;
    content: string;
    image_url: string | null;
    video_url: string | null;
    likes_count: number;
    comments_count: number;
    created_at: string;
    author: PostAuthor;
}

function getYouTubeId(url: string): string | null {
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

function timeAgo(dateStr: string) {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d`;
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

export default function PostCard({
    post,
    onDelete,
}: {
    post: PostData;
    onDelete?: (postId: string) => void;
}) {
    const { user, isAuthenticated, isModerator, isFaculty } = useUser();
    const supabase = createClient();

    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likes_count);
    const [commentsCount, setCommentsCount] = useState(post.comments_count);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);

    const canDelete =
        user?.id === post.author.id || isModerator || isFaculty;

    // Check if user already liked
    useEffect(() => {
        if (!user) return;
        supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .maybeSingle()
            .then(({ data }) => {
                if (data) setLiked(true);
            });
    }, [user, post.id, supabase]);

    // Toggle like
    const handleLike = async () => {
        if (!user) return;

        if (liked) {
            setLiked(false);
            setLikesCount((c) => c - 1);
            await supabase
                .from("post_likes")
                .delete()
                .eq("post_id", post.id)
                .eq("user_id", user.id);
        } else {
            setLiked(true);
            setLikesCount((c) => c + 1);
            await supabase
                .from("post_likes")
                .insert({ post_id: post.id, user_id: user.id });
        }
    };

    // Load comments
    const loadComments = async () => {
        setLoadingComments(true);
        const { data } = await supabase
            .from("comments")
            .select("id, content, created_at, author:profiles!comments_author_id_fkey(id, display_name, avatar_url, role)")
            .eq("post_id", post.id)
            .order("created_at", { ascending: true });

        if (data) {
            setComments(
                data.map((c) => ({
                    ...c,
                    author: c.author as unknown as PostAuthor,
                }))
            );
        }
        setLoadingComments(false);
    };

    // Toggle comments
    const toggleComments = () => {
        if (!showComments) {
            loadComments();
        }
        setShowComments(!showComments);
    };

    // Submit comment
    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !user) return;

        setSubmittingComment(true);
        await supabase.from("comments").insert({
            post_id: post.id,
            author_id: user.id,
            content: commentText.trim(),
        });

        setCommentText("");
        setCommentsCount((c) => c + 1);
        setSubmittingComment(false);
        loadComments();
    };

    // Delete post
    const handleDelete = async () => {
        if (!confirm("Delete this post?")) return;
        await supabase.from("posts").delete().eq("id", post.id);
        onDelete?.(post.id);
    };

    return (
        <div className="glass overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-3 p-5 pb-0">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {post.author.avatar_url ? (
                        <img
                            src={post.author.avatar_url}
                            alt={post.author.display_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <User className="w-5 h-5 text-primary-light" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                            {post.author.display_name}
                        </span>
                        {post.author.role && roleLabels[post.author.role] && (
                            <span
                                className={`badge text-[9px] ${roleLabels[post.author.role].cls
                                    }`}
                            >
                                {roleLabels[post.author.role].label}
                            </span>
                        )}
                        <span className="text-xs text-text-muted">
                            · {timeAgo(post.created_at)}
                        </span>
                    </div>
                </div>
                {canDelete && (
                    <button
                        onClick={handleDelete}
                        className="text-text-muted hover:text-red-400 transition-colors p-1"
                        title="Delete post"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="px-5 py-3">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {post.content}
                </p>
                {post.image_url && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-border">
                        <img
                            src={post.image_url}
                            alt=""
                            className="w-full max-h-[400px] object-cover"
                        />
                    </div>
                )}
                {post.video_url && (() => {
                    const ytId = getYouTubeId(post.video_url);
                    if (ytId) {
                        return (
                            <div className="mt-3 rounded-xl overflow-hidden border border-border">
                                <div className="relative aspect-video">
                                    <iframe
                                        src={`https://www.youtube.com/embed/${ytId}`}
                                        title="Video"
                                        className="absolute inset-0 w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div className="mt-3 rounded-xl overflow-hidden border border-border">
                            <video
                                src={post.video_url}
                                controls
                                className="w-full max-h-[400px]"
                            />
                            <div className="px-3 py-2 bg-surface/50 flex items-center gap-2 text-xs text-text-muted">
                                <Film className="w-3.5 h-3.5" />
                                Video
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 px-5 pb-3 border-b border-border/50">
                <button
                    onClick={handleLike}
                    disabled={!isAuthenticated}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${liked
                            ? "text-rose-400 bg-rose-400/10"
                            : "text-text-muted hover:text-rose-400 hover:bg-rose-400/5"
                        }`}
                >
                    <Heart
                        className={`w-4 h-4 ${liked ? "fill-current" : ""}`}
                    />
                    {likesCount > 0 && likesCount}
                </button>

                <button
                    onClick={toggleComments}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-primary-light hover:bg-primary/5 transition-all"
                >
                    <MessageCircle className="w-4 h-4" />
                    {commentsCount > 0 && commentsCount}
                    {showComments ? (
                        <ChevronUp className="w-3 h-3" />
                    ) : (
                        <ChevronDown className="w-3 h-3" />
                    )}
                </button>
            </div>

            {/* Comments section */}
            {showComments && (
                <div className="px-5 py-3 space-y-3 bg-surface/30">
                    {loadingComments ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                        </div>
                    ) : comments.length === 0 ? (
                        <p className="text-xs text-text-muted text-center py-2">
                            No comments yet. Be the first!
                        </p>
                    ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {comment.author.avatar_url ? (
                                            <img
                                                src={comment.author.avatar_url}
                                                alt={comment.author.display_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-3.5 h-3.5 text-primary-light" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-semibold">
                                                {comment.author.display_name}
                                            </span>
                                            <span className="text-[10px] text-text-muted">
                                                {timeAgo(comment.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-text-secondary leading-relaxed mt-0.5">
                                            {comment.content}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Comment input */}
                    {isAuthenticated && (
                        <form
                            onSubmit={handleComment}
                            className="flex gap-2 pt-2 border-t border-border/50"
                        >
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Write a comment..."
                                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!commentText.trim() || submittingComment}
                                className="btn-primary !p-2 !rounded-lg disabled:opacity-40"
                            >
                                {submittingComment ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Send className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
