"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
    Newspaper,
    ShieldCheck,
    Loader2,
    Trash2,
    User,
    MessageSquare,
    Heart,
} from "lucide-react";
import { motion } from "framer-motion";

interface PostWithAuthor {
    id: string;
    content: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
    author: {
        display_name: string;
        avatar_url: string | null;
        role: string;
    };
}

export default function PostModeration() {
    const { isModerator, isFaculty, loading: authLoading } = useUser();
    const supabase = createClient();
    const [posts, setPosts] = useState<PostWithAuthor[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = useCallback(async () => {
        const { data } = await supabase
            .from("posts")
            .select(
                "id, content, likes_count, comments_count, created_at, author:profiles!posts_author_id_fkey(display_name, avatar_url, role)"
            )
            .order("created_at", { ascending: false })
            .limit(100);

        if (data) {
            setPosts(
                data.map((p) => ({
                    ...p,
                    author: p.author as unknown as {
                        display_name: string;
                        avatar_url: string | null;
                        role: string;
                    },
                }))
            );
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleDelete = async (postId: string) => {
        if (!confirm("Delete this post? This cannot be undone.")) return;
        await supabase.from("posts").delete().eq("id", postId);
        setPosts((prev) => prev.filter((p) => p.id !== postId));
    };

    if (authLoading || loading) {
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
                <div className="w-10 h-10 rounded-xl bg-violet-400/10 border border-violet-400/20 flex items-center justify-center">
                    <Newspaper className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                    <h1 className="text-xl font-bold">Post Moderation</h1>
                    <p className="text-xs text-text-muted">{posts.length} posts</p>
                </div>
            </div>

            {/* Posts */}
            {posts.length === 0 ? (
                <div className="glass p-16 text-center">
                    <Newspaper className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                </div>
            ) : (
                <div className="space-y-2">
                    {posts.map((post) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass p-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {post.author.avatar_url ? (
                                        <img
                                            src={post.author.avatar_url}
                                            alt={post.author.display_name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-4 h-4 text-primary-light" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold">
                                            {post.author.display_name}
                                        </span>
                                        <span className="text-[10px] text-text-muted">
                                            {new Date(post.created_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-text-secondary line-clamp-2">
                                        {post.content}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                                            <Heart className="w-3 h-3" />
                                            {post.likes_count}
                                        </span>
                                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3" />
                                            {post.comments_count}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDelete(post.id)}
                                    className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0"
                                    title="Delete post"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
