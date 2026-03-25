"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import PostComposer from "@/components/feed/PostComposer";
import PostCard from "@/components/feed/PostCard";
import { Newspaper, Loader2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PostAuthor {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
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

export default function FeedPage() {
    const { user, loading: userLoading } = useUser();
    const supabase = useMemo(() => createClient(), []);
    const [posts, setPosts] = useState<PostData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = useCallback(async () => {
        const { data } = await supabase
            .from("posts")
            .select(
                "id, content, image_url, video_url, likes_count, comments_count, created_at, author:profiles!posts_author_id_fkey(id, display_name, avatar_url, role)"
            )
            .order("created_at", { ascending: false })
            .limit(50);

        if (data) {
            setPosts(
                data.map((p) => ({
                    ...p,
                    author: p.author as unknown as PostAuthor,
                }))
            );
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel("feed-realtime")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "posts" },
                () => {
                    fetchPosts();
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "posts" },
                (payload) => {
                    setPosts((prev) =>
                        prev.filter((p) => p.id !== payload.old?.id)
                    );
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "post_likes" },
                () => {
                    fetchPosts();
                }
            )
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "comments" },
                () => {
                    fetchPosts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, fetchPosts]);

    const handleDeletePost = (postId: string) => {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
    };

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-bold">Feed</h1>
                    <p className="text-xs text-text-muted">
                        Real-time updates from VajraX
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                </div>
            </div>

            {/* Composer */}
            {user && (
                <div className="mb-6">
                    <PostComposer onPosted={fetchPosts} />
                </div>
            )}

            {/* Posts */}
            {posts.length === 0 ? (
                <div className="glass p-16 text-center">
                    <Zap className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Feed is empty</h3>
                    <p className="text-text-muted text-sm">
                        Be the first to post something!
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {posts.map((post) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                layout
                            >
                                <PostCard post={post} onDelete={handleDeletePost} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
