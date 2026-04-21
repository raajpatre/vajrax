"use client";

import { useEffect, useMemo, useState } from "react";
import {
    User,
    Calendar,
    GitBranch,
    Tag,
    Users,
    Settings,
    ArrowLeft,
    UserPlus,
    Loader2,
    Send,
    Trash2,
    Mail,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { removeProjectMember } from "@/actions/project-members";

interface ProjectMember {
    id: string;
    role: string | null;
    joined_at: string | null;
    user: {
        id: string;
        display_name: string;
        avatar_url: string | null;
        username: string | null;
    };
}

interface ProjectUpdate {
    id: string;
    title: string;
    content: string | null;
    version_tag: string | null;
    source_urls: string[] | null;
    image_urls: string[] | null;
    created_at: string | null;
    author: {
        id: string;
        display_name: string;
        avatar_url: string | null;
    };
}

interface ProjectData {
    id: string;
    title: string;
    description: string;
    tech_stack: string[] | null;
    status: string;
    cover_image_url: string | null;
    created_at: string;
    created_by: string | null;
    creator?: {
        id: string;
        display_name: string;
        avatar_url: string | null;
        username: string | null;
    } | null;
}

const statusStyles: Record<string, string> = {
    ongoing: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    in_progress: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    completed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    on_hold: "text-slate-400 bg-slate-400/10 border-slate-400/20",
    planning: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    archived: "text-slate-400 bg-slate-400/10 border-slate-400/20",
};

export default function ProjectDetailClient({
    project,
    members: rawMembers,
    updates: rawUpdates,
}: {
    project: ProjectData;
    members: unknown[];
    updates: unknown[];
}) {
    const { user, isFaculty } = useUser();
    const supabase = createClient();

    const [members, setMembers] = useState<ProjectMember[]>(
        rawMembers as unknown as ProjectMember[]
    );
    const [updates, setUpdates] = useState<ProjectUpdate[]>(
        rawUpdates as unknown as ProjectUpdate[]
    );

    // Refetch members + updates client-side for live data
    useEffect(() => {
        const refetch = async () => {
            const { data: memData } = await supabase
                .from("project_members")
                .select("id, role, joined_at, user:profiles!project_members_user_id_fkey(id, display_name, avatar_url, username)")
                .eq("project_id", project.id);
            if (memData) {
                setMembers(memData.map(m => ({
                    ...m,
                    user: m.user as unknown as ProjectMember["user"],
                })) as unknown as ProjectMember[]);
            }

            const { data: updData } = await supabase
                .from("project_updates")
                .select("id, title, content, version_tag, source_urls, image_urls, created_at, author:profiles!project_updates_author_id_fkey(id, display_name, avatar_url)")
                .eq("project_id", project.id)
                .order("created_at", { ascending: false });
            if (updData) {
                setUpdates(updData.map(u => ({
                    ...u,
                    author: u.author as unknown as ProjectUpdate["author"],
                })) as unknown as ProjectUpdate[]);
            }
        };
        refetch();
    }, [supabase, project.id]);

    const isOwner = !!user?.id && project.created_by === user.id;
    const displayMembers = useMemo(() => {
        const creator = project.creator;
        const creatorAlreadyListed = !!creator && members.some((member) => member.user.id === creator.id);

        if (!creator || creatorAlreadyListed) {
            return members;
        }

        return [
            {
                id: `owner-${project.id}`,
                role: "lead",
                joined_at: project.created_at,
                user: creator,
            },
            ...members,
        ];
    }, [members, project.created_at, project.creator, project.id]);

    const isLead = isOwner || members.some(
        (m) => m.user.id === user?.id && m.role === "lead"
    );
    const isMember = isOwner || members.some((m) => m.user.id === user?.id);

    // --- Invite by email ---
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
    const [inviting, setInviting] = useState(false);
    const [memberActionError, setMemberActionError] = useState<string | null>(null);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !user) return;
        setInviting(true);
        setInviteError(null);
        setInviteSuccess(null);

        try {
            const input = inviteEmail.trim();
            let profile: { id: string; display_name: string } | null = null;

            // 1. If input looks like an email, look up via DB function
            if (input.includes("@")) {
                const { data } = await supabase.rpc("lookup_profile_by_email", {
                    lookup_email: input.toLowerCase(),
                });
                if (data && Array.isArray(data) && data.length > 0) {
                    profile = data[0];
                }
            }

            // 2. Try username match
            if (!profile) {
                const { data } = await supabase
                    .from("profiles")
                    .select("id, display_name")
                    .eq("username", input.toLowerCase())
                    .maybeSingle();
                profile = data;
            }

            // 3. Try display_name match
            if (!profile) {
                const { data } = await supabase
                    .from("profiles")
                    .select("id, display_name")
                    .ilike("display_name", input)
                    .limit(1)
                    .maybeSingle();
                profile = data;
            }

            if (!profile) {
                setInviteError("No member found. Try their email, username, or display name.");
                setInviting(false);
                return;
            }

            // Can't invite yourself
            if (profile.id === user.id) {
                setInviteError("You can't invite yourself.");
                setInviting(false);
                return;
            }

            // Check if already a member
            if (members.some((m) => m.user.id === profile.id)) {
                setInviteError("This person is already on the team.");
                setInviting(false);
                return;
            }

            // Send invite (not direct add)
            const { error } = await supabase.from("project_invites").insert({
                project_id: project.id,
                inviter_id: user.id,
                invitee_id: profile.id,
            });

            if (error) {
                if (error.code === "23505") {
                    setInviteError("Invite already sent to this person.");
                } else {
                    setInviteError(error.message);
                }
            } else {
                await supabase.from("notifications").insert({
                    user_id: profile.id,
                    type: "project_invite_received",
                    message: `${user.user_metadata?.display_name || "A team lead"} invited you to join ${project.title}.`,
                    related_entity_id: project.id,
                }).then(({ error: notificationError }) => {
                    if (notificationError) {
                        console.error("Notification insert failed:", notificationError.message);
                    }
                });

                setInviteEmail("");
                setInviteSuccess(`Invite sent to ${profile.display_name}!`);
                setTimeout(() => setInviteSuccess(null), 3000);
            }
        } catch {
            setInviteError("Something went wrong. Please try again.");
        }
        setInviting(false);
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("Remove this member from the project?")) return;
        setMemberActionError(null);
        setRemovingMemberId(memberId);

        const result = await removeProjectMember({
            projectId: project.id,
            memberId,
        });

        if (!result.ok) {
            setMemberActionError(result.error);
            setRemovingMemberId(null);
            return;
        }

        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        setRemovingMemberId(null);
    };

    // --- Post progress update ---
    const [updateTitle, setUpdateTitle] = useState("");
    const [updateContent, setUpdateContent] = useState("");
    const [versionTag, setVersionTag] = useState("");
    const [updateSourceUrls, setUpdateSourceUrls] = useState("");
    const [updateImageUrls, setUpdateImageUrls] = useState("");
    const [postingUpdate, setPostingUpdate] = useState(false);
    const [showUpdateForm, setShowUpdateForm] = useState(false);

    const handlePostUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!updateTitle.trim() || !user) return;
        setPostingUpdate(true);

        const sourceUrls = updateSourceUrls
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean);
        const imageUrls = updateImageUrls
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean);

        const { data } = await supabase
            .from("project_updates")
            .insert({
                project_id: project.id,
                author_id: user.id,
                title: updateTitle.trim(),
                content: updateContent.trim() || null,
                version_tag: versionTag.trim() || null,
                source_urls: sourceUrls,
                image_urls: imageUrls,
            })
            .select("id, title, content, version_tag, source_urls, image_urls, created_at")
            .single();

        if (data) {
            const { data: authorProfile } = await supabase
                .from("profiles")
                .select("id, display_name, avatar_url")
                .eq("id", user.id)
                .single();

            setUpdates((prev) => [
                {
                    ...data,
                    author: authorProfile || {
                        id: user.id,
                        display_name: "You",
                        avatar_url: null,
                    },
                },
                ...prev,
            ]);
        }

        setUpdateTitle("");
        setUpdateContent("");
        setVersionTag("");
        setUpdateSourceUrls("");
        setUpdateImageUrls("");
        setPostingUpdate(false);
        setShowUpdateForm(false);
    };

    return (
        <div className="relative min-h-screen overflow-hidden pb-20 pt-[calc(var(--nav-height)+2.5rem)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(0,229,255,0.10),transparent_30%),radial-gradient(circle_at_86%_12%,rgba(0,218,243,0.08),transparent_34%)]" />

            <div className="relative z-10 mx-auto max-w-4xl px-4">
                <Link
                    href="/projects"
                    className="mb-6 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:text-cyan-100"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All Projects
                </Link>

                {project.cover_image_url && (
                    <div className="mb-6 aspect-[3/1] overflow-hidden rounded-lg border border-[var(--ghost-border)]">
                        <img
                            src={project.cover_image_url}
                            alt={project.title}
                            className="h-full w-full object-cover"
                        />
                    </div>
                )}

                <div className="mb-5 flex items-start gap-3">
                    <div className="flex-1">
                        <h1 className="mb-1 text-3xl font-black tracking-tight">{project.title}</h1>
                        <p className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Calendar className="h-3 w-3" />
                            Started{" "}
                            {new Date(project.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyles[project.status] || statusStyles.planning}`}>
                        {project.status.replace("_", " ")}
                    </span>
                </div>

                <p className="mb-6 max-w-3xl text-sm leading-relaxed text-text-secondary">
                    {project.description}
                </p>

                {project.tech_stack && project.tech_stack.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-1.5">
                        {project.tech_stack.map((tech) => (
                            <span key={tech} className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-mono text-primary-light">
                                {tech}
                            </span>
                        ))}
                    </div>
                )}

                {(isLead || isFaculty) && (
                    <Link
                        href={`/projects/${project.id}/manage`}
                        className="btn-secondary mb-6 text-xs !px-4 !py-2"
                    >
                        <Settings className="h-3.5 w-3.5" />
                        Manage Project
                    </Link>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Team */}
                <div className="glass rounded-lg p-4 md:p-5">
                    <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary-light" />
                        Team ({displayMembers.length})
                    </h2>

                    {/* Invite form — visible to lead */}
                    {isLead && (
                        <div className="mb-4">
                            <form onSubmit={handleInvite} className="flex gap-1.5">
                                <div className="flex-1 relative">
                                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                                    <input
                                        type="text"
                                        value={inviteEmail}
                                        onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }}
                                        placeholder="Username or name"
                                        className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={inviting || !inviteEmail.trim()}
                                    className="px-2.5 py-2 rounded-lg bg-primary/15 text-primary-light border border-primary/20 hover:bg-primary/25 transition-all disabled:opacity-40"
                                >
                                    {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                                </button>
                            </form>
                            {inviteError && (
                                <p className="text-[10px] text-red-400 mt-1.5 px-1">{inviteError}</p>
                            )}
                            <AnimatePresence>
                                {inviteSuccess && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="text-[10px] text-emerald-400 mt-1.5 px-1"
                                    >
                                        ✓ {inviteSuccess}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Member list */}
                    {memberActionError && (
                        <p className="mb-3 px-1 text-[10px] text-red-400">{memberActionError}</p>
                    )}
                    <div className="space-y-2.5">
                        {displayMembers.map((m) => (
                            <div key={m.id} className="flex items-center gap-2.5 group">
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
                                        Leader
                                    </span>
                                ) : isLead ? (
                                    <button
                                        onClick={() => handleRemoveMember(m.id)}
                                        disabled={removingMemberId === m.id}
                                        className="text-text-muted hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                                        title="Remove member"
                                    >
                                        {removingMemberId === m.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3 h-3" />
                                        )}
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Progress Updates */}
                <div className="glass rounded-lg p-4 md:p-5 md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold flex items-center gap-1.5">
                            <GitBranch className="w-4 h-4 text-primary-light" />
                            Progress Log ({updates.length})
                        </h2>
                        {isMember && !showUpdateForm && (
                            <button
                                onClick={() => setShowUpdateForm(true)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-primary/10 text-primary-light border border-primary/20 hover:bg-primary/20 transition-all"
                            >
                                <Send className="w-3 h-3" />
                                Add Update
                            </button>
                        )}
                    </div>

                    {/* Inline update form — visible to ALL project members */}
                    <AnimatePresence>
                        {showUpdateForm && isMember && (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                onSubmit={handlePostUpdate}
                                className="mb-4 p-4 rounded-xl bg-surface/50 border border-border space-y-2.5 overflow-hidden"
                            >
                                <input
                                    type="text"
                                    value={updateTitle}
                                    onChange={(e) => setUpdateTitle(e.target.value)}
                                    placeholder="Update title (e.g. 'Motor Assembly Complete')"
                                    required
                                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                                <textarea
                                    value={updateContent}
                                    onChange={(e) => setUpdateContent(e.target.value)}
                                    placeholder="Details about what was done..."
                                    rows={2}
                                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                                />
                                <textarea
                                    value={updateSourceUrls}
                                    onChange={(e) => setUpdateSourceUrls(e.target.value)}
                                    placeholder={"Source links (one per line)\nhttps://github.com/...\nhttps://docs.google.com/..."}
                                    rows={2}
                                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                                />
                                <textarea
                                    value={updateImageUrls}
                                    onChange={(e) => setUpdateImageUrls(e.target.value)}
                                    placeholder={"Embedded image URLs (one per line)\nhttps://...\nhttps://drive.google.com/..."}
                                    rows={3}
                                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                                />
                                <div className="flex gap-2 items-center">
                                    <div className="flex items-center gap-1 flex-1 bg-surface border border-border rounded-lg px-2.5 py-2">
                                        <Tag className="w-3 h-3 text-text-muted" />
                                        <input
                                            type="text"
                                            value={versionTag}
                                            onChange={(e) => setVersionTag(e.target.value)}
                                            placeholder="v0.1 (optional)"
                                            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-text-muted focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowUpdateForm(false)}
                                        className="px-3 py-2 rounded-lg text-xs text-text-muted hover:text-foreground border border-border hover:bg-surface transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={postingUpdate || !updateTitle.trim()}
                                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary/15 text-primary-light border border-primary/20 hover:bg-primary/25 transition-all disabled:opacity-40 flex items-center gap-1"
                                    >
                                        {postingUpdate ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                        Post
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {updates.length === 0 ? (
                        <p className="text-xs text-text-muted text-center py-8">
                            {isMember ? "No updates yet. Add your first progress update!" : "No progress updates yet."}
                        </p>
                    ) : (
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

                            <div className="space-y-4">
                                {updates.map((update, i) => (
                                    <motion.div
                                        key={update.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="relative pl-8"
                                    >
                                        {/* Dot */}
                                        <div className="absolute left-[6px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background z-10" />

                                        <div className="flex items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-sm font-semibold">{update.title}</h4>
                                                    {update.version_tag && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 text-[10px] font-mono border border-emerald-400/20">
                                                            <Tag className="w-2.5 h-2.5" />
                                                            {update.version_tag}
                                                        </span>
                                                    )}
                                                </div>
                                                {update.content && (
                                                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed whitespace-pre-wrap">
                                                        {update.content}
                                                    </p>
                                                )}
                                                {update.source_urls && update.source_urls.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {update.source_urls.map((sourceUrl) => (
                                                            <a
                                                                key={sourceUrl}
                                                                href={sourceUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-300/15"
                                                            >
                                                                Source
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                                {update.image_urls && update.image_urls.length > 0 && (
                                                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                        {update.image_urls.map((imageUrl) => (
                                                            <a
                                                                key={imageUrl}
                                                                href={imageUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="overflow-hidden rounded-lg border border-white/10 bg-surface/60"
                                                            >
                                                                <img
                                                                    src={imageUrl}
                                                                    alt={update.title}
                                                                    className="h-24 w-full object-cover transition-transform duration-300 hover:scale-105"
                                                                />
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                                                    {update.author.display_name} ·{" "}
                                                    {update.created_at
                                                        ? new Date(update.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                                        : "—"
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
