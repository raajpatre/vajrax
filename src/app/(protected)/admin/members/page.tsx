"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import { grantSafetyCertification, revokeSafetyCertification } from "@/actions/safety-certifications";
import {
    Search,
    X,
    Trash2,
    Plus,
    ShieldCheck,
    Check,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    UsersRound,
    User,
} from "lucide-react";

/* ── types ────────────────────────────────────────────────── */
type MemberRole =
    | "member"
    | "president"
    | "vice_president"
    | "faculty"
    | "inventory_manager"
    | "lead_developer"
    | "project_manager"
    | "printing_head"
    | "social_media_head"
    | "social_media_co_head"
    | "sponsorship_head"
    | "workshop_head"
    | "mechanics_head"
    | "cad_head"
    | "electronics_head"
    | "procurement_head"
    | "makerspace_head";

interface MemberProfile {
    id: string;
    display_name: string;
    avatar_url: string | null;
    contact_email: string | null;
    role: MemberRole; // primary role
    roles: MemberRole[];
    custom_tags: string[] | null;
    safety_certifications: string[];
    created_at: string;
}

interface TagObject {
    name: string;
    color: string; // hex
}

/* ── tag serialization ────────────────────────────────────── */
function parseTag(raw: string): TagObject {
    try {
        const p = JSON.parse(raw);
        if (p.name && p.color) return p;
    } catch { }
    return { name: raw, color: "#00e5ff" };
}
function serializeTag(t: TagObject): string {
    return JSON.stringify(t);
}

/* ── color presets ────────────────────────────────────────── */
const TC_COLORS = [
    { id: "cyan",    hex: "#00e5ff" },
    { id: "amber",   hex: "#f59e0b" },
    { id: "emerald", hex: "#22c55e" },
    { id: "violet",  hex: "#a78bfa" },
    { id: "rose",    hex: "#fb7185" },
    { id: "sky",     hex: "#38bdf8" },
    { id: "teal",    hex: "#5eead4" },
    { id: "slate",   hex: "#8b9ab0" },
];

/* ── role config ──────────────────────────────────────────── */
const ROLE_CFG: Record<string, { fg: string; bg: string; bd: string; label: string }> = {
    member:               { fg: "#8b9ab0", bg: "rgba(139,154,176,0.12)", bd: "rgba(139,154,176,0.45)", label: "MEMBER" },
    faculty:              { fg: "#00e5ff", bg: "rgba(0,229,255,0.12)",   bd: "rgba(0,229,255,0.50)",   label: "FACULTY" },
    president:            { fg: "#f59e0b", bg: "rgba(245,158,11,0.12)",  bd: "rgba(245,158,11,0.50)",  label: "PRESIDENT" },
    vice_president:       { fg: "#a78bfa", bg: "rgba(167,139,250,0.12)", bd: "rgba(167,139,250,0.50)", label: "VICE PRESIDENT" },
    project_manager:      { fg: "#ec4899", bg: "rgba(236,72,153,0.12)",  bd: "rgba(236,72,153,0.50)",  label: "PROJECT MANAGER" },
    inventory_manager:    { fg: "#22c55e", bg: "rgba(34,197,94,0.12)",   bd: "rgba(34,197,94,0.50)",   label: "INV. MANAGER" },
    lead_developer:       { fg: "#fbbf24", bg: "rgba(251,191,36,0.12)",  bd: "rgba(251,191,36,0.50)",  label: "LEAD DEVELOPER" },
    printing_head:        { fg: "#f97316", bg: "rgba(249,115,22,0.12)",  bd: "rgba(249,115,22,0.50)",  label: "PRINT HEAD" },
    social_media_head:    { fg: "#ef4444", bg: "rgba(239,68,68,0.12)",   bd: "rgba(239,68,68,0.50)",   label: "SOCIAL MEDIA HEAD" },
    social_media_co_head: { fg: "#ef4444", bg: "rgba(239,68,68,0.08)",   bd: "rgba(239,68,68,0.30)",   label: "SOCIAL MEDIA CO-HEAD" },
    sponsorship_head:     { fg: "#10b981", bg: "rgba(16,185,129,0.12)",  bd: "rgba(16,185,129,0.50)",  label: "SPONSORSHIP HEAD" },
    workshop_head:        { fg: "#6366f1", bg: "rgba(99,102,241,0.12)",  bd: "rgba(99,102,241,0.50)",  label: "WORKSHOP HEAD" },
    mechanics_head:       { fg: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  bd: "rgba(139,92,246,0.50)",  label: "MECHANICS HEAD" },
    cad_head:             { fg: "#f97316", bg: "rgba(249,115,22,0.12)",   bd: "rgba(249,115,22,0.50)",   label: "CAD HEAD" },
    electronics_head:     { fg: "#06b6d4", bg: "rgba(6,182,212,0.12)",   bd: "rgba(6,182,212,0.50)",   label: "ELECTRONICS HEAD" },
    procurement_head:     { fg: "#14b8a6", bg: "rgba(20,184,166,0.12)",  bd: "rgba(20,184,166,0.50)",  label: "PROCUREMENT HEAD" },
    makerspace_head:      { fg: "#ef4444", bg: "rgba(239,68,68,0.12)",   bd: "rgba(239,68,68,0.50)",   label: "MAKERSPACE HEAD" },
};
const ROLE_OPTIONS = [
    "member", "faculty", "president", "vice_president", "project_manager",
    "inventory_manager", "lead_developer", "printing_head",
    "social_media_head", "social_media_co_head", "sponsorship_head",
    "workshop_head", "mechanics_head", "cad_head", "electronics_head",
    "procurement_head", "makerspace_head"
] as const;

/* ── Avatar ───────────────────────────────────────────────── */
function Avatar({
    avatarUrl,
    displayName,
    role,
    size = 40,
}: {
    avatarUrl: string | null;
    displayName: string;
    role: string;
    size?: number;
}) {
    const c = ROLE_CFG[role] ?? ROLE_CFG.member;
    const initials = displayName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div
            className="shrink-0 grid place-items-center rounded-full font-mono font-bold select-none overflow-hidden"
            style={{
                width: size,
                height: size,
                fontSize: size * 0.33,
                color: c.fg,
                background: avatarUrl ? "transparent" : c.bg,
                border: `1.5px solid ${c.bd}`,
                boxShadow: `0 0 0 2px ${c.bg}`,
            }}
        >
            {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
                initials
            )}
        </div>
    );
}

/* ── RoleSelect (custom dropdown) ─────────────────────────── */
function RoleSelect({
    values,
    onChange,
    isSelf,
}: {
    values: string[];
    onChange: (roles: string[]) => void;
    isSelf: boolean;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    
    // Always use at least member if empty
    const currentValues = values.length > 0 ? values : ["member"];
    
    // The "primary" display config uses the first selected role
    const primaryC = ROLE_CFG[currentValues[0]] ?? ROLE_CFG.member;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const toggleRole = (r: string) => {
        if (currentValues.includes(r)) {
            // Cannot remove the last role
            if (currentValues.length === 1) return;
            onChange(currentValues.filter(x => x !== r));
        } else {
            // Max 2 roles. If they have 2, replace the second one, or maybe just replace the oldest?
            // Actually let's just allow appending if < 2, otherwise do nothing
            if (currentValues.length < 2) {
                onChange([...currentValues, r]);
            } else {
                // If they already have 2 and select a third, replace the second one
                onChange([currentValues[0], r]);
            }
        }
    };

    return (
        <div ref={ref} className="relative inline-flex flex-wrap gap-1.5">
            {currentValues.map((val, idx) => {
                const c = ROLE_CFG[val] ?? ROLE_CFG.member;
                return (
                    <button
                        key={val}
                        onClick={() => !isSelf && setOpen((o) => !o)}
                        disabled={isSelf}
                        className="inline-flex items-center gap-2 h-8 px-2.5 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] transition-all"
                        style={{
                            color: c.fg,
                            background: c.bg,
                            borderColor: (open && idx === 0) ? c.fg : c.bd,
                            opacity: isSelf ? 0.6 : 1,
                            cursor: isSelf ? "not-allowed" : "pointer",
                        }}
                    >
                        {c.label}
                        {!isSelf && idx === currentValues.length - 1 && (
                            open
                                ? <ChevronUp size={11} style={{ color: c.fg }} />
                                : <ChevronDown size={11} style={{ color: c.fg }} />
                        )}
                    </button>
                )
            })}

            {open && (
                <div
                    className="absolute left-0 top-[calc(100%+4px)] z-30 w-56 rounded-sm border overflow-hidden shadow-2xl overflow-y-auto max-h-64"
                    style={{
                        background: "#111820",
                        borderColor: "rgba(0,229,255,0.30)",
                        boxShadow:
                            "0 0 0 1px rgba(0,229,255,0.06),0 16px 40px -8px rgba(0,0,0,0.95)",
                    }}
                >
                    <div className="px-3 py-2 border-b font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ borderColor: "rgba(0,229,255,0.1)", color: "#8b9ab0" }}>
                        Select up to 2 roles
                    </div>
                    {ROLE_OPTIONS.map((r) => {
                        const rc = ROLE_CFG[r] ?? ROLE_CFG.member;
                        const isSelected = currentValues.includes(r);
                        return (
                            <button
                                key={r}
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleRole(r);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 h-9 text-left transition-colors"
                                style={{ background: isSelected ? rc.bg : "transparent" }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = "rgba(0,229,255,0.04)";
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = "transparent";
                                }}
                            >
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: rc.fg, boxShadow: `0 0 6px ${rc.fg}` }}
                                />
                                <span
                                    className="font-mono text-[11px] uppercase tracking-[0.12em]"
                                    style={{ color: rc.fg }}
                                >
                                    {rc.label}
                                </span>
                                {isSelected && (
                                    <Check size={11} style={{ color: rc.fg, marginLeft: "auto" }} />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ── Divider ──────────────────────────────────────────────── */
function Divider() {
    return <div className="h-px my-4" style={{ background: "rgba(0,229,255,0.08)" }} />;
}

/* ── MicroLabel ───────────────────────────────────────────── */
function MicroLabel({ children, error }: { children: React.ReactNode; error?: string | null }) {
    return (
        <div className="flex items-center gap-1.5 mb-2">
            <span
                className="font-mono text-[9.5px] uppercase tracking-[0.22em]"
                style={{ color: "#4a5568" }}
            >
                {children}
            </span>
            {error && (
                <span
                    className="flex items-center gap-1 font-mono text-[9.5px]"
                    style={{ color: "#ef4444" }}
                >
                    <AlertCircle size={11} /> {error}
                </span>
            )}
        </div>
    );
}

/* ── TagChip ──────────────────────────────────────────────── */
function TagChip({ name, color, onRemove }: { name: string; color: string; onRemove: () => void }) {
    return (
        <span
            className="inline-flex items-center gap-1 h-[22px] pl-2 pr-1 rounded-sm border font-mono text-[10.5px] tracking-[0.08em]"
            style={{
                color,
                background: `${color}18`,
                borderColor: `${color}70`,
            }}
        >
            {name}
            <button
                onClick={onRemove}
                className="grid place-items-center w-4 h-4 rounded-sm transition-colors"
                style={{ color }}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
                <X size={10} />
            </button>
        </span>
    );
}


/* ── AddTagRow ────────────────────────────────────────────── */
function AddTagRow({ onAdd }: { onAdd: (t: TagObject) => void }) {
    const [input, setInput] = useState("");
    const [selectedHex, setSelectedHex] = useState(TC_COLORS[0].hex);

    const submit = () => {
        const t = input.trim();
        if (!t) return;
        onAdd({ name: t, color: selectedHex });
        setInput("");
    };

    return (
        <div className="flex items-center gap-2 mt-2">
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Tag name…"
                className="flex-1 h-8 text-[12px] border rounded-sm px-2.5 outline-none transition-colors placeholder:opacity-40"
                style={{
                    background: "#07090f",
                    color: "#f0f4ff",
                    borderColor: "rgba(0,229,255,0.18)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.55)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.18)"; }}
            />
            <div className="flex items-center gap-1 shrink-0">
                {TC_COLORS.map((tc) => (
                    <button
                        key={tc.id}
                        onClick={() => setSelectedHex(tc.hex)}
                        className="rounded-full transition-all"
                        title={tc.id}
                        style={{
                            width: 14,
                            height: 14,
                            background: tc.hex,
                            outline: selectedHex === tc.hex ? `2px solid ${tc.hex}` : "2px solid transparent",
                            outlineOffset: selectedHex === tc.hex ? 2 : 0,
                            opacity: selectedHex === tc.hex ? 1 : 0.45,
                        }}
                    />
                ))}
            </div>
            <button
                onClick={submit}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm border font-medium text-[11.5px] transition-all shrink-0"
                style={{
                    color: "#00e5ff",
                    background: "rgba(0,229,255,0.08)",
                    borderColor: "rgba(0,229,255,0.40)",
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(0,229,255,0.16)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "rgba(0,229,255,0.08)"; }}
            >
                <Plus size={12} /> Add
            </button>
        </div>
    );
}


/* ── MemberCard ───────────────────────────────────────────── */
function MemberCard({
    member,
    isSelf,
    currentUserId,
    onRoleChange,
    onTagsChange,
    onDelete,
    updatingId,
    deletingId,
    supabase,
}: {
    member: MemberProfile;
    isSelf: boolean;
    currentUserId: string | null;
    onRoleChange: (id: string, roles: string[]) => void;
    onTagsChange: (id: string, tags: string[]) => void;
    onDelete: (member: MemberProfile) => void;
    updatingId: string | null;
    deletingId: string | null;
    supabase: ReturnType<typeof createClient>;
}) {
    const [tagErr, setTagErr] = useState<string | null>(null);
    const [isUpdatingTag, setIsUpdatingTag] = useState(false);

    const parsedTags = useMemo(
        () => (member.custom_tags ?? []).map(parseTag),
        [member.custom_tags]
    );

    const isDeleting = deletingId === member.id;
    // Avatar border/glow uses the primary role
    const primaryRole = (member.roles && member.roles.length > 0) ? member.roles[0] : member.role;
    const roleColor = ROLE_CFG[primaryRole]?.fg ?? "#00e5ff";

    const joinedLabel = new Date(member.created_at)
        .toLocaleDateString("en-GB", { month: "short", year: "numeric" })
        .toUpperCase();

    const addTag = async (tag: TagObject) => {
        setTagErr(null);
        if (parsedTags.length >= 8) { setTagErr("Max 8 tags per member"); return; }
        if (parsedTags.some((t) => t.name.toLowerCase() === tag.name.toLowerCase())) {
            setTagErr("Tag already exists"); return;
        }
        setIsUpdatingTag(true);
        const newTags = [...(member.custom_tags ?? []), serializeTag(tag)];
        const { error } = await supabase.from("profiles").update({ custom_tags: newTags }).eq("id", member.id);
        if (!error) onTagsChange(member.id, newTags);
        setIsUpdatingTag(false);
    };

    const removeTag = async (name: string) => {
        setIsUpdatingTag(true);
        const newTags = (member.custom_tags ?? []).filter(
            (raw) => parseTag(raw).name !== name
        );
        const { error } = await supabase.from("profiles").update({ custom_tags: newTags }).eq("id", member.id);
        if (!error) onTagsChange(member.id, newTags);
        setTagErr(null);
        setIsUpdatingTag(false);
    };


    return (
        <div
            className="relative rounded-md overflow-visible transition-all duration-200"
            style={{
                background: "#0d1117",
                border: "1px solid rgba(0,229,255,0.12)",
                padding: 20,
                opacity: isDeleting ? 0.5 : 1,
            }}
        >
            {/* Role-colored left accent strip */}
            <div
                className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full"
                style={{
                    background: roleColor,
                    boxShadow: `0 0 8px ${roleColor}80`,
                }}
            />

            {/* Header row */}
            <div className="flex items-center gap-3 pl-3">
                <Avatar
                    avatarUrl={member.avatar_url}
                    displayName={member.display_name}
                    role={member.role}
                    size={40}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className="font-sans font-semibold text-[15px] tracking-tight"
                            style={{ color: "#f0f4ff" }}
                        >
                            {member.display_name}
                        </span>
                        {isSelf && (
                            <span
                                className="font-mono text-[9.5px] uppercase tracking-[0.18em] px-1.5 h-4 grid place-items-center rounded-sm border"
                                style={{
                                    color: "#00e5ff",
                                    background: "rgba(0,229,255,0.10)",
                                    borderColor: "rgba(0,229,255,0.35)",
                                }}
                            >
                                YOU
                            </span>
                        )}
                    </div>
                    <div
                        className="font-mono text-[10.5px] mt-0.5 truncate"
                        style={{ color: "#4a5568" }}
                    >
                        {member.contact_email ?? "—"}
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <span
                        className="font-mono text-[10px] uppercase tracking-[0.16em] hidden sm:block"
                        style={{ color: "#4a5568" }}
                    >
                        Joined{" "}
                        <span style={{ color: "#8b9ab0" }}>{joinedLabel}</span>
                    </span>
                    <button
                        onClick={() => !isSelf && onDelete(member)}
                        disabled={isSelf || isDeleting}
                        className="grid place-items-center w-8 h-8 rounded-sm border transition-all"
                        title={isSelf ? "Cannot remove your own account" : "Remove member"}
                        style={{
                            color: isSelf ? "#4a5568" : "#ef4444",
                            background: isSelf ? "transparent" : "rgba(239,68,68,0.06)",
                            borderColor: isSelf ? "rgba(74,85,104,0.40)" : "rgba(239,68,68,0.35)",
                            cursor: isSelf ? "not-allowed" : "pointer",
                        }}
                        onMouseOver={(e) => {
                            if (!isSelf) e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                        }}
                        onMouseOut={(e) => {
                            if (!isSelf) e.currentTarget.style.background = "rgba(239,68,68,0.06)";
                        }}
                    >
                        {isDeleting ? (
                            <span
                                className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin"
                            />
                        ) : (
                            <Trash2 size={14} />
                        )}
                    </button>
                </div>
            </div>

            <Divider />

            {/* Role */}
            <div className="pl-3">
                <MicroLabel>ROLE</MicroLabel>
                <RoleSelect
                    values={member.roles && member.roles.length > 0 ? member.roles : [member.role]}
                    onChange={(r) => onRoleChange(member.id, r)}
                    isSelf={isSelf}
                />
                {updatingId === member.id && (
                    <span
                        className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em]"
                        style={{ color: "#00e5ff" }}
                    >
                        Saving…
                    </span>
                )}
            </div>

            <Divider />

            {/* Tags */}
            <div className="pl-3">
                <MicroLabel error={tagErr}>TAGS</MicroLabel>
                <div className={`flex flex-wrap gap-1.5 ${isUpdatingTag ? "opacity-60" : ""}`}>
                    {parsedTags.map((t) => (
                        <TagChip
                            key={t.name}
                            name={t.name}
                            color={t.color}
                            onRemove={() => removeTag(t.name)}
                        />
                    ))}
                    {parsedTags.length === 0 && (
                        <span
                            className="font-mono text-[10.5px]"
                            style={{ color: "#4a5568" }}
                        >
                            // no tags — add one below
                        </span>
                    )}
                </div>
                <AddTagRow onAdd={addTag} />
            </div>


        </div>
    );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function MemberManagement() {
    const { user, isModerator, isFaculty, loading: authLoading } = useUser();
    const supabase = useMemo(() => createClient(), []);

    const [members, setMembers] = useState<MemberProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [deletedName, setDeletedName] = useState<string | null>(null);

    const fetchMembers = useCallback(async () => {
        const { data } = await supabase
            .from("profiles")
            .select(
                "id, display_name, avatar_url, contact_email, role, roles, created_at, custom_tags, safety_certifications"
            )
            .order("created_at", { ascending: true });
        if (data) setMembers(data as MemberProfile[]);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleRoleChange = useCallback(
        async (userId: string, newRoles: string[]) => {
            setUpdatingId(userId);
            const primaryRole = newRoles.length > 0 ? newRoles[0] : "member";
            await supabase
                .from("profiles")
                .update({ 
                    roles: newRoles,
                    role: primaryRole as MemberProfile["role"] // fallback compatibility
                })
                .eq("id", userId);
                
            setMembers((prev) =>
                prev.map((m) => (m.id === userId ? { ...m, roles: newRoles as MemberRole[], role: primaryRole as MemberRole } : m))
            );
            setUpdatingId(null);
        },
        [supabase]
    );

    const handleTagsChange = useCallback((userId: string, newTags: string[]) => {
        setMembers((prev) =>
            prev.map((m) => (m.id === userId ? { ...m, custom_tags: newTags } : m))
        );
    }, []);



    const handleDeleteMember = useCallback(
        async (member: MemberProfile) => {
            if (member.id === user?.id) {
                setError("You cannot delete your own account from this page.");
                return;
            }
            const confirmed = window.confirm(
                `Delete ${member.display_name} permanently? This will remove their account and prevent future sign-in.`
            );
            if (!confirmed) return;

            setDeletingId(member.id);
            setError(null);

            const response = await fetch(`/api/admin/members/${member.id}`, {
                method: "DELETE",
            });
            const data = await response.json().catch(() => ({ error: "Failed to delete member." }));

            if (!response.ok) {
                setError(data.error || "Failed to delete member.");
                setDeletingId(null);
                return;
            }

            setMembers((prev) => prev.filter((m) => m.id !== member.id));
            setDeletingId(null);
            setDeletedName(member.display_name);
            setTimeout(() => setDeletedName(null), 3000);
        },
        [user?.id]
    );

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return members;
        return members.filter(
            (m) =>
                m.display_name.toLowerCase().includes(q) ||
                (m.contact_email ?? "").toLowerCase().includes(q) ||
                (m.roles ?? []).some((r) => r.toLowerCase().includes(q)) ||
                (m.custom_tags ?? []).some((raw) =>
                    parseTag(raw).name.toLowerCase().includes(q)
                ) ||
                (m.safety_certifications ?? []).some((c) => c.toLowerCase().includes(q))
        );
    }, [members, search]);

    if (authLoading || loading) return <VajraLoader fullPage />;

    if (!isModerator && !isFaculty) {
        return (
            <div className="min-h-screen grid place-items-center" style={{ background: "#07090f" }}>
                <div
                    className="relative w-full max-w-sm text-center rounded-md p-10"
                    style={{
                        background: "#0d1117",
                        border: "1px solid rgba(239,68,68,0.30)",
                        boxShadow: "0 0 0 1px rgba(239,68,68,0.08)",
                    }}
                >
                    <div
                        className="absolute inset-x-0 top-0 h-px"
                        style={{
                            background:
                                "linear-gradient(90deg,transparent,rgba(239,68,68,0.7),transparent)",
                        }}
                    />
                    <div
                        className="mx-auto mb-4 w-14 h-14 grid place-items-center rounded-md border"
                        style={{
                            color: "#ef4444",
                            background: "rgba(239,68,68,0.10)",
                            borderColor: "rgba(239,68,68,0.35)",
                        }}
                    >
                        <User size={24} />
                    </div>
                    <h2 className="font-bold text-[18px] tracking-tight" style={{ color: "#f0f4ff" }}>
                        Access Denied
                    </h2>
                    <p className="text-[13px] mt-2" style={{ color: "#8b9ab0" }}>
                        Only club leadership and faculty can manage members.
                    </p>
                </div>
            </div>
        );
    }

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

            <div className="relative max-w-3xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-20">


                {/* Page header */}
                <div className="flex items-end justify-between gap-4 mb-8">
                    <div>
                        <h1
                            className="font-sans font-black tracking-tight"
                            style={{ fontSize: "clamp(22px, 4vw, 30px)", color: "#f0f4ff" }}
                        >
                            Member Management
                        </h1>
                        <p className="text-[13.5px] mt-1.5" style={{ color: "#8b9ab0" }}>
                            Manage roles, tags, and certifications across all members.
                        </p>
                    </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <span
                            className="absolute inset-y-0 left-0 grid place-items-center w-9 border-r pointer-events-none"
                            style={{ borderColor: "rgba(0,229,255,0.12)", color: "#8b9ab0" }}
                        >
                            <Search size={13} />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search members, roles, tags…"
                            className="w-full h-9 text-[12.5px] border rounded-md outline-none transition-colors pl-11 pr-3 placeholder:opacity-40"
                            style={{
                                background: "#0d1117",
                                color: "#f0f4ff",
                                borderColor: "rgba(0,229,255,0.12)",
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.40)"; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.12)"; }}
                        />
                    </div>
                    <span
                        className="font-mono text-[11px] uppercase tracking-[0.16em] shrink-0 tabular-nums"
                        style={{ color: "#8b9ab0" }}
                    >
                        {filtered.length}{" "}
                        <span style={{ color: "#4a5568" }}>
                            member{filtered.length !== 1 ? "s" : ""}
                        </span>
                    </span>
                    {/* Role legend */}
                    <div className="hidden lg:flex items-center gap-1.5 ml-auto">
                        {Object.values(ROLE_CFG).slice(0, 5).map((rc) => (
                            <span
                                key={rc.label}
                                title={rc.label}
                                className="w-2 h-2 rounded-full"
                                style={{ background: rc.fg, boxShadow: `0 0 6px ${rc.fg}80` }}
                            />
                        ))}
                    </div>
                </div>

                {/* Error banner */}
                {error && (
                    <div
                        className="mb-4 flex items-center gap-2.5 px-4 py-2.5 rounded-sm border"
                        style={{
                            background: "rgba(239,68,68,0.08)",
                            borderColor: "rgba(239,68,68,0.35)",
                        }}
                    >
                        <AlertCircle size={13} style={{ color: "#ef4444" }} />
                        <span className="font-mono text-[11px]" style={{ color: "#8b9ab0" }}>
                            <span style={{ color: "#ef4444" }}>Error: </span>
                            {error}
                        </span>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto"
                            style={{ color: "#4a5568" }}
                        >
                            <X size={13} />
                        </button>
                    </div>
                )}

                {/* Delete toast */}
                {deletedName && (
                    <div
                        className="mb-4 flex items-center gap-2.5 px-4 py-2.5 rounded-sm border"
                        style={{
                            background: "rgba(239,68,68,0.08)",
                            borderColor: "rgba(239,68,68,0.30)",
                        }}
                    >
                        <Trash2 size={13} style={{ color: "#ef4444" }} />
                        <span className="font-mono text-[11px]" style={{ color: "#8b9ab0" }}>
                            <span style={{ color: "#ef4444" }}>{deletedName}</span> removed from roster.
                        </span>
                    </div>
                )}

                {/* List */}
                {filtered.length === 0 ? (
                    <div
                        className="text-center py-14 border border-dashed rounded-md"
                        style={{
                            borderColor: "rgba(0,229,255,0.15)",
                            background: "rgba(0,229,255,0.02)",
                        }}
                    >
                        <div
                            className="mx-auto w-12 h-12 grid place-items-center border rounded-md mb-4"
                            style={{
                                borderColor: "rgba(0,229,255,0.18)",
                                background: "#07090f",
                                color: "#4a5568",
                            }}
                        >
                            <UsersRound size={20} />
                        </div>
                        <div
                            className="font-sans font-semibold text-[15px]"
                            style={{ color: "#f0f4ff" }}
                        >
                            No members found
                        </div>
                        <p className="text-[13px] mt-1.5" style={{ color: "#8b9ab0" }}>
                            Try a different search term.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((m) => (
                            <MemberCard
                                key={m.id}
                                member={m}
                                isSelf={m.id === user?.id}
                                currentUserId={user?.id ?? null}
                                onRoleChange={handleRoleChange}
                                onTagsChange={handleTagsChange}
                                onDelete={handleDeleteMember}
                                updatingId={updatingId}
                                deletingId={deletingId}
                                supabase={supabase}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
