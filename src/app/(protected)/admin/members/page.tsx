"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import {
    grantSafetyCertification,
    revokeSafetyCertification,
} from "@/actions/safety-certifications";
import {
    AlertCircle,
    ShieldCheck,
    User,
    Search,
    ChevronDown,
    X,
    Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MemberProfile {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    custom_tags: string[] | null;
    safety_certifications: string[];
    created_at: string;
}

interface TagObject {
    name: string;
    color: string;
}

function parseTag(raw: string): TagObject {
    try {
        const parsed = JSON.parse(raw);
        if (parsed.name && parsed.color) return parsed;
    } catch { }
    return { name: raw, color: "#6366f1" };
}

function serializeTag(tag: TagObject): string {
    return JSON.stringify(tag);
}

const PRESET_COLORS = [
    "#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e",
    "#a78bfa", "#fb923c", "#34d399", "#60a5fa", "#e879f9",
];

const roles = [
    { value: "member", label: "Member" },
    { value: "inventory_manager", label: "Inventory Manager" },
    { value: "website_manager", label: "Website Manager" },
    { value: "printing_head", label: "3D Printing Head" },
    { value: "president", label: "President" },
    { value: "vice_president", label: "Vice President" },
    { value: "faculty", label: "Faculty" },
];

const roleBadge: Record<string, string> = {
    member: "text-text-muted bg-surface border-border",
    inventory_manager: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    website_manager: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    printing_head: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    president: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    vice_president: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    faculty: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
};

// ─── Member Row ──────────────────────────────────────
function MemberRow({
    member,
    onRoleChange,
    supabase,
    onTagsChange,
    onSafetyCertsChange,
    updatingId,
    deletingId,
    currentUserId,
    onDeleteMember,
}: any) {
    const [tagInput, setTagInput] = useState("");
    const [certInput, setCertInput] = useState("");
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [isUpdatingTag, setIsUpdatingTag] = useState(false);
    const [isUpdatingCert, setIsUpdatingCert] = useState(false);
    const isDeleting = deletingId === member.id;
    const isSelf = currentUserId === member.id;

    const parsedTags: TagObject[] = (member.custom_tags || []).map(parseTag);

    const handleAddTag = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = tagInput.trim();
        if (!name || parsedTags.some((t) => t.name === name)) {
            setTagInput("");
            return;
        }

        setIsUpdatingTag(true);
        const newTag = serializeTag({ name, color: selectedColor });
        const newTags = [...(member.custom_tags || []), newTag];
        const { error } = await supabase.from("profiles").update({ custom_tags: newTags }).eq("id", member.id);
        if (!error) {
            onTagsChange(member.id, newTags);
        }
        setTagInput("");
        setShowColorPicker(false);
        setIsUpdatingTag(false);
    };

    const handleRemoveTag = async (nameToRemove: string) => {
        setIsUpdatingTag(true);
        const newTagStrings = (member.custom_tags || []).filter((raw: string) => {
            return parseTag(raw).name !== nameToRemove;
        });
        const { error } = await supabase.from("profiles").update({ custom_tags: newTagStrings }).eq("id", member.id);
        if (!error) {
            onTagsChange(member.id, newTagStrings);
        }
        setIsUpdatingTag(false);
    };

    const handleGrantCert = async (e: React.FormEvent) => {
        e.preventDefault();
        const cert = certInput.trim();
        if (!cert) return;
        if ((member.safety_certifications || []).includes(cert)) {
            setCertInput("");
            return;
        }
        setIsUpdatingCert(true);
        const result = await grantSafetyCertification({ userId: member.id, certification: cert });
        if (result.ok) {
            onSafetyCertsChange(member.id, [...(member.safety_certifications || []), cert]);
            setCertInput("");
        }
        setIsUpdatingCert(false);
    };

    const handleRevokeCert = async (cert: string) => {
        setIsUpdatingCert(true);
        const result = await revokeSafetyCertification({ userId: member.id, certification: cert });
        if (result.ok) {
            onSafetyCertsChange(
                member.id,
                (member.safety_certifications || []).filter((c: string) => c !== cert)
            );
        }
        setIsUpdatingCert(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.display_name} className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-5 h-5 text-primary-light" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{member.display_name}</p>
                    <p className="text-[10px] text-text-muted mb-1">
                        Joined {new Date(member.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </p>

                    {/* Custom Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {parsedTags.map((tag) => (
                            <span
                                key={tag.name}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                                style={{
                                    color: tag.color,
                                    backgroundColor: `${tag.color}18`,
                                    borderColor: `${tag.color}40`,
                                }}
                            >
                                {tag.name}
                                <button
                                    onClick={() => handleRemoveTag(tag.name)}
                                    disabled={isUpdatingTag}
                                    className="hover:opacity-60 transition-opacity disabled:opacity-30"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}

                        {/* Add Tag form */}
                        <div className="relative">
                            <form onSubmit={handleAddTag} className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setShowColorPicker((v) => !v)}
                                    className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0 transition-transform hover:scale-110"
                                    style={{ backgroundColor: selectedColor }}
                                    title="Pick tag color"
                                />
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onFocus={() => setShowColorPicker(true)}
                                    placeholder="+ add tag"
                                    disabled={isUpdatingTag}
                                    className="w-20 px-2 py-0.5 bg-background border border-border rounded-full text-[10px] text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
                                />
                            </form>

                            <AnimatePresence>
                                {showColorPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                        className="absolute top-7 left-0 z-20 p-2 bg-surface border border-border rounded-xl shadow-xl"
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        <p className="text-[9px] text-text-muted mb-1.5 px-0.5">Tag color</p>
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {PRESET_COLORS.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedColor(c);
                                                        setShowColorPicker(false);
                                                    }}
                                                    className="w-5 h-5 rounded-full transition-transform hover:scale-125 focus:outline-none"
                                                    style={{
                                                        backgroundColor: c,
                                                        boxShadow: selectedColor === c ? `0 0 0 2px white, 0 0 0 3px ${c}` : "none",
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Safety Certifications */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {(member.safety_certifications || []).map((cert: string) => (
                            <span
                                key={cert}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border text-amber-300 bg-amber-400/10 border-amber-400/25"
                            >
                                {cert}
                                <button
                                    onClick={() => handleRevokeCert(cert)}
                                    disabled={isUpdatingCert}
                                    className="hover:opacity-60 transition-opacity disabled:opacity-30"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        <form onSubmit={handleGrantCert} className="flex items-center gap-1">
                            <input
                                type="text"
                                value={certInput}
                                onChange={(e) => setCertInput(e.target.value)}
                                placeholder="+ safety cert"
                                disabled={isUpdatingCert}
                                className="w-24 px-2 py-0.5 bg-background border border-border rounded-full text-[10px] text-foreground placeholder:text-text-muted focus:outline-none focus:border-amber-400/40 transition-all"
                            />
                        </form>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 self-start sm:self-center items-center gap-2">
                <div className="relative">
                    <select
                        value={member.role}
                        onChange={(e) => onRoleChange(member.id, e.target.value)}
                        disabled={updatingId === member.id || isDeleting}
                        className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer focus:outline-none transition-all ${roleBadge[member.role] || roleBadge.member
                            } ${updatingId === member.id || isDeleting ? "opacity-50" : ""}`}
                    >
                        {roles.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                </div>

                <button
                    type="button"
                    onClick={() => onDeleteMember(member)}
                    disabled={isDeleting || isSelf}
                    title={isSelf ? "You cannot delete your own account" : "Remove member"}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isDeleting ? <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Remove
                </button>
            </div>
        </motion.div>
    );
}

// ─── Main Page ───────────────────────────────────────
export default function MemberManagement() {
    const { user, isModerator, isFaculty, loading: authLoading } = useUser();
    const supabase = createClient();
    const [members, setMembers] = useState<MemberProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchMembers = useCallback(async () => {
        const { data } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, role, created_at, custom_tags, safety_certifications")
            .order("created_at", { ascending: true });
        if (data) setMembers(data);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        setUpdatingId(userId);
        await supabase
            .from("profiles")
            .update({
                role: newRole as
                    | "member"
                    | "inventory_manager"
                    | "website_manager"
                    | "printing_head"
                    | "president"
                    | "vice_president"
                    | "faculty",
            })
            .eq("id", userId);
        setMembers((prev) =>
            prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
        );
        setUpdatingId(null);
    };

    const handleTagsChange = useCallback((userId: string, newTags: string[]) => {
        setMembers((prev) =>
            prev.map((m) => (m.id === userId ? { ...m, custom_tags: newTags } : m))
        );
    }, []);

    const handleSafetyCertsChange = useCallback((userId: string, certs: string[]) => {
        setMembers((prev) =>
            prev.map((m) => (m.id === userId ? { ...m, safety_certifications: certs } : m))
        );
    }, []);

    const handleDeleteMember = useCallback(async (member: MemberProfile) => {
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

        setMembers((prev) => prev.filter((entry) => entry.id !== member.id));
        setDeletingId(null);
    }, [user?.id]);

    if (authLoading || loading) {
        return <VajraLoader fullPage />;
    }

    if (!isModerator && !isFaculty) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <ShieldCheck className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                <p className="text-text-muted text-sm">
                    Only club leadership and faculty can manage members.
                </p>
            </div>
        );
    }

    const filtered = members.filter((m) =>
        m.display_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-xl font-bold">Members</h1>
                        <p className="text-xs text-text-muted">
                            {members.length} total members
                        </p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search members..."
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
            </div>

            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* List */}
            <div className="space-y-2">
                {filtered.map((member) => (
                    <MemberRow
                        key={member.id}
                        member={member}
                        onRoleChange={handleRoleChange}
                        supabase={supabase}
                        onTagsChange={handleTagsChange}
                        onSafetyCertsChange={handleSafetyCertsChange}
                        updatingId={updatingId}
                        deletingId={deletingId}
                        currentUserId={user?.id ?? null}
                        onDeleteMember={handleDeleteMember}
                    />
                ))}
            </div>
        </div>
    );
}
