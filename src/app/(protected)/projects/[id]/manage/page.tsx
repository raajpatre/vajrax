"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    ArrowLeftRight,
    ChevronDown,
    CheckCircle,
    CheckCircle2,
    Clock,
    Image as ImageIcon,
    Loader2,
    Mail,
    Pause,
    Play,
    Plus,
    Settings2,
    ShieldOff,
    Trash2,
    X,
} from "lucide-react";
import Link from "next/link";
import { removeProjectMember } from "@/actions/project-members";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ProjectData {
    title: string;
    description: string;
    status: string;
    cover_image_url: string | null;
    tech_stack: string[] | null;
    created_by: string | null;
}

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

interface PendingInvite {
    id: string;
    created_at: string;
    invitee: {
        id: string;
        display_name: string;
        username: string | null;
    };
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "in_progress", label: "IN PROGRESS", dot: "#f59e0b" },
    { value: "planning",    label: "PLANNING",    dot: "#00e5ff" },
    { value: "on_hold",     label: "ON HOLD",     dot: "#f97316" },
    { value: "completed",   label: "COMPLETED",   dot: "#22c55e" },
    { value: "archived",    label: "ARCHIVED",    dot: "#8b9ab0" },
] as const;

const CHIP_COLORS = [
    { border: "rgba(0,229,255,0.40)",   text: "#00e5ff" },
    { border: "rgba(139,92,246,0.45)",  text: "#a78bfa" },
    { border: "rgba(56,189,248,0.40)",  text: "#7dd3fc" },
    { border: "rgba(34,197,94,0.40)",   text: "#4ade80" },
    { border: "rgba(245,158,11,0.45)",  text: "#fbbf24" },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function normalizeImageUrl(raw: string) {
    const value = raw.trim();
    if (!value) return "";
    try {
        const url = new URL(value);
        if (url.hostname === "drive.google.com") {
            const fileId =
                url.searchParams.get("id") ||
                url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
            if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
        }
        return url.toString();
    } catch {
        return "";
    }
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

// ─────────────────────────────────────────────────────────────
// InsufficientPerms
// ─────────────────────────────────────────────────────────────

function InsufficientPerms({ projectId }: { projectId: string }) {
    return (
        <div
            className="min-h-screen flex items-center justify-center px-4"
            style={{ background: "#07090f" }}
        >
            <div
                className="relative max-w-sm w-full rounded-md overflow-hidden"
                style={{ background: "#0d1117", border: "1px solid rgba(245,158,11,0.30)" }}
            >
                <div
                    className="absolute inset-x-0 top-0 h-px pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(90deg, transparent, rgba(245,158,11,0.70), transparent)",
                    }}
                />
                <div className="p-8 flex flex-col items-center text-center">
                    <div
                        className="w-14 h-14 rounded-sm flex items-center justify-center mb-5"
                        style={{
                            background: "rgba(245,158,11,0.10)",
                            border: "1px solid rgba(245,158,11,0.30)",
                            boxShadow: "0 0 24px -6px rgba(245,158,11,0.45)",
                        }}
                    >
                        <ShieldOff size={24} style={{ color: "#f59e0b" }} />
                    </div>
                    <span
                        className="font-mono text-[10px] uppercase tracking-[0.22em] mb-2"
                        style={{ color: "#f59e0b" }}
                    >
                        // ERR 403
                    </span>
                    <h2
                        className="font-sans font-black text-xl mb-2 tracking-tight"
                        style={{ color: "#f0f4ff" }}
                    >
                        Access Denied
                    </h2>
                    <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: "#8b9ab0" }}>
                        Only project leads and faculty can access this management console.
                    </p>
                    <Link
                        href={`/projects/${projectId}`}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-colors"
                        style={{
                            background: "rgba(245,158,11,0.12)",
                            border: "1px solid rgba(245,158,11,0.30)",
                            color: "#f59e0b",
                        }}
                    >
                        <ArrowLeft size={13} />
                        Back to project
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// SectionCard
// ─────────────────────────────────────────────────────────────

function SectionCard({
    title,
    badge,
    action,
    children,
}: {
    title: string;
    badge?: number;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div
            className="rounded-md overflow-hidden"
            style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.14)" }}
        >
            <div
                className="h-11 px-4 flex items-center gap-3"
                style={{ borderBottom: "1px solid rgba(0,229,255,0.10)" }}
            >
                <div
                    className="h-3 w-0.5 rounded-full shrink-0"
                    style={{ background: "#00e5ff", boxShadow: "0 0 6px rgba(0,229,255,0.8)" }}
                />
                <span
                    className="font-mono text-[11px] uppercase tracking-[0.18em] leading-none"
                    style={{ color: "#f0f4ff" }}
                >
                    {title}
                </span>
                {badge !== undefined && (
                    <span
                        className="font-mono text-[9.5px] px-1.5 py-0.5 rounded-sm leading-none"
                        style={{
                            background: "rgba(0,229,255,0.10)",
                            border: "1px solid rgba(0,229,255,0.22)",
                            color: "#00e5ff",
                        }}
                    >
                        {String(badge).padStart(2, "0")}
                    </span>
                )}
                <div className="flex-1" />
                {action}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// StackBuilder
// ─────────────────────────────────────────────────────────────

function StackBuilder({
    chips,
    onChange,
}: {
    chips: string[];
    onChange: (chips: string[]) => void;
}) {
    const [input, setInput] = useState("");

    const addChip = () => {
        const val = input.trim();
        if (!val || chips.includes(val)) {
            setInput("");
            return;
        }
        onChange([...chips, val]);
        setInput("");
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {chips.map((chip, idx) => {
                    const color = CHIP_COLORS[idx % CHIP_COLORS.length];
                    return (
                        <span
                            key={chip}
                            className="inline-flex items-center gap-1 h-[22px] px-2 rounded-sm font-mono text-[10.5px] uppercase tracking-[0.08em]"
                            style={{
                                border: `1px solid ${color.border}`,
                                color: color.text,
                                background: "#07090f",
                            }}
                        >
                            {chip}
                            <button
                                type="button"
                                onClick={() => onChange(chips.filter((c) => c !== chip))}
                                className="opacity-60 hover:opacity-100 transition-opacity ml-0.5"
                                style={{ color: color.text }}
                            >
                                <X size={9} />
                            </button>
                        </span>
                    );
                })}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addChip();
                        }
                    }}
                    placeholder="e.g. ROS2, OpenCV"
                    className="flex-1 h-8 px-3 rounded-sm text-[12.5px] font-mono bg-[#07090f] text-[#f0f4ff] placeholder:text-[#4a5568] focus-cyan transition-colors"
                    style={{ border: "1px solid rgba(0,229,255,0.14)" }}
                />
                <button
                    type="button"
                    onClick={addChip}
                    className="h-8 px-3 rounded-sm font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00cfe8] transition-colors flex items-center gap-1"
                >
                    <Plus size={11} />
                    Add
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Shared input styles
// ─────────────────────────────────────────────────────────────

const fieldBorder = { border: "1px solid rgba(0,229,255,0.14)" } as React.CSSProperties;
const inputCls =
    "w-full h-9 px-3 rounded-sm text-[13px] bg-[#07090f] text-[#f0f4ff] placeholder:text-[#4a5568] focus-cyan transition-colors";

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function ProjectManagePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user, isFaculty, loading: userLoading } = useUser();
    const supabase = createClient();

    // core data
    const [project, setProject] = useState<ProjectData | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLead, setIsLead] = useState(false);

    // settings form
    const [settingsTitle, setSettingsTitle] = useState("");
    const [settingsDesc, setSettingsDesc] = useState("");
    const [settingsStatus, setSettingsStatus] = useState("in_progress");
    const [settingsCover, setSettingsCover] = useState("");
    const [settingsTech, setSettingsTech] = useState<string[]>([]);
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);

    // team management
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [sendingInvite, setSendingInvite] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
    const [memberError, setMemberError] = useState<string | null>(null);
    const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

    // transfer lead
    const [transferOpen, setTransferOpen] = useState(false);
    const [transferTarget, setTransferTarget] = useState("");
    const [transferring, setTransferring] = useState(false);
    const [transferError, setTransferError] = useState<string | null>(null);
    const transferRef = useRef<HTMLDivElement>(null);

    // danger zone
    const [actionLoading, setActionLoading] = useState<"delete" | "pause" | "complete" | null>(null);

    // ── fetch ──────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        setLoading(true);

        const { data: proj } = await supabase
            .from("projects")
            .select("title, description, status, cover_image_url, tech_stack, created_by")
            .eq("id", id)
            .single();

        if (proj) {
            setProject(proj);
            setSettingsTitle(proj.title ?? "");
            setSettingsDesc(proj.description ?? "");
            setSettingsStatus(proj.status ?? "in_progress");
            setSettingsCover(proj.cover_image_url ?? "");
            setSettingsTech(Array.isArray(proj.tech_stack) ? proj.tech_stack : []);
        }

        const { data: mem } = await supabase
            .from("project_members")
            .select(
                "id, role, user:profiles!project_members_user_id_fkey(id, display_name, avatar_url, username)"
            )
            .eq("project_id", id);

        const isOwner = !!user?.id && proj?.created_by === user.id;

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
            setIsLead(isOwner || mapped.some((m) => m.user.id === user?.id && m.role === "lead"));
        } else {
            setMembers([]);
            setIsLead(isOwner);
        }

        const { data: invites } = await supabase
            .from("project_invites")
            .select(
                "id, created_at, invitee:profiles!project_invites_invitee_id_fkey(id, display_name, username)"
            )
            .eq("project_id", id)
            .eq("status", "pending");

        if (invites) {
            setPendingInvites(
                invites.map((inv) => ({
                    ...inv,
                    invitee: inv.invitee as unknown as {
                        id: string;
                        display_name: string;
                        username: string | null;
                    },
                }))
            );
        } else {
            setPendingInvites([]);
        }

        setLoading(false);
    }, [supabase, id, user]);

    useEffect(() => {
        const t = window.setTimeout(() => { void fetchData(); }, 0);
        return () => window.clearTimeout(t);
    }, [fetchData]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (transferRef.current && !transferRef.current.contains(e.target as Node)) {
                setTransferOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── handlers ───────────────────────────────────────────────

    const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!project) return;
        setSavingSettings(true);
        setSettingsError(null);
        setSettingsSaved(false);

        const normalizedCover = normalizeImageUrl(settingsCover);
        if (settingsCover.trim() && !normalizedCover) {
            setSettingsError("Invalid cover image URL.");
            setSavingSettings(false);
            return;
        }

        const { error } = await supabase
            .from("projects")
            .update({
                title: settingsTitle.trim() || project.title,
                description: settingsDesc.trim() || project.description,
                status: settingsStatus,
                cover_image_url: normalizedCover || null,
                tech_stack: settingsTech,
            })
            .eq("id", id);

        if (error) {
            setSettingsError(error.message);
        } else {
            setProject((p) =>
                p
                    ? {
                          ...p,
                          title: settingsTitle.trim() || p.title,
                          description: settingsDesc.trim() || p.description,
                          status: settingsStatus,
                          cover_image_url: normalizedCover || null,
                          tech_stack: settingsTech,
                      }
                    : p
            );
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 3000);
            router.refresh();
        }

        setSavingSettings(false);
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("Remove this member from the project?")) return;
        setMemberError(null);
        setRemovingMemberId(memberId);

        const result = await removeProjectMember({ projectId: id, memberId });
        if (!result.ok) {
            setMemberError(result.error);
        } else {
            setMembers((prev) => prev.filter((m) => m.id !== memberId));
        }
        setRemovingMemberId(null);
    };

    const handleTransferLead = async () => {
        if (!transferTarget) return;
        setTransferring(true);
        setTransferError(null);

        const currentLeadMember = members.find((m) => m.role === "lead");

        const { error: e1 } = await supabase
            .from("project_members")
            .update({ role: "lead" })
            .eq("id", transferTarget);

        if (e1) {
            setTransferError(e1.message);
            setTransferring(false);
            return;
        }

        if (currentLeadMember) {
            await supabase
                .from("project_members")
                .update({ role: "member" })
                .eq("id", currentLeadMember.id);
        }

        setTransferOpen(false);
        setTransferTarget("");
        setTransferring(false);
        void fetchData();
    };

    const handleSendInvite = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !user) return;
        setSendingInvite(true);
        setInviteMsg(null);

        let profileId: string | null = null;

        if (inviteEmail.includes("@")) {
            const { data } = await supabase.rpc("lookup_profile_by_email", {
                lookup_email: inviteEmail.trim().toLowerCase(),
            });
            profileId = data as string | null;
        } else {
            const { data } = await supabase
                .from("profiles")
                .select("id")
                .eq("username", inviteEmail.trim().toLowerCase())
                .maybeSingle();
            profileId = data?.id ?? null;
        }

        if (!profileId) {
            setInviteMsg({ type: "err", text: "No VajraX member found with that email or username." });
            setSendingInvite(false);
            return;
        }

        if (profileId === user.id) {
            setInviteMsg({ type: "err", text: "You can't invite yourself." });
            setSendingInvite(false);
            return;
        }

        if (members.some((m) => m.user.id === profileId)) {
            setInviteMsg({ type: "err", text: "This person is already a member." });
            setSendingInvite(false);
            return;
        }

        const { error } = await supabase.from("project_invites").insert({
            project_id: id,
            inviter_id: user.id,
            invitee_id: profileId,
        });

        if (error) {
            setInviteMsg({ type: "err", text: error.message });
        } else {
            setInviteMsg({ type: "ok", text: "Invite sent." });
            setInviteEmail("");
            void fetchData();
        }
        setSendingInvite(false);
    };

    const handleRevokeInvite = async (inviteId: string) => {
        setRevokingInviteId(inviteId);
        await supabase.from("project_invites").delete().eq("id", inviteId);
        setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
        setRevokingInviteId(null);
    };

    const handleTogglePause = async () => {
        if (!project) return;
        setActionLoading("pause");
        const newStatus = project.status === "on_hold" ? "in_progress" : "on_hold";
        const { error } = await supabase.from("projects").update({ status: newStatus }).eq("id", id);
        if (!error) {
            setProject({ ...project, status: newStatus });
            setSettingsStatus(newStatus);
        }
        setActionLoading(null);
    };

    const handleComplete = async () => {
        if (!project || !confirm("Mark this project as completed?")) return;
        setActionLoading("complete");
        const { error } = await supabase.from("projects").update({ status: "completed" }).eq("id", id);
        if (!error) {
            setProject({ ...project, status: "completed" });
            setSettingsStatus("completed");
        }
        setActionLoading(null);
    };

    const handleDelete = async () => {
        if (!confirm("Permanently delete this project? This cannot be undone.")) return;
        setActionLoading("delete");
        const { error } = await supabase.from("projects").delete().eq("id", id);
        if (!error) {
            router.push("/projects");
        } else {
            setActionLoading(null);
            alert("Failed to delete project: " + error.message);
        }
    };

    // ── derived ────────────────────────────────────────────────

    const nonLeadMembers = members.filter((m) => m.role !== "lead");
    const selectedStatus =
        STATUS_OPTIONS.find((s) => s.value === settingsStatus) ?? STATUS_OPTIONS[0];

    // ── render ─────────────────────────────────────────────────

    if (userLoading || loading) return <VajraLoader fullPage />;
    if (!isLead && !isFaculty) return <InsufficientPerms projectId={id} />;

    return (
        <div className="min-h-screen" style={{ background: "#07090f" }}>
            <div className="max-w-3xl mx-auto px-8 pt-10 pb-20 space-y-6">
                {/* Back link */}
                <Link
                    href={`/projects/${id}`}
                    className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors hover:text-[#00e5ff]"
                    style={{ color: "#8b9ab0" }}
                >
                    <ArrowLeft size={13} />
                    Back to project
                </Link>

                {/* Page header */}
                <div>
                    <span
                        className="font-mono text-[10.5px] uppercase tracking-[0.22em] leading-none"
                        style={{ color: "#00e5ff" }}
                    >
                        // MANAGE PROJECT
                    </span>
                    <h1
                        className="font-sans font-black text-[28px] leading-none tracking-tight mt-1.5"
                        style={{ color: "#f0f4ff" }}
                    >
                        Manage Project
                    </h1>
                    {project?.title && (
                        <p
                            className="font-mono text-[11.5px] tracking-[0.06em] mt-1"
                            style={{ color: "#8b9ab0" }}
                        >
                            {project.title}
                        </p>
                    )}
                    <div className="h-px mt-4" style={{ background: "rgba(0,229,255,0.10)" }} />
                </div>

                {/* ── Project Settings ─────────────────────────── */}
                <SectionCard
                    title="Project Settings"
                    action={
                        settingsSaved ? (
                            <span
                                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]"
                                style={{ color: "#22c55e" }}
                            >
                                <CheckCircle2 size={12} />
                                Saved
                            </span>
                        ) : undefined
                    }
                >
                    <form onSubmit={handleSaveSettings} className="space-y-4">
                        <div className="space-y-1.5">
                            <label
                                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                                style={{ color: "#8b9ab0" }}
                            >
                                Title
                            </label>
                            <input
                                type="text"
                                value={settingsTitle}
                                onChange={(e) => setSettingsTitle(e.target.value)}
                                placeholder="Project title"
                                className={inputCls}
                                style={fieldBorder}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label
                                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                                style={{ color: "#8b9ab0" }}
                            >
                                Description
                            </label>
                            <textarea
                                value={settingsDesc}
                                onChange={(e) => setSettingsDesc(e.target.value)}
                                placeholder="What is this project about?"
                                rows={4}
                                className="w-full px-3 py-2 rounded-sm text-[13px] bg-[#07090f] text-[#f0f4ff] placeholder:text-[#4a5568] focus-cyan transition-colors resize-none"
                                style={fieldBorder}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label
                                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                                style={{ color: "#8b9ab0" }}
                            >
                                Status
                            </label>
                            <div className="relative">
                                <span
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
                                    style={{
                                        background: selectedStatus.dot,
                                        boxShadow: `0 0 6px ${selectedStatus.dot}`,
                                    }}
                                />
                                <select
                                    value={settingsStatus}
                                    onChange={(e) => setSettingsStatus(e.target.value)}
                                    className="w-full h-9 pl-8 pr-8 rounded-sm text-[12.5px] font-mono uppercase tracking-[0.10em] bg-[#07090f] focus-cyan appearance-none transition-colors cursor-pointer"
                                    style={{ ...fieldBorder, color: selectedStatus.dot }}
                                >
                                    {STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={13}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: "#4a5568" }}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label
                                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                                style={{ color: "#8b9ab0" }}
                            >
                                Cover Image URL
                            </label>
                            <div className="relative">
                                <ImageIcon
                                    size={14}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: "#4a5568" }}
                                />
                                <input
                                    type="text"
                                    value={settingsCover}
                                    onChange={(e) => setSettingsCover(e.target.value)}
                                    placeholder="https:// or Google Drive share link"
                                    className="w-full h-9 pl-8 pr-3 rounded-sm text-[13px] bg-[#07090f] text-[#f0f4ff] placeholder:text-[#4a5568] focus-cyan transition-colors"
                                    style={fieldBorder}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label
                                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                                style={{ color: "#8b9ab0" }}
                            >
                                Tech Stack
                            </label>
                            <StackBuilder chips={settingsTech} onChange={setSettingsTech} />
                        </div>

                        {settingsError && (
                            <p className="font-mono text-[11px]" style={{ color: "#ef4444" }}>
                                {settingsError}
                            </p>
                        )}

                        <div className="flex justify-end pt-1">
                            <button
                                type="submit"
                                disabled={savingSettings}
                                className="inline-flex items-center gap-2 h-9 px-5 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#07090f] disabled:opacity-50 transition-all"
                                style={{
                                    background: "#00e5ff",
                                    boxShadow: savingSettings
                                        ? "none"
                                        : "0 0 18px -4px rgba(0,229,255,0.55)",
                                }}
                            >
                                {savingSettings ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : (
                                    <Settings2 size={13} />
                                )}
                                Save Settings
                            </button>
                        </div>
                    </form>
                </SectionCard>

                {/* ── Team Management ──────────────────────────── */}
                <SectionCard
                    title="Team Management"
                    badge={members.length}
                    action={
                        nonLeadMembers.length > 0 ? (
                            <div className="relative" ref={transferRef}>
                                <button
                                    type="button"
                                    onClick={() => setTransferOpen((o) => !o)}
                                    className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] transition-colors"
                                    style={{
                                        background: "rgba(245,158,11,0.10)",
                                        border: "1px solid rgba(245,158,11,0.28)",
                                        color: "#f59e0b",
                                    }}
                                >
                                    <ArrowLeftRight size={10} />
                                    Transfer Lead
                                    <ChevronDown
                                        size={10}
                                        style={{
                                            transform: transferOpen ? "rotate(180deg)" : "none",
                                            transition: "transform 0.15s",
                                        }}
                                    />
                                </button>

                                {transferOpen && (
                                    <div
                                        className="absolute right-0 top-9 z-10 w-56 rounded-sm py-1"
                                        style={{
                                            background: "#111820",
                                            border: "1px solid rgba(245,158,11,0.28)",
                                            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                                        }}
                                    >
                                        <div
                                            className="px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em]"
                                            style={{
                                                color: "#8b9ab0",
                                                borderBottom: "1px solid rgba(0,229,255,0.08)",
                                            }}
                                        >
                                            Transfer lead to
                                        </div>
                                        {nonLeadMembers.map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => setTransferTarget(m.id)}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] transition-colors text-left"
                                                style={{
                                                    color:
                                                        transferTarget === m.id ? "#00e5ff" : "#f0f4ff",
                                                    background:
                                                        transferTarget === m.id
                                                            ? "rgba(0,229,255,0.06)"
                                                            : "transparent",
                                                }}
                                            >
                                                <span
                                                    className="w-6 h-6 rounded-sm flex items-center justify-center font-mono text-[9px] shrink-0"
                                                    style={{
                                                        background: "rgba(0,229,255,0.12)",
                                                        color: "#00e5ff",
                                                    }}
                                                >
                                                    {m.user.display_name?.slice(0, 2).toUpperCase() ||
                                                        "??"}
                                                </span>
                                                <span className="truncate">{m.user.display_name}</span>
                                                {transferTarget === m.id && (
                                                    <CheckCircle2
                                                        size={12}
                                                        className="ml-auto shrink-0"
                                                        style={{ color: "#00e5ff" }}
                                                    />
                                                )}
                                            </button>
                                        ))}
                                        <div
                                            className="px-3 py-2"
                                            style={{
                                                borderTop: "1px solid rgba(0,229,255,0.08)",
                                            }}
                                        >
                                            {transferError && (
                                                <p
                                                    className="font-mono text-[10px] mb-1.5"
                                                    style={{ color: "#ef4444" }}
                                                >
                                                    {transferError}
                                                </p>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => void handleTransferLead()}
                                                disabled={!transferTarget || transferring}
                                                className="w-full h-7 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                                                style={{
                                                    background: "rgba(245,158,11,0.85)",
                                                    color: "#07090f",
                                                }}
                                            >
                                                {transferring && (
                                                    <Loader2 size={11} className="animate-spin" />
                                                )}
                                                Confirm Transfer
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : undefined
                    }
                >
                    <div className="space-y-5">
                        {/* Member list */}
                        <div className="space-y-1">
                            {memberError && (
                                <p
                                    className="font-mono text-[11px] mb-2"
                                    style={{ color: "#ef4444" }}
                                >
                                    {memberError}
                                </p>
                            )}
                            {members.map((m) => {
                                const isCurrentLead = m.role === "lead";
                                const avatarColor = isCurrentLead ? "#f59e0b" : "#00e5ff";
                                const avatarBg = isCurrentLead
                                    ? "rgba(245,158,11,0.15)"
                                    : "rgba(0,229,255,0.12)";
                                return (
                                    <div
                                        key={m.id}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-sm"
                                        style={{ background: "rgba(0,229,255,0.03)" }}
                                    >
                                        <div
                                            className="w-8 h-8 rounded-sm flex items-center justify-center overflow-hidden shrink-0"
                                            style={{
                                                background: avatarBg,
                                                border: `1px solid ${avatarColor}40`,
                                            }}
                                        >
                                            {m.user.avatar_url ? (
                                                <img
                                                    src={m.user.avatar_url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span
                                                    className="font-mono text-[10px] font-bold"
                                                    style={{ color: avatarColor }}
                                                >
                                                    {m.user.display_name
                                                        ?.slice(0, 2)
                                                        .toUpperCase() || "??"}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p
                                                className="text-[13px] font-medium truncate"
                                                style={{ color: "#f0f4ff" }}
                                            >
                                                {m.user.display_name}
                                            </p>
                                            {m.user.username && (
                                                <p
                                                    className="font-mono text-[10px]"
                                                    style={{ color: "#4a5568" }}
                                                >
                                                    @{m.user.username}
                                                </p>
                                            )}
                                        </div>

                                        {isCurrentLead ? (
                                            <span
                                                className="font-mono text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-[0.12em]"
                                                style={{
                                                    background: "rgba(245,158,11,0.12)",
                                                    border: "1px solid rgba(245,158,11,0.30)",
                                                    color: "#f59e0b",
                                                }}
                                            >
                                                LEAD
                                            </span>
                                        ) : (
                                            <>
                                                <span
                                                    className="font-mono text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-[0.10em]"
                                                    style={{
                                                        background: "rgba(0,229,255,0.06)",
                                                        border: "1px solid rgba(0,229,255,0.18)",
                                                        color: "#8b9ab0",
                                                    }}
                                                >
                                                    {m.role ?? "member"}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleRemoveMember(m.id)}
                                                    disabled={removingMemberId === m.id}
                                                    className="w-7 h-7 rounded-sm flex items-center justify-center transition-all"
                                                    title="Remove member"
                                                    style={{
                                                        border: "1px solid transparent",
                                                        color: "#4a5568",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.color = "#ef4444";
                                                        e.currentTarget.style.borderColor =
                                                            "rgba(239,68,68,0.30)";
                                                        e.currentTarget.style.background =
                                                            "rgba(239,68,68,0.08)";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.color = "#4a5568";
                                                        e.currentTarget.style.borderColor =
                                                            "transparent";
                                                        e.currentTarget.style.background = "transparent";
                                                    }}
                                                >
                                                    {removingMemberId === m.id ? (
                                                        <Loader2 size={13} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={13} />
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="h-px" style={{ background: "rgba(0,229,255,0.08)" }} />

                        {/* Invite */}
                        <div className="space-y-2">
                            <div
                                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                                style={{ color: "#8b9ab0" }}
                            >
                                Invite member
                            </div>
                            <form onSubmit={handleSendInvite} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Mail
                                        size={13}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                        style={{ color: "#4a5568" }}
                                    />
                                    <input
                                        type="text"
                                        value={inviteEmail}
                                        onChange={(e) => {
                                            setInviteEmail(e.target.value);
                                            setInviteMsg(null);
                                        }}
                                        placeholder="Email or @username"
                                        className="w-full h-9 pl-8 pr-3 rounded-sm text-[13px] bg-[#07090f] text-[#f0f4ff] placeholder:text-[#4a5568] focus-cyan transition-colors"
                                        style={fieldBorder}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={sendingInvite || !inviteEmail.trim()}
                                    className="h-9 px-4 rounded-sm font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#07090f] disabled:opacity-50 transition-all flex items-center gap-1.5"
                                    style={{
                                        background: "#00e5ff",
                                        boxShadow: "0 0 14px -4px rgba(0,229,255,0.50)",
                                    }}
                                >
                                    {sendingInvite && (
                                        <Loader2 size={11} className="animate-spin" />
                                    )}
                                    Send Invite
                                </button>
                            </form>
                            {inviteMsg && (
                                <p
                                    className="font-mono text-[11px] flex items-center gap-1.5"
                                    style={{
                                        color: inviteMsg.type === "ok" ? "#22c55e" : "#ef4444",
                                    }}
                                >
                                    {inviteMsg.type === "ok" && <CheckCircle2 size={11} />}
                                    {inviteMsg.text}
                                </p>
                            )}
                        </div>

                        {/* Pending invites */}
                        {pendingInvites.length > 0 && (
                            <div className="space-y-2">
                                <div
                                    className="font-mono text-[10px] uppercase tracking-[0.18em]"
                                    style={{ color: "#8b9ab0" }}
                                >
                                    Pending Invites
                                </div>
                                <div className="space-y-1">
                                    {pendingInvites.map((inv) => (
                                        <div
                                            key={inv.id}
                                            className="flex items-center gap-3 px-3 py-2 rounded-sm"
                                            style={{
                                                background: "rgba(245,158,11,0.04)",
                                                border: "1px solid rgba(245,158,11,0.10)",
                                            }}
                                        >
                                            <Clock size={12} style={{ color: "#f59e0b" }} />
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className="text-[12.5px] truncate"
                                                    style={{ color: "#f0f4ff" }}
                                                >
                                                    {inv.invitee.display_name}
                                                </p>
                                                {inv.invitee.username && (
                                                    <p
                                                        className="font-mono text-[10px]"
                                                        style={{ color: "#4a5568" }}
                                                    >
                                                        @{inv.invitee.username}
                                                    </p>
                                                )}
                                            </div>
                                            <span
                                                className="font-mono text-[10px] shrink-0"
                                                style={{ color: "#4a5568" }}
                                            >
                                                {fmtDate(inv.created_at)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => void handleRevokeInvite(inv.id)}
                                                disabled={revokingInviteId === inv.id}
                                                className="font-mono text-[9.5px] uppercase tracking-[0.12em] px-2 py-1 rounded-sm transition-colors flex items-center gap-1"
                                                style={{
                                                    background: "rgba(239,68,68,0.08)",
                                                    border: "1px solid rgba(239,68,68,0.20)",
                                                    color: "#ef4444",
                                                }}
                                            >
                                                {revokingInviteId === inv.id ? (
                                                    <Loader2 size={10} className="animate-spin" />
                                                ) : (
                                                    "Revoke"
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* ── Danger Zone ───────────────────────────────── */}
                {project && (
                    <SectionCard title="Danger Zone">
                        <div className="flex flex-wrap gap-3">
                            {project.status !== "completed" && (
                                <button
                                    type="button"
                                    onClick={() => void handleComplete()}
                                    disabled={actionLoading !== null}
                                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-sm font-mono text-[10.5px] uppercase tracking-[0.12em] disabled:opacity-50 transition-all"
                                    style={{
                                        background: "rgba(34,197,94,0.08)",
                                        border: "1px solid rgba(34,197,94,0.25)",
                                        color: "#22c55e",
                                    }}
                                >
                                    {actionLoading === "complete" ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <CheckCircle size={13} />
                                    )}
                                    Mark Completed
                                </button>
                            )}

                            {project.status !== "completed" && (
                                <button
                                    type="button"
                                    onClick={() => void handleTogglePause()}
                                    disabled={actionLoading !== null}
                                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-sm font-mono text-[10.5px] uppercase tracking-[0.12em] disabled:opacity-50 transition-all"
                                    style={{
                                        background: "rgba(245,158,11,0.08)",
                                        border: "1px solid rgba(245,158,11,0.25)",
                                        color: "#f59e0b",
                                    }}
                                >
                                    {actionLoading === "pause" ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : project.status === "on_hold" ? (
                                        <Play size={13} />
                                    ) : (
                                        <Pause size={13} />
                                    )}
                                    {project.status === "on_hold" ? "Resume Project" : "Pause Project"}
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => void handleDelete()}
                                disabled={actionLoading !== null}
                                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-sm font-mono text-[10.5px] uppercase tracking-[0.12em] disabled:opacity-50 transition-all ml-auto"
                                style={{
                                    background: "rgba(239,68,68,0.08)",
                                    border: "1px solid rgba(239,68,68,0.25)",
                                    color: "#ef4444",
                                }}
                            >
                                {actionLoading === "delete" ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : (
                                    <Trash2 size={13} />
                                )}
                                Delete Project
                            </button>
                        </div>
                    </SectionCard>
                )}
            </div>
        </div>
    );
}
