"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Github, Linkedin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Tables } from "@/types/database";
import {
    User,
    MessageSquare,
    Heart,
    Calendar,
    Edit3,
    Camera,
    Loader2,
    Save,
    X,
    AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Profile = Tables<"profiles">;

const roleLabels: Record<string, { label: string; cls: string }> = {
    member: { label: "Member", cls: "badge-member" },
    president: { label: "President", cls: "badge-president" },
    vice_president: { label: "Vice President", cls: "badge-vp" },
    faculty: { label: "Faculty", cls: "badge-faculty" },
};

// Edit Profile Modal
function EditProfileModal({
    profile,
    onClose,
    onSaved,
}: {
    profile: Profile;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [displayName, setDisplayName] = useState(profile.display_name);
    const [bio, setBio] = useState(profile.bio || "");
    const [contactEmail, setContactEmail] = useState(profile.contact_email || "");
    const [githubUrl, setGithubUrl] = useState(profile.github_url || "");
    const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url || "");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(
        profile.avatar_url
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setError("Image must be under 2MB.");
            return;
        }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) return;

        setLoading(true);
        setError(null);
        
        try {
            const supabase = createClient();
            let avatarUrl = profile.avatar_url;

            // Upload avatar if changed
            if (avatarFile) {
                const ext = avatarFile.name.split(".").pop();
                const path = `${profile.id}/avatar.${ext}`;

                const uploadPromise = supabase.storage
                    .from("avatars")
                    .upload(path, avatarFile, { upsert: true });

                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("Upload timed out after 5 minutes. Check your ad-blocker or network.")), 300000);
                });

                const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;

                if (uploadError) {
                    setError(`Avatar upload failed: ${uploadError.message}`);
                    setLoading(false);
                    return;
                }

                const {
                    data: { publicUrl },
                } = supabase.storage.from("avatars").getPublicUrl(path);

                avatarUrl = publicUrl;
            }

            // Update profile
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    display_name: displayName.trim(),
                    bio: bio.trim() || null,
                    contact_email: contactEmail.trim() || null,
                    github_url: githubUrl.trim() || null,
                    linkedin_url: linkedinUrl.trim() || null,
                    avatar_url: avatarUrl,
                })
                .eq("id", profile.id);

            if (updateError) {
                setError(updateError.message);
                setLoading(false);
                return;
            }

            setLoading(false);
            onSaved();
            onClose();
        } catch (err: any) {
            console.error("Profile save error:", err);
            setError(err.message || "An unexpected error occurred while saving.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="glass-strong p-6 w-full max-w-md relative z-10"
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold">Edit Profile</h3>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Avatar */}
                    <div className="flex justify-center">
                        <label className="relative group cursor-pointer">
                            <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                                {avatarPreview ? (
                                    <img
                                        src={avatarPreview}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-10 h-10 text-primary-light" />
                                )}
                            </div>
                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {/* Display Name */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            Bio
                        </label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={3}
                            maxLength={200}
                            placeholder="Tell us about yourself..."
                            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                        />
                        <p className="text-[10px] text-text-muted text-right mt-1">
                            {bio.length}/200
                        </p>
                    </div>

                    {/* Contact Email */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            Contact Email <span className="text-text-muted text-xs font-normal">(shown on Innovators page)</span>
                        </label>
                        <input
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="yourname@example.com"
                            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                    </div>

                    {/* GitHub */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            GitHub URL
                        </label>
                        <div className="relative">
                            <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="url"
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                placeholder="https://github.com/username"
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                            />
                        </div>
                    </div>

                    {/* LinkedIn */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            LinkedIn URL
                        </label>
                        <div className="relative">
                            <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="url"
                                value={linkedinUrl}
                                onChange={(e) => setLinkedinUrl(e.target.value)}
                                placeholder="https://linkedin.com/in/username"
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !displayName.trim()}
                        className="btn-primary w-full !py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Changes
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

export default function ProfilePage() {
    const params = useParams();
    const userId = params.id as string;
    const { user: currentUser, loading: authLoading } = useUser();
    const supabase = createClient();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [postCount, setPostCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [showEdit, setShowEdit] = useState(false);

    const isOwnProfile = currentUser?.id === userId;

    const fetchProfile = useCallback(async () => {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (data) setProfile(data);
        setLoading(false);
    }, [userId, supabase]);

    const fetchStats = useCallback(async () => {
        const [postsRes, commentsRes] = await Promise.all([
            supabase
                .from("posts")
                .select("id", { count: "exact", head: true })
                .eq("author_id", userId),
            supabase
                .from("comments")
                .select("id", { count: "exact", head: true })
                .eq("author_id", userId),
        ]);
        setPostCount(postsRes.count ?? 0);
        setCommentCount(commentsRes.count ?? 0);
    }, [userId, supabase]);

    useEffect(() => {
        fetchProfile();
        fetchStats();
    }, [fetchProfile, fetchStats]);

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <User className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">User not found</h2>
                <p className="text-text-muted text-sm">
                    This profile doesn&apos;t exist.
                </p>
            </div>
        );
    }

    const role = roleLabels[profile.role];

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Profile header */}
            <div className="glass p-6 mb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {profile.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.display_name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <User className="w-10 h-10 text-primary-light" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                            <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                            {role && (
                                <span className={`badge text-[10px] ${role.cls}`}>
                                    {role.label}
                                </span>
                            )}
                        </div>

                        {profile.bio && (
                            <p className="text-sm text-text-secondary mb-3">
                                {profile.bio}
                            </p>
                        )}

                        <div className="flex items-center gap-1 text-xs text-text-muted justify-center sm:justify-start">
                            <Calendar className="w-3.5 h-3.5" />
                            Joined{" "}
                            {new Date(profile.created_at).toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                            })}
                        </div>

                        {isOwnProfile && (
                            <button
                                onClick={() => setShowEdit(true)}
                                className="btn-secondary text-sm !py-2 !px-4 mt-3"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-primary-light" />
                        <span className="text-2xl font-bold">{postCount}</span>
                    </div>
                    <p className="text-xs text-text-muted">Posts</p>
                </div>
                <div className="glass p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Heart className="w-4 h-4 text-rose-400" />
                        <span className="text-2xl font-bold">{commentCount}</span>
                    </div>
                    <p className="text-xs text-text-muted">Comments</p>
                </div>
            </div>

            {/* Edit modal */}
            <AnimatePresence>
                {showEdit && profile && (
                    <EditProfileModal
                        profile={profile}
                        onClose={() => setShowEdit(false)}
                        onSaved={() => {
                            fetchProfile();
                            fetchStats();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
