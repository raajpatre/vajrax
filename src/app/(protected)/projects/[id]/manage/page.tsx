"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import { useParams, useRouter } from "next/navigation";
import {
    Settings,
    Loader2,
    UserPlus,
    User,
    Send,
    Tag,
    GitBranch,
    Users,
    Trash2,
    ShieldCheck,
    ArrowLeft,
    CheckCircle,
    Pause,
    Play,
    Image as ImageIcon,
    Link2,
    Sparkles,
} from "lucide-react";
import Link from "next/link";

interface Member {
    id: string;
    role: string | null;
    user: {
        id: string;
        display_name: string;
        avatar_url: string | null;
        username: string | null;
    };
}

function normalizeImageUrl(raw: string) {
    const value = raw.trim();
    if (!value) return "";

    try {
        const url = new URL(value);

        if (url.hostname === "drive.google.com") {
            const fileId = url.searchParams.get("id") || url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
            if (fileId) {
                return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
            }
        }

        return url.toString();
    } catch {
        return "";
    }
}

function splitLines(value: string) {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

export default function ProjectManagePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user, isFaculty, loading: userLoading } = useUser();
    const supabase = createClient();

    const [project, setProject] = useState<{ title: string; status: string; cover_image_url: string | null } | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLead, setIsLead] = useState(false);
    const [isMember, setIsMember] = useState(false);

    // Add member form
    const [username, setUsername] = useState("");
    const [addError, setAddError] = useState<string | null>(null);
    const [addingMember, setAddingMember] = useState(false);

    // Update form
    const [updateTitle, setUpdateTitle] = useState("");
    const [updateContent, setUpdateContent] = useState("");
    const [versionTag, setVersionTag] = useState("");
    const [updateSourceUrls, setUpdateSourceUrls] = useState("");
    const [updateImageUrls, setUpdateImageUrls] = useState("");
    const [postingUpdate, setPostingUpdate] = useState(false);
    const [projectHeroUrl, setProjectHeroUrl] = useState("");
    const [savingHeroImage, setSavingHeroImage] = useState(false);
    const [heroImageMessage, setHeroImageMessage] = useState<string | null>(null);

    // Project Actions
    const [actionLoading, setActionLoading] = useState<"delete" | "pause" | "complete" | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: proj } = await supabase
            .from("projects")
            .select("title, status, cover_image_url")
            .eq("id", id)
            .single();
        setProject(proj);
        setProjectHeroUrl(proj?.cover_image_url || "");

        const { data: mem } = await supabase
            .from("project_members")
            .select("id, role, user:profiles!project_members_user_id_fkey(id, display_name, avatar_url, username)")
            .eq("project_id", id);

        if (mem) {
            const mapped = mem.map((m) => ({
                ...m,
                user: m.user as unknown as {
                    id: string;
                    display_name: string;
                    avatar_url: string | null;
                    username: string | null;
                },
            }));
            setMembers(mapped);
            setIsLead(mapped.some((m) => m.user.id === user?.id && m.role === "lead"));
            setIsMember(mapped.some((m) => m.user.id === user?.id));
        }
        setLoading(false);
    }, [supabase, id, user]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchData();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [fetchData]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;
        setAddingMember(true);
        setAddError(null);

        // Look up user by username
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", username.trim().toLowerCase())
            .single();

        if (!profile) {
            setAddError("User not found. Check the username.");
            setAddingMember(false);
            return;
        }

        // Check if already a member
        if (members.some((m) => m.user.id === profile.id)) {
            setAddError("User is already on the team.");
            setAddingMember(false);
            return;
        }

        const { error } = await supabase.from("project_members").insert({
            project_id: id,
            user_id: profile.id,
            role: "member",
        });

        if (error) {
            setAddError(error.message);
        } else {
            setUsername("");
            fetchData();
        }
        setAddingMember(false);
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("Remove this member from the project?")) return;
        await supabase.from("project_members").delete().eq("id", memberId);
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
    };

    const handlePostUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!updateTitle.trim() || !user) return;
        setPostingUpdate(true);

        const normalizedSourceUrls = splitLines(updateSourceUrls);
        const normalizedImageUrls = splitLines(updateImageUrls)
            .map(normalizeImageUrl)
            .filter(Boolean);

        await supabase.from("project_updates").insert({
            project_id: id,
            author_id: user.id,
            title: updateTitle.trim(),
            content: updateContent.trim() || null,
            version_tag: versionTag.trim() || null,
            source_urls: normalizedSourceUrls,
            image_urls: normalizedImageUrls,
        });

        setUpdateTitle("");
        setUpdateContent("");
        setVersionTag("");
        setUpdateSourceUrls("");
        setUpdateImageUrls("");
        setPostingUpdate(false);
    };

    const handleSaveHeroImage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project) return;

        setSavingHeroImage(true);
        setHeroImageMessage(null);

        const normalizedHeroUrl = normalizeImageUrl(projectHeroUrl);
        if (projectHeroUrl.trim() && !normalizedHeroUrl) {
            setHeroImageMessage("Please paste a valid public image URL.");
            setSavingHeroImage(false);
            return;
        }

        const { error } = await supabase
            .from("projects")
            .update({ cover_image_url: normalizedHeroUrl || null })
            .eq("id", id);

        if (error) {
            setHeroImageMessage(error.message);
        } else {
            setProject((current) => current ? { ...current, cover_image_url: normalizedHeroUrl || null } : current);
            setHeroImageMessage(normalizedHeroUrl ? "Hero image updated." : "Hero image removed.");
        }

        setSavingHeroImage(false);
    };

    const heroPreviewUrl = useMemo(() => normalizeImageUrl(projectHeroUrl), [projectHeroUrl]);

    const handleTogglePause = async () => {
        if (!project) return;
        setActionLoading("pause");
        const newStatus = project.status === "on_hold" ? "ongoing" : "on_hold";
        
        const { error } = await supabase
            .from("projects")
            .update({ status: newStatus })
            .eq("id", id);
            
        if (!error) {
            setProject({ ...project, status: newStatus });
        }
        setActionLoading(null);
    };

    const handleComplete = async () => {
        if (!project || !confirm("Mark this project as completed?")) return;
        setActionLoading("complete");
        
        const { error } = await supabase
            .from("projects")
            .update({ status: "completed" })
            .eq("id", id);
            
        if (!error) {
            setProject({ ...project, status: "completed" });
        }
        setActionLoading(null);
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to permanently delete this project? This action cannot be undone.")) return;
        setActionLoading("delete");
        
        const { error } = await supabase
            .from("projects")
            .delete()
            .eq("id", id);
            
        if (!error) {
            router.push("/projects");
        } else {
            setActionLoading(null);
            alert("Failed to delete project: " + error.message);
        }
    };

    if (userLoading || loading) {
        return <VajraLoader fullPage />;
    }

    if (!isMember && !isLead && !isFaculty) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <ShieldCheck className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                <p className="text-text-muted text-sm">Only project members can access this page.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            {/* Back link */}
            <Link
                href={`/projects/${id}`}
                className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary-light transition-colors mb-6"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Project
            </Link>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-bold">{project?.title || "Manage Project"}</h1>
                    <p className="text-xs text-text-muted">Manage team and post progress updates</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(isLead || isFaculty) && (
                    <div className="glass p-4 md:p-5 md:col-span-2">
                        <h2 className="text-sm font-bold mb-4 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-primary-light" />
                            Project Hero Image
                        </h2>

                        <form onSubmit={handleSaveHeroImage} className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
                            <div className="rounded-lg border border-[var(--ghost-border)] bg-white/[0.03] p-4 sm:p-5">
                                <div className="flex flex-col items-center text-center">
                                    {heroPreviewUrl ? (
                                        <div className="relative mx-auto h-32 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-[0_0_30px_rgba(76,201,240,0.08)] sm:h-40">
                                            <img
                                                src={heroPreviewUrl}
                                                alt="Project hero preview"
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="mx-auto flex h-32 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/70 px-4 text-text-muted sm:h-40">
                                            <ImageIcon className="mb-2 h-8 w-8" />
                                            <span className="text-sm font-medium">Paste a hero image URL</span>
                                        </div>
                                    )}

                                    <p className="mt-3 text-sm font-semibold text-foreground sm:mt-4 sm:text-base">Project Card Hero</p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-text-muted sm:text-xs">
                                        This image appears at the top of the public project page and on the project card.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="rounded-lg border border-white/8 bg-black/10 px-4 py-3">
                                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-text-secondary">
                                        <Link2 className="w-4 h-4" />
                                        Hero image URL
                                    </label>
                                    <input
                                        type="url"
                                        value={projectHeroUrl}
                                        onChange={(e) => {
                                            setProjectHeroUrl(e.target.value);
                                            setHeroImageMessage(null);
                                        }}
                                        placeholder="Paste image URL or Google Drive share link"
                                        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                                    />
                                    <p className="mt-2 text-xs text-text-muted">
                                        Use a wide landscape image. Google Drive links work when the file is public.
                                    </p>
                                </div>

                                <div className="rounded-lg border border-white/8 bg-cyan-400/5 px-4 py-3 text-sm text-text-secondary">
                                    <div className="flex items-start gap-2">
                                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                                        <p>Paste a URL to update the hero image, or clear the field and save to remove it.</p>
                                    </div>
                                </div>

                                {heroImageMessage && (
                                    <p className="text-xs text-text-muted">{heroImageMessage}</p>
                                )}

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={savingHeroImage}
                                        className="btn-primary text-sm disabled:opacity-50"
                                    >
                                        {savingHeroImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                        Save Hero Image
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Team Management — only for leads */}
                {(isLead || isFaculty) && (
                <div className="glass p-4 md:p-5">
                    <h2 className="text-sm font-bold mb-4 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary-light" />
                        Team Members
                    </h2>

                    {/* Add member form */}
                    <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={addingMember || !username.trim()}
                            className="px-3 py-2.5 rounded-lg bg-primary/15 text-primary-light border border-primary/20 hover:bg-primary/25 transition-all disabled:opacity-40"
                        >
                            {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        </button>
                    </form>

                    {addError && (
                        <p className="text-xs text-red-400 mb-3 px-1">{addError}</p>
                    )}

                    {/* Member list */}
                    <div className="space-y-2">
                        {members.map((m) => (
                            <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface/50 transition-colors">
                                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center overflow-hidden">
                                    {m.user.avatar_url ? (
                                        <img src={m.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-3.5 h-3.5 text-primary-light" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{m.user.display_name}</p>
                                    {m.user.username && (
                                        <p className="text-[10px] text-text-muted">@{m.user.username}</p>
                                    )}
                                </div>
                                {m.role === "lead" ? (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 font-semibold">
                                        Lead
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleRemoveMember(m.id)}
                                        className="text-text-muted hover:text-red-400 transition-colors p-1"
                                        title="Remove member"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                )}

                {/* Post Progress Update */}
                <div className="glass p-4 md:p-5">
                    <h2 className="text-sm font-bold mb-4 flex items-center gap-1.5">
                        <GitBranch className="w-4 h-4 text-primary-light" />
                        Post Progress Update
                    </h2>

                    <form onSubmit={handlePostUpdate} className="space-y-3">
                        <input
                            type="text"
                            value={updateTitle}
                            onChange={(e) => setUpdateTitle(e.target.value)}
                            placeholder="Update title (e.g. 'Circuit Board Assembled')"
                            required
                            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />

                        <textarea
                            value={updateContent}
                            onChange={(e) => setUpdateContent(e.target.value)}
                            placeholder="Details about what was done..."
                            rows={3}
                            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                        />

                        <div className="flex gap-2">
                            <div className="flex items-center gap-1.5 flex-1 bg-surface border border-border rounded-lg px-3 py-2.5">
                                <Tag className="w-3.5 h-3.5 text-text-muted" />
                                <input
                                    type="text"
                                    value={versionTag}
                                    onChange={(e) => setVersionTag(e.target.value)}
                                    placeholder="v0.1 (optional)"
                                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <Link2 className="w-4 h-4" />
                                Source Links
                            </label>
                            <textarea
                                value={updateSourceUrls}
                                onChange={(e) => setUpdateSourceUrls(e.target.value)}
                                placeholder={"One source URL per line\nhttps://github.com/...\nhttps://docs.google.com/..."}
                                rows={3}
                                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <ImageIcon className="w-4 h-4" />
                                Embedded Images
                            </label>
                            <textarea
                                value={updateImageUrls}
                                onChange={(e) => setUpdateImageUrls(e.target.value)}
                                placeholder={"One public image URL per line\nhttps://...\nhttps://drive.google.com/..."}
                                rows={4}
                                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={postingUpdate || !updateTitle.trim()}
                            className="btn-primary w-full !py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {postingUpdate ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Post Update
                        </button>
                    </form>
                </div>
            </div>

            {/* Project Actions — Only for leads/faculty */}
            {(isLead || isFaculty) && project && (
                <div className="mt-4 glass p-4 md:p-5 border-red-500/20">
                    <h2 className="text-sm font-bold mb-4 flex items-center gap-1.5 text-red-400">
                        <Settings className="w-4 h-4" />
                        Project Actions
                    </h2>
                    
                    <div className="flex flex-wrap gap-3">
                        {project.status !== "completed" && (
                            <button
                                onClick={handleComplete}
                                disabled={actionLoading !== null}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                            >
                                {actionLoading === "complete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Mark as Completed
                            </button>
                        )}

                        {project.status !== "completed" && (
                            <button
                                onClick={handleTogglePause}
                                disabled={actionLoading !== null}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition-all disabled:opacity-50"
                            >
                                {actionLoading === "pause" ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : project.status === "on_hold" ? (
                                    <Play className="w-4 h-4" />
                                ) : (
                                    <Pause className="w-4 h-4" />
                                )}
                                {project.status === "on_hold" ? "Resume Project" : "Pause Project"}
                            </button>
                        )}

                        <button
                            onClick={handleDelete}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50 ml-auto"
                        >
                            {actionLoading === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete Project
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
