"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
    Users,
    ShieldCheck,
    Loader2,
    User,
    Search,
    ChevronDown,
    Plus,
    X,
    UserPlus,
    Mail,
    Lock,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MemberProfile {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    custom_tags: string[] | null;
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
    { value: "president", label: "President" },
    { value: "vice_president", label: "Vice President" },
    { value: "faculty", label: "Faculty" },
];

const roleBadge: Record<string, string> = {
    member: "text-text-muted bg-surface border-border",
    president: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    vice_president: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    faculty: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
};

// ─── Add Member Modal ────────────────────────────────
function AddMemberModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/register-member", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email.trim(),
                password,
                displayName: fullName.trim(),
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            setError(data.error || "Failed to register member");
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
        setTimeout(() => {
            onSuccess();
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="glass-strong p-6 w-full max-w-md relative z-10"
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary-light" />
                        Register New Member
                    </h3>
                    <button onClick={onClose} className="text-text-muted hover:text-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {success ? (
                    <div className="text-center py-6">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                        <p className="text-lg font-semibold text-emerald-400">Member Registered!</p>
                        <p className="text-sm text-text-muted mt-1">They can now log in immediately.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    placeholder="John Doe"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="member@college.edu"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="Min 6 characters"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !fullName.trim() || !email.trim()}
                            className="btn-primary w-full !py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            {loading ? "Registering..." : "Register Member"}
                        </button>

                        <p className="text-[10px] text-text-muted text-center">
                            No verification email will be sent. The member can log in immediately.
                        </p>
                    </form>
                )}
            </motion.div>
        </div>
    );
}

// ─── Member Row ──────────────────────────────────────
function MemberRow({ member, onRoleChange, supabase, onTagsChange, updatingId }: any) {
    const [tagInput, setTagInput] = useState("");
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [isUpdatingTag, setIsUpdatingTag] = useState(false);

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
                </div>
            </div>

            {/* Role selector */}
            <div className="relative flex-shrink-0 self-start sm:self-center">
                <select
                    value={member.role}
                    onChange={(e) => onRoleChange(member.id, e.target.value)}
                    disabled={updatingId === member.id}
                    className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer focus:outline-none transition-all ${roleBadge[member.role] || roleBadge.member
                        } ${updatingId === member.id ? "opacity-50" : ""}`}
                >
                    {roles.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
            </div>
        </motion.div>
    );
}

// ─── Main Page ───────────────────────────────────────
export default function MemberManagement() {
    const { isModerator, isFaculty, loading: authLoading } = useUser();
    const supabase = createClient();
    const [members, setMembers] = useState<MemberProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchMembers = useCallback(async () => {
        const { data } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, role, created_at, custom_tags")
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
            .update({ role: newRole as "member" | "president" | "vice_president" | "faculty" })
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

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
            </div>
        );
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
                    <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Members</h1>
                        <p className="text-xs text-text-muted">
                            {members.length} total members
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2 text-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Member</span>
                </button>
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

            {/* List */}
            <div className="space-y-2">
                {filtered.map((member) => (
                    <MemberRow
                        key={member.id}
                        member={member}
                        onRoleChange={handleRoleChange}
                        supabase={supabase}
                        onTagsChange={handleTagsChange}
                        updatingId={updatingId}
                    />
                ))}
            </div>

            {/* Add Member Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <AddMemberModal
                        onClose={() => setShowAddModal(false)}
                        onSuccess={() => fetchMembers()}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
