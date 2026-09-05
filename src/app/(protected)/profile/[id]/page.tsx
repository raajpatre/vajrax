"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import {
    Github,
    Linkedin,
    User,
    Calendar,
    ShieldCheck,
    Camera,
    Loader2,
    GraduationCap,
    FolderKanban,
    CircleCheckBig,
    Mail,
    Clock,
    ExternalLink,
    Check,
    X,
    Pencil,
    Lock,
    ChevronDown,
    BadgeCheck,
    Cpu,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import { Tables } from "@/types/database";
import type { LucideIcon } from "lucide-react";
import { getProfileProjectCounts } from "@/actions/profile";

type Profile = Tables<"profiles">;

/* ── 3D Lanyard (dynamic) ─────────────────────────── */
const ProfileLanyard = dynamic(() => import("@/components/profile/ProfileLanyard"), {
    ssr: false,
    loading: () => (
        <div
            className="flex min-h-[420px] w-full items-center justify-center rounded-md border"
            style={{
                background: "rgba(13,17,23,0.8)",
                borderColor: "rgba(0,229,255,0.20)",
            }}
        >
            <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#00e5ff" }} />
                <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "#8b9ab0" }}>
                    Loading lanyard...
                </p>
            </div>
        </div>
    ),
});

/* ── Role config ──────────────────────────────────── */
const ROLE_CFG: Record<string, { fg: string; bg: string; bd: string; label: string }> = {
    member:            { fg: "#8b9ab0", bg: "rgba(139,154,176,0.10)", bd: "rgba(139,154,176,0.40)", label: "MEMBER" },
    president:         { fg: "#f59e0b", bg: "rgba(245,158,11,0.10)",  bd: "rgba(245,158,11,0.45)",  label: "PRESIDENT" },
    vice_president:    { fg: "#a78bfa", bg: "rgba(167,139,250,0.10)", bd: "rgba(167,139,250,0.45)", label: "VICE PRESIDENT" },
    faculty:           { fg: "#00e5ff", bg: "rgba(0,229,255,0.10)",   bd: "rgba(0,229,255,0.45)",   label: "FACULTY" },
    inventory_manager: { fg: "#22c55e", bg: "rgba(34,197,94,0.10)",   bd: "rgba(34,197,94,0.45)",   label: "INV. MANAGER" },
    website_manager:   { fg: "#fbbf24", bg: "rgba(251,191,36,0.10)",  bd: "rgba(251,191,36,0.45)",  label: "WEB MANAGER" },
    printing_head:     { fg: "#f97316", bg: "rgba(249,115,22,0.10)",  bd: "rgba(249,115,22,0.45)",  label: "PRINT HEAD" },
};

function RolePill({ role, large }: { role: string; large?: boolean }) {
    const c = ROLE_CFG[role] ?? ROLE_CFG.member;
    return (
        <span
            className="inline-flex items-center rounded-sm border font-mono uppercase font-medium"
            style={{
                height: large ? 26 : 22,
                padding: large ? "0 10px" : "0 8px",
                fontSize: large ? 12 : 10.5,
                letterSpacing: "0.13em",
                color: c.fg,
                background: c.bg,
                borderColor: c.bd,
            }}
        >
            {c.label}
        </span>
    );
}

/* ── Stat card ────────────────────────────────────── */
function PrStatCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon: LucideIcon;
}) {
    return (
        <div
            className="rounded-md px-4 py-3 flex flex-col gap-1.5"
            style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.12)" }}
        >
            <div className="flex items-center justify-between">
                <span
                    className="font-mono text-[9.5px] uppercase tracking-[0.18em]"
                    style={{ color: "#8b9ab0" }}
                >
                    {label}
                </span>
                <Icon size={12} style={{ color: "#4a5568" }} />
            </div>
            <div
                className="font-sans font-semibold text-[14px] tracking-tight leading-snug truncate"
                style={{ color: "#f0f4ff" }}
            >
                {value}
            </div>
        </div>
    );
}

/* ── Edit modal ───────────────────────────────────── */
function EditProfileModal({
    profile,
    userEmail,
    onClose,
    onSaved,
}: {
    profile: Profile;
    userEmail?: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [displayName, setDisplayName] = useState(profile.display_name);
    const [bio, setBio] = useState(profile.bio || "");
    const contactEmail = userEmail || profile.contact_email || "";
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
    const MAX_BIO = 200;

    useEffect(() => {
        setDisplayName(profile.display_name);
        setBio(profile.bio || "");
        setGithubUrl(profile.github_url || "");
        setLinkedinUrl(profile.linkedin_url || "");
        setCurrentSemester(profile.current_semester ? String(profile.current_semester) : "");
        setAvatarPreview(profile.avatar_url);
    }, [profile]);

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

                const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
                avatarUrl = publicUrl;
            }

            const baseUpdatePayload = {
                display_name: displayName.trim(),
                bio: bio.trim() || null,
                contact_email: contactEmail || null,
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

            const { error: updateError } = await supabase
                .from("profiles")
                .update(updatePayload)
                .eq("id", profile.id);

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
                            "Changes saved, but semester could not be stored yet. Run feature-profile-semester.sql on Supabase then try again."
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
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
            setLoading(false);
        }
    };

    const initials = profile.display_name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 backdrop-blur-md"
                style={{ background: "rgba(7,9,15,0.75)" }}
                onClick={onClose}
            />
            <div className="absolute inset-0 grid place-items-center p-3 sm:p-6 pointer-events-none">
                <div
                    className="relative w-full max-w-lg bg-[#111820]/90 backdrop-blur-md rounded-md corner-ticks pointer-events-auto"
                    style={{
                        border: "1px solid rgba(0,229,255,0.28)",
                        boxShadow: "0 0 0 1px rgba(0,229,255,0.06), 0 24px 60px -24px rgba(0,0,0,0.8), 0 0 40px -16px rgba(0,229,255,0.35)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="ct-tr" /><span className="ct-bl" />
                    <div
                        className="absolute inset-x-0 top-0 h-px pointer-events-none rounded-t-md"
                        style={{
                            background:
                                "linear-gradient(90deg,transparent,rgba(0,229,255,0.6),transparent)",
                        }}
                    />

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-6 pb-2">
                        <h2 className="flex items-center gap-3 font-sans font-extrabold text-[#f0f4ff] text-[20px] tracking-tight leading-none">
                            Edit Profile
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-[#8b9ab0] hover:text-[#00e5ff] transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSave}>
                        <div className="p-5 space-y-4 max-h-[calc(100dvh-12rem)] overflow-y-auto">
                            {/* Avatar */}
                            <div className="flex justify-center">
                                <label className="group relative cursor-pointer">
                                    <div
                                        className="relative w-20 h-20 rounded-full grid place-items-center font-mono font-bold text-[22px] overflow-hidden transition-opacity group-hover:opacity-70"
                                        style={{
                                            background: "rgba(0,229,255,0.10)",
                                            border: "2px solid rgba(0,229,255,0.55)",
                                            color: "#00e5ff",
                                        }}
                                    >
                                        {avatarPreview ? (
                                            <img
                                                src={avatarPreview}
                                                alt="Avatar"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            initials
                                        )}
                                    </div>
                                    <div
                                        className="absolute inset-0 rounded-full grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ background: "rgba(0,229,255,0.18)" }}
                                    >
                                        <Camera size={18} style={{ color: "#00e5ff" }} />
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {/* Error */}
                            {error && (
                                <div
                                    className="flex items-start gap-2 rounded-sm border px-3 py-2 text-[12px]"
                                    style={{
                                        color: "#ef4444",
                                        background: "rgba(239,68,68,0.08)",
                                        borderColor: "rgba(239,68,68,0.40)",
                                    }}
                                >
                                    {error}
                                </div>
                            )}

                            {/* Display Name */}
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    required
                                    placeholder=" "
                                    className="peer w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] pl-11 pr-3 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors"
                                />
                                <span className="absolute left-0 top-0 bottom-0 grid place-items-center w-11 text-[#8b9ab0] pointer-events-none peer-focus:text-[#00e5ff] transition-colors">
                                    <User size={15} />
                                </span>
                                <label className="absolute left-11 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-6 peer-focus:bg-[#111820] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-valid:top-0 peer-valid:-translate-y-1/2 peer-valid:scale-[0.85] peer-valid:-translate-x-6 peer-valid:bg-[#111820] peer-valid:px-2 peer-valid:text-[#00e5ff]">
                                    Display Name
                                </label>
                            </div>

                            {/* Bio */}
                            <div className="relative group mt-2">
                                <textarea
                                    rows={3}
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
                                    placeholder=" "
                                    className="peer w-full bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] pl-11 pr-3 pt-3 pb-3 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors resize-none"
                                />
                                <span className="absolute left-0 top-0 h-11 grid place-items-center w-11 text-[#8b9ab0] pointer-events-none peer-focus:text-[#00e5ff] transition-colors">
                                    <Pencil size={15} />
                                </span>
                                <label className="absolute left-11 top-3 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-6 peer-focus:bg-[#111820] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-valid:top-0 peer-valid:-translate-y-1/2 peer-valid:scale-[0.85] peer-valid:-translate-x-6 peer-valid:bg-[#111820] peer-valid:px-2 peer-valid:text-[#00e5ff]">
                                    Bio
                                </label>
                                <span
                                    className="absolute bottom-2 right-2 font-mono text-[10px]"
                                    style={{ color: bio.length > MAX_BIO ? "#ef4444" : "#4a5568" }}
                                >
                                    {bio.length}/{MAX_BIO}
                                </span>
                            </div>

                            {/* Semester */}
                            {profile.role !== "faculty" && (
                                <div className="relative group">
                                    <select
                                        value={currentSemester}
                                        onChange={(e) => setCurrentSemester(e.target.value)}
                                        disabled={semesterUnavailable}
                                        className={`peer appearance-none w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] pl-11 pr-9 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors disabled:opacity-50 ${currentSemester ? '' : 'text-transparent'}`}
                                    >
                                        <option value="" style={{ background: "#111820", color: "#f0f4ff" }}></option>
                                        {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
                                            <option key={s} value={s} style={{ background: "#111820", color: "#f0f4ff" }}>
                                                Semester {s}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="absolute left-0 top-0 bottom-0 grid place-items-center w-11 text-[#8b9ab0] pointer-events-none peer-focus:text-[#00e5ff] transition-colors">
                                        <GraduationCap size={15} />
                                    </span>
                                    <label className={`absolute left-11 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 ${currentSemester ? 'top-0 -translate-y-1/2 scale-[0.85] -translate-x-6 bg-[#111820] px-2 text-[#00e5ff]' : 'peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-6 peer-focus:bg-[#111820] peer-focus:px-2 peer-focus:text-[#00e5ff]'}`}>
                                        Current Semester
                                    </label>
                                    <span className="absolute right-0 top-0 bottom-0 grid place-items-center w-11 pointer-events-none text-[#8b9ab0]">
                                        <ChevronDown size={15} />
                                    </span>
                                </div>
                            )}

                            {/* GitHub + LinkedIn */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <input
                                        type="url"
                                        value={githubUrl}
                                        onChange={(e) => setGithubUrl(e.target.value)}
                                        placeholder=" "
                                        className="peer w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] pl-11 pr-3 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors"
                                    />
                                    <span className="absolute left-0 top-0 bottom-0 grid place-items-center w-11 text-[#8b9ab0] pointer-events-none peer-focus:text-[#00e5ff] transition-colors">
                                        <Github size={15} />
                                    </span>
                                    <label className="absolute left-11 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-6 peer-focus:bg-[#111820] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-valid:top-0 peer-valid:-translate-y-1/2 peer-valid:scale-[0.85] peer-valid:-translate-x-6 peer-valid:bg-[#111820] peer-valid:px-2 peer-valid:text-[#00e5ff]">
                                        GitHub URL
                                    </label>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="url"
                                        value={linkedinUrl}
                                        onChange={(e) => setLinkedinUrl(e.target.value)}
                                        placeholder=" "
                                        className="peer w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] pl-11 pr-3 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors"
                                    />
                                    <span className="absolute left-0 top-0 bottom-0 grid place-items-center w-11 text-[#8b9ab0] pointer-events-none peer-focus:text-[#00e5ff] transition-colors">
                                        <Linkedin size={15} />
                                    </span>
                                    <label className="absolute left-11 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-6 peer-focus:bg-[#111820] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-valid:top-0 peer-valid:-translate-y-1/2 peer-valid:scale-[0.85] peer-valid:-translate-x-6 peer-valid:bg-[#111820] peer-valid:px-2 peer-valid:text-[#00e5ff]">
                                        LinkedIn URL
                                    </label>
                                </div>
                            </div>

                            {/* Read-only email */}
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={contactEmail}
                                    readOnly
                                    className="w-full h-11 bg-transparent border border-[rgba(0,229,255,0.12)] rounded-md text-[14px] text-[#8b9ab0] pl-11 pr-20 outline-none"
                                />
                                <span className="absolute left-0 top-0 bottom-0 grid place-items-center w-11 text-[#4a5568] pointer-events-none">
                                    <Lock size={15} />
                                </span>
                                <label className="absolute left-11 top-0 -translate-y-1/2 scale-[0.85] -translate-x-6 bg-[#111820] px-2 text-[#4a5568] pointer-events-none">
                                    Email
                                </label>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#4a5568]">
                                    Read-Only
                                </span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 flex flex-col sm:flex-row items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto sm:ml-auto h-11 px-6 rounded-md font-medium text-[14px] text-[#8b9ab0] hover:text-[#f0f4ff] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !displayName.trim()}
                                className="w-full sm:w-auto h-11 px-6 rounded-md bg-[#00e5ff] text-[#07090f] font-semibold text-[14px] hover:bg-[#00d0e6] transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                            >
                                {loading ? <><Loader2 size={15} className="animate-spin" /> Saving</> : <><Check size={15} /> Save Changes</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

/* ── Page ─────────────────────────────────────────── */
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
        const [{ data: profileData }, counts] = await Promise.all([
            supabase.from("profiles").select("*").eq("id", userId).single(),
            getProfileProjectCounts(userId),
        ]);

        if (profileData) setProfile(profileData);
        setCurrentProjectCount(counts.active);
        setCompletedProjectCount(counts.completed);
        setLoading(false);
    }, [supabase, userId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    if (authLoading || loading) return <VajraLoader fullPage />;

    if (!profile) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-16 text-center">
                <User className="mx-auto mb-4 h-16 w-16" style={{ color: "#4a5568" }} />
                <h2 className="mb-2 text-xl font-bold" style={{ color: "#f0f4ff" }}>
                    User not found
                </h2>
                <p className="text-sm" style={{ color: "#8b9ab0" }}>
                    This profile doesn&apos;t exist.
                </p>
            </div>
        );
    }

    const joinedLabel = new Date(profile.created_at)
        .toLocaleDateString("en-GB", { month: "short", year: "numeric" })
        .toUpperCase();
    const semesterLabel = profile.current_semester
        ? `Semester ${profile.current_semester}`
        : "Not set";
    const updatedLabel = new Date(profile.updated_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).toUpperCase();

    return (
        <div className="min-h-screen relative" style={{ background: "#07090f" }}>
            {/* Grid bg */}
            <div
                className="fixed inset-0 pointer-events-none animate-grid-pan"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            {/* Scanlines */}
            <div className="fixed inset-0 pointer-events-none scanline animate-scanline-pan opacity-50" />
            {/* Cyan radial glow */}
            <div
                className="fixed top-0 left-0 lg:left-64 w-[600px] h-[400px] pointer-events-none"
                style={{ background: "radial-gradient(ellipse,rgba(0,229,255,0.06) 0%,transparent 70%)" }}
            />

            <div className="relative max-w-5xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-16 sm:pb-20">


                {/* Stacks on mobile, side-by-side on lg+ */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 lg:gap-10">
                    {/* LEFT — lanyard + edit button */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-full max-h-[380px] lg:max-h-none overflow-visible pt-12">
                            <ProfileLanyard
                                avatarUrl={profile.avatar_url}
                                displayName={profile.display_name}
                                roleLabel={ROLE_CFG[profile.role ?? "member"]?.label ?? profile.role ?? "MEMBER"}
                                cameraDistance={20}
                            />
                        </div>
                        {isOwnProfile && (
                            <button
                                onClick={() => setShowEdit(true)}
                                className="inline-flex items-center gap-2 h-8 px-3 rounded-sm border text-[12.5px] font-medium transition-colors"
                                style={{
                                    color: "#8b9ab0",
                                    borderColor: "rgba(0,229,255,0.18)",
                                    background: "transparent",
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.color = "#f0f4ff";
                                    e.currentTarget.style.borderColor = "rgba(0,229,255,0.40)";
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.color = "#8b9ab0";
                                    e.currentTarget.style.borderColor = "rgba(0,229,255,0.18)";
                                }}
                            >
                                <Pencil size={13} />
                                Edit Profile
                            </button>
                        )}

                    </div>

                    {/* RIGHT — info */}
                    <div className="space-y-6">
                        {/* Name + role */}
                        <div>
                            <div className="flex items-start gap-3 flex-wrap">
                                <h1
                                    className="font-sans font-black tracking-tight leading-none"
                                    style={{ fontSize: "clamp(26px, 6vw, 36px)", color: "#f0f4ff" }}
                                >
                                    {profile.display_name}
                                </h1>
                                <div className="mt-1.5">
                                    <RolePill role={profile.role ?? "member"} large />
                                </div>
                            </div>
                            <p
                                className="text-[14px] mt-3 leading-relaxed max-w-[58ch]"
                                style={{ color: "#8b9ab0" }}
                            >
                                {profile.bio || "A builder shaping the next generation of robotics at VajraX."}
                            </p>
                        </div>

                        {/* Safety certs */}
                        {(profile.safety_certifications ?? []).length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldCheck size={15} style={{ color: "#f59e0b" }} />
                                    <span
                                        className="font-mono text-[10.5px] uppercase tracking-[0.18em]"
                                        style={{ color: "#8b9ab0" }}
                                    >
                                        Safety Certifications
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {profile.safety_certifications.map((cert) => (
                                        <span
                                            key={cert}
                                            className="inline-flex items-center gap-1 h-[22px] px-2 rounded-sm border font-mono text-[10px] uppercase tracking-[0.10em]"
                                            style={{
                                                color: "#f59e0b",
                                                background: "rgba(245,158,11,0.10)",
                                                borderColor: "rgba(245,158,11,0.45)",
                                            }}
                                        >
                                            {cert}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-2">
                            <PrStatCard label="Joined VajraX"     value={joinedLabel}                       icon={Calendar} />
                            <PrStatCard label="Assigned Role"     value={ROLE_CFG[profile.role ?? "member"]?.label ?? profile.role ?? "MEMBER"} icon={BadgeCheck} />
                            <PrStatCard label="Current Semester"  value={semesterLabel}                     icon={GraduationCap} />
                            <PrStatCard label="Contact Email"     value={profile.contact_email || "Not added"} icon={Mail} />
                            <PrStatCard label="Active Projects"   value={String(currentProjectCount)}       icon={Cpu} />
                            <PrStatCard label="Completed Projects" value={String(completedProjectCount)}    icon={CircleCheckBig} />
                        </div>

                        {/* External links */}
                        {(profile.github_url || profile.linkedin_url) && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {profile.github_url && (
                                    <a
                                        href={profile.github_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-sm border text-[12.5px] font-medium transition-colors"
                                        style={{
                                            color: "#8b9ab0",
                                            borderColor: "rgba(0,229,255,0.18)",
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.color = "#f0f4ff";
                                            e.currentTarget.style.borderColor = "rgba(0,229,255,0.40)";
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.color = "#8b9ab0";
                                            e.currentTarget.style.borderColor = "rgba(0,229,255,0.18)";
                                        }}
                                    >
                                        <Github size={14} />
                                        GitHub
                                        <ExternalLink size={11} style={{ color: "#4a5568" }} />
                                    </a>
                                )}
                                {profile.linkedin_url && (
                                    <a
                                        href={profile.linkedin_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-sm border text-[12.5px] font-medium transition-colors"
                                        style={{
                                            color: "#8b9ab0",
                                            borderColor: "rgba(0,229,255,0.18)",
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.color = "#f0f4ff";
                                            e.currentTarget.style.borderColor = "rgba(0,229,255,0.40)";
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.color = "#8b9ab0";
                                            e.currentTarget.style.borderColor = "rgba(0,229,255,0.18)";
                                        }}
                                    >
                                        <Linkedin size={14} />
                                        LinkedIn
                                        <ExternalLink size={11} style={{ color: "#4a5568" }} />
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Update timestamp */}
                        <div
                            className="flex items-center gap-2 pt-2 border-t"
                            style={{ borderColor: "rgba(0,229,255,0.12)" }}
                        >
                            <Clock size={11} style={{ color: "#4a5568" }} />
                            <span
                                className="font-mono text-[10px] uppercase tracking-[0.16em]"
                                style={{ color: "#4a5568" }}
                            >
                                Profile updated{" "}
                                <span style={{ color: "#8b9ab0" }}>{updatedLabel}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {showEdit && profile && (
                <EditProfileModal
                    profile={profile}
                    userEmail={currentUser?.email}
                    onClose={() => setShowEdit(false)}
                    onSaved={fetchProfile}
                />
            )}
        </div>
    );
}
