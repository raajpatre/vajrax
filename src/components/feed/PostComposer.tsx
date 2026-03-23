"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Send, Loader2, User, Image, Film, X } from "lucide-react";

function getYouTubeId(url: string): string | null {
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

export default function PostComposer({
    onPosted,
}: {
    onPosted?: () => void;
}) {
    const { user, profile } = useUser();
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState("");
    const [showVideoInput, setShowVideoInput] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const ytId = videoUrl ? getYouTubeId(videoUrl) : null;

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user) return;

        setLoading(true);
        const supabase = createClient();

        let imageUrl: string | null = null;

        // Upload image if selected
        if (imageFile) {
            const ext = imageFile.name.split(".").pop();
            const path = `${user.id}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from("post-images")
                .upload(path, imageFile, { contentType: imageFile.type });

            if (!uploadError) {
                const { data: urlData } = supabase.storage
                    .from("post-images")
                    .getPublicUrl(path);
                imageUrl = urlData.publicUrl;
            }
        }

        await supabase.from("posts").insert({
            author_id: user.id,
            content: content.trim(),
            image_url: imageUrl,
            video_url: videoUrl.trim() || null,
        });

        setContent("");
        clearImage();
        setVideoUrl("");
        setShowVideoInput(false);
        setLoading(false);
        onPosted?.();
    };

    if (!user) return null;

    return (
        <div className="glass p-5">
            <div className="flex gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {profile?.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt={profile.display_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <User className="w-5 h-5 text-primary-light" />
                    )}
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's on your mind? Share an update, question, or idea..."
                        rows={3}
                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                    />

                    {/* Image preview */}
                    {imagePreview && (
                        <div className="relative rounded-xl overflow-hidden border border-border">
                            <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                            <button
                                type="button"
                                onClick={clearImage}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    )}

                    {/* Video URL input */}
                    {showVideoInput && (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="Paste YouTube or video URL..."
                                    className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => { setVideoUrl(""); setShowVideoInput(false); }}
                                    className="px-2 text-text-muted hover:text-foreground transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {/* YouTube thumbnail preview */}
                            {ytId && (
                                <div className="rounded-xl overflow-hidden border border-border">
                                    <img
                                        src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                                        alt="Video thumbnail"
                                        className="w-full max-h-48 object-cover"
                                    />
                                    <div className="px-3 py-2 bg-surface/50 flex items-center gap-2 text-xs text-text-muted">
                                        <Film className="w-3.5 h-3.5 text-red-400" />
                                        YouTube Video
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            {/* Image upload button */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 transition-all"
                                title="Add image"
                            >
                                <Image className="w-4.5 h-4.5" />
                            </button>

                            {/* Video URL toggle */}
                            <button
                                type="button"
                                onClick={() => setShowVideoInput(!showVideoInput)}
                                className={`p-2 rounded-lg transition-all ${showVideoInput ? "text-primary-light bg-primary/10" : "text-text-muted hover:text-primary-light hover:bg-primary/10"}`}
                                title="Add video link"
                            >
                                <Film className="w-4.5 h-4.5" />
                            </button>

                            <span className="text-xs text-text-muted ml-2">
                                {content.length > 0 && `${content.length}/1000`}
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={!content.trim() || loading || content.length > 1000}
                            className="btn-primary text-sm !py-2 !px-5 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Post
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
