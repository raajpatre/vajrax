"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Github, Linkedin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import { Tables } from "@/types/database";
import {
    User,
    Calendar,
    ShieldCheck,
    Edit3,
    Camera,
    Loader2,
    Save,
    X,
    AlertCircle,
    GraduationCap,
    FolderKanban,
    CircleCheckBig,
    Sparkles,
    ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Profile = Tables<"profiles">;

type ProjectMembership = {
    project_id: string;
    project: {
        status: string;
    } | null;
};

const ProfileLanyard = dynamic(() => import("@/components/profile/ProfileLanyard"), {
    ssr: false,
    loading: () => (
        <div className="flex min-h-[420px] w-full items-center justify-center rounded-lg border border-[var(--ghost-border)] bg-[radial-gradient(circle_at_top,rgba(0,229,255,0.16),rgba(8,20,34,0.58)_42%,rgba(5,14,28,0.84))]">
            <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-200" />
                <p className="text-sm font-medium text-cyan-100/85">Loading lanyard...</p>
            </div>
        </div>
    ),
});

const roleLabels: Record<string, { label: string; cls: string }> = {
    member: { label: "Member", cls: "badge-member" },
    president: { label: "President", cls: "badge-president" },
    vice_president: { label: "Vice President", cls: "badge-vp" },
    faculty: { label: "Faculty", cls: "badge-faculty" },
    inventory_manager: { label: "Inventory Manager", cls: "badge-member" },
    website_manager: { label: "Website Manager", cls: "badge-website-manager" },
    printing_head: { label: "3D Printing Head", cls: "badge-printing-head" },
};

const semesterOptions = Array.from({ length: 8 }, (_, index) => index + 1);

function StatCard({
    icon,
    label,
    value,
    hint,
    href,
    empty = false,
}: {
    icon?: ReactNode;
    label?: string;
    value?: ReactNode;
    hint?: string;
    href?: string;
    empty?: boolean;
}) {
    const content = (
        <div
            className={`glass h-full min-h-[128px] p-5 ${empty ? "opacity-0 pointer-events-none select-none" : ""}`}
        >
            {!empty && (
                <>
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--ghost-border)] bg-cyan-300/8 text-cyan-100 shadow-[0_0_24px_rgba(76,201,240,0.12)]">
                            {icon}
                        </div>
                        {href && <ArrowUpRight className="h-4 w-4 text-text-muted" />}
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</p>
                    <div className="mt-3 text-xl font-semibold text-foreground">{value}</div>
                    {hint && <p className="mt-2 text-sm leading-relaxed text-text-secondary">{hint}</p>}
                </>
            )}
        </div>
    );

    if (href && !empty) {
        return (
            <Link href={href} target="_blank" rel="noreferrer" className="block h-full">
                {content}
            </Link>
        );
    }

    return content;
}

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
    const [currentSemester, setCurrentSemester] = useState<string>(
        profile.current_semester ? String(profile.current_semester) : ""
    );
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [semesterUnavailable, setSemesterUnavailable] = useState(false);

    const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setError("Image must be under 2MB.");
            return;
        }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            let avatarUrl = profile.avatar_url;

            if (avatarFile) {
                const ext = avatarFile.name.split(".").pop();
                const path = `${profile.id}/avatar.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from("avatars")
                    .upload(path, avatarFile, { upsert: true });

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

            const baseUpdatePayload = {
                display_name: displayName.trim(),
                bio: bio.trim() || null,
                contact_email: contactEmail.trim() || null,
                github_url: githubUrl.trim() || null,
                linkedin_url: linkedinUrl.trim() || null,
                avatar_url: avatarUrl,
            };

            const semesterValue =
                profile.role === "faculty" ? null : currentSemester ? Number(currentSemester) : null;

            const updatePayload =
                profile.role === "faculty"
                    ? baseUpdatePayload
                    : { ...baseUpdatePayload, current_semester: semesterValue };

            const { error: updateError } = await supabase.from("profiles").update(updatePayload).eq("id", profile.id);

            if (updateError) {
                const isSemesterSchemaError =
                    profile.role !== "faculty" &&
                    updateError.message?.includes("current_semester") &&
                    updateError.message?.includes("schema cache");

                if (isSemesterSchemaError) {
                    setSemesterUnavailable(true);

                    const { error: fallbackError } = await supabase
                        .from("profiles")
                        .update(baseUpdatePayload)
                        .eq("id", profile.id);

                    if (!fallbackError) {
                        onSaved();
                        setError(
                            "Your profile changes were saved, but semester could not be stored yet. Run feature-profile-semester.sql on Supabase and then try saving the semester again."
                        );
                        setLoading(false);
                        return;
                    }
                }

                setError(`Update failed: ${updateError.message || "Unknown error"}`);
                setLoading(false);
                return;
            }

            setLoading(false);
            onSaved();
            onClose();
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred while saving.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto px-4 pb-4 pt-[calc(var(--nav-height)+1rem)] sm:px-6 sm:pb-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 flex min-h-full items-start justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="glass-strong flex w-full max-w-4xl flex-col overflow-hidden rounded-lg"
                >
                    <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-6">
                        <div>
                            <h3 className="text-lg font-bold">Edit Profile</h3>
                            <p className="mt-1 text-sm text-text-muted">Update your public profile details without leaving this page.</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-text-muted transition-colors hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="max-h-[calc(100dvh-var(--nav-height)-3.25rem)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                        <form onSubmit={handleSave} className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 lg:col-span-2">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="rounded-lg border border-[var(--ghost-border)] bg-white/[0.03] p-5 lg:sticky lg:top-0">
                        <div className="flex flex-col items-center text-center">
                            <label className="group relative cursor-pointer">
                                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-primary/30 bg-primary/20 shadow-[0_0_40px_rgba(0,229,255,0.15)]">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <User className="h-10 w-10 text-primary-light" />
                                    )}
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                    <Camera className="h-6 w-6 text-white" />
                                </div>
                                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                            </label>
                            <p className="mt-4 text-base font-semibold text-foreground">Profile Photo</p>
                            <p className="mt-1 text-xs leading-relaxed text-text-muted">
                                Upload a square image for the cleanest avatar crop. Max size 2MB.
                            </p>
                            <div className="mt-5 w-full rounded-lg border border-white/8 bg-black/10 px-4 py-3 text-left">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                    Visibility
                                </p>
                                <p className="mt-2 text-sm text-text-secondary">
                                    Your contact email appears on the Innovators page if you choose to add one.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                                className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={4}
                                maxLength={200}
                                placeholder="Tell us about yourself..."
                                className="w-full resize-none rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                            <p className="mt-1 text-right text-[10px] text-text-muted">{bio.length}/200</p>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                                Contact Email <span className="text-xs font-normal text-text-muted">(shown on Innovators page)</span>
                            </label>
                            <input
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                placeholder="yourname@example.com"
                                className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                        </div>

                        {profile.role !== "faculty" ? (
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Current Semester</label>
                                <select
                                    value={currentSemester}
                                    onChange={(e) => setCurrentSemester(e.target.value)}
                                    disabled={semesterUnavailable}
                                    className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                                >
                                    <option value="">Select semester</option>
                                    {semesterOptions.map((semester) => (
                                        <option key={semester} value={semester}>
                                            Semester {semester}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="hidden md:block" />
                        )}

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-text-secondary">GitHub URL</label>
                            <div className="relative">
                                <Github className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                                <input
                                    type="url"
                                    value={githubUrl}
                                    onChange={(e) => setGithubUrl(e.target.value)}
                                    placeholder="https://github.com/username"
                                    className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-text-secondary">LinkedIn URL</label>
                            <div className="relative">
                                <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                                <input
                                    type="url"
                                    value={linkedinUrl}
                                    onChange={(e) => setLinkedinUrl(e.target.value)}
                                    placeholder="https://linkedin.com/in/username"
                                    className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={loading || !displayName.trim()}
                                className="btn-primary w-full md:w-auto md:min-w-[220px] !py-3 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const params = useParams();
    const userId = params.id as string;
    const { user: currentUser, loading: authLoading } = useUser();
    const supabase = useMemo(() => createClient(), []);

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [currentProjectCount, setCurrentProjectCount] = useState(0);
    const [completedProjectCount, setCompletedProjectCount] = useState(0);

    const isOwnProfile = currentUser?.id === userId;

    const fetchProfile = useCallback(async () => {
        setLoading(true);

        const [{ data: profileData }, { data: memberships }] = await Promise.all([
            supabase.from("profiles").select("*").eq("id", userId).single(),
            supabase
                .from("project_members")
                .select("project_id, project:projects!project_members_project_id_fkey(status)")
                .eq("user_id", userId),
        ]);

        if (profileData) setProfile(profileData);

        const mappedMemberships = ((memberships ?? []) as unknown as ProjectMembership[]).filter(
            (membership) => membership.project
        );

        setCurrentProjectCount(
            mappedMemberships.filter(
                (membership) =>
                    membership.project?.status !== "completed" && membership.project?.status !== "archived"
            ).length
        );
        setCompletedProjectCount(
            mappedMemberships.filter((membership) => membership.project?.status === "completed").length
        );
        setLoading(false);
    }, [supabase, userId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    if (authLoading || loading) {
        return <VajraLoader fullPage />;
    }

    if (!profile) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-16 text-center">
                <User className="mx-auto mb-4 h-16 w-16 text-text-muted" />
                <h2 className="mb-2 text-xl font-bold">User not found</h2>
                <p className="text-sm text-text-muted">This profile doesn&apos;t exist.</p>
            </div>
        );
    }

    const role = roleLabels[profile.role] ?? { label: profile.role ?? "Member", cls: "badge-member" };
    const semesterLabel = profile.current_semester ? `Semester ${profile.current_semester}` : "Not set";
    const joinedLabel = new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(320px,430px)_1fr] lg:items-start">
                <div className="lg:sticky lg:top-[calc(var(--nav-height)+2rem)]">
                    <ProfileLanyard
                        avatarUrl={profile.avatar_url}
                        displayName={profile.display_name}
                        roleLabel={role.label}
                        cameraDistance={20}
                    />
                </div>

                <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="glass md:col-span-2 xl:col-span-3 p-4 md:p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                                        {profile.display_name}
                                    </h1>
                                    <span className={`badge text-[10px] ${role.cls}`}>{role.label}</span>
                                </div>
                                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
                                    {profile.bio || "A builder shaping the next generation of robotics at VajraX."}
                                </p>
                                {!isOwnProfile && (
                                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
                                        Read-only member profile
                                    </p>
                                )}
                            </div>
                            {isOwnProfile && (
                                <button onClick={() => setShowEdit(true)} className="btn-secondary text-sm !px-4 !py-2.5">
                                    <Edit3 className="h-4 w-4" />
                                    Edit Profile
                                </button>
                            )}
                        </div>
                        {(profile.safety_certifications || []).length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-2">
                                {profile.safety_certifications.map((cert) => (
                                    <span
                                        key={cert}
                                        className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300"
                                    >
                                        <ShieldCheck className="h-3 w-3" />
                                        {cert}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <StatCard
                        icon={<Calendar className="h-5 w-5" />}
                        label="Joined VajraX"
                        value={joinedLabel}
                        hint="Membership timestamp from the VajraX profile record."
                    />

                    <StatCard
                        icon={<Sparkles className="h-5 w-5" />}
                        label="Assigned Role"
                        value={role.label}
                        hint="Club role currently attached to this member profile."
                    />

                    {profile.role !== "faculty" ? (
                        <StatCard
                            icon={<GraduationCap className="h-5 w-5" />}
                            label="Current Semester"
                            value={semesterLabel}
                        />
                    ) : (
                        <StatCard empty />
                    )}

                    <StatCard
                        icon={<Linkedin className="h-5 w-5" />}
                        label="LinkedIn"
                        value={profile.linkedin_url ? "Open profile" : "Not linked"}
                        hint={profile.linkedin_url ? "Professional presence and updates." : "No LinkedIn URL added yet."}
                        href={profile.linkedin_url ?? undefined}
                    />

                    <StatCard
                        icon={<Github className="h-5 w-5" />}
                        label="GitHub"
                        value={profile.github_url ? "Open Github Profile" : "Not linked"}
                        hint={profile.github_url ? "Code, experiments, and open source work." : "No GitHub URL added yet."}
                        href={profile.github_url ?? undefined}
                    />

                    <StatCard
                        icon={<FolderKanban className="h-5 w-5" />}
                        label="Current Projects"
                        value={currentProjectCount}
                        hint="Projects where the member is active and the project is not completed or archived."
                    />

                    <StatCard
                        icon={<CircleCheckBig className="h-5 w-5" />}
                        label="Completed Projects"
                        value={completedProjectCount}
                        hint="Projects the member is part of that have reached completed status."
                    />

                    <div className="glass p-4 md:p-5 md:col-span-2 xl:col-span-3">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--ghost-border)] bg-cyan-300/8 text-cyan-100 shadow-[0_0_24px_rgba(76,201,240,0.12)]">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Dashboard Notes</p>
                                <h2 className="text-lg font-semibold text-foreground">Member Snapshot</h2>
                            </div>
                        </div>
                        <div className="grid gap-3 text-sm text-text-secondary sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-lg border border-[var(--ghost-border)] bg-white/[0.03] p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Contact Email</p>
                                <p className="mt-2 break-all text-sm leading-relaxed text-foreground/90">
                                    {profile.contact_email || "Not added"}
                                </p>
                            </div>
                            <div className="rounded-lg border border-[var(--ghost-border)] bg-white/[0.03] p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Username</p>
                                <p className="mt-2 text-sm text-foreground">{profile.username || "Not set"}</p>
                            </div>
                            <div className="rounded-lg border border-[var(--ghost-border)] bg-white/[0.03] p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Profile Updated</p>
                                <p className="mt-2 text-sm text-foreground">
                                    {new Date(profile.updated_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showEdit && profile && (
                    <EditProfileModal
                        profile={profile}
                        onClose={() => setShowEdit(false)}
                        onSaved={() => {
                            fetchProfile();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
