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
} from "lucide-react";
import { motion } from "framer-motion";

interface MemberProfile {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    custom_tags: string[] | null;
    created_at: string;
}

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

function MemberRow({ member, onRoleChange, supabase, onTagsChange, updatingId }: any) {
    const [tagInput, setTagInput] = useState("");
    const [isUpdatingTag, setIsUpdatingTag] = useState(false);

    const handleAddTag = async (e: React.FormEvent) => {
        e.preventDefault();
        const newTag = tagInput.trim();
        if (!newTag || (member.custom_tags && member.custom_tags.includes(newTag))) {
            setTagInput("");
            return;
        }

        setIsUpdatingTag(true);
        const newTags = [...(member.custom_tags || []), newTag];
        const { error } = await supabase.from("profiles").update({ custom_tags: newTags }).eq("id", member.id);
        if (!error) {
            onTagsChange(member.id, newTags);
        }
        setTagInput("");
        setIsUpdatingTag(false);
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        setIsUpdatingTag(true);
        const newTags = (member.custom_tags || []).filter((t: string) => t !== tagToRemove);
        const { error } = await supabase.from("profiles").update({ custom_tags: newTags }).eq("id", member.id);
        if (!error) {
            onTagsChange(member.id, newTags);
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
                        <img
                            src={member.avatar_url}
                            alt={member.display_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <User className="w-5 h-5 text-primary-light" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                        {member.display_name}
                    </p>
                    <p className="text-[10px] text-text-muted mb-1">
                        Joined{" "}
                        {new Date(member.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                        })}
                    </p>
                    
                    {/* Custom Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {member.custom_tags?.map((tag: string) => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-border text-[10px] font-medium text-text-secondary">
                                {tag}
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    disabled={isUpdatingTag}
                                    className="hover:text-red-400 transition-colors disabled:opacity-50"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        
                        <form onSubmit={handleAddTag} className="flex flex-wrap items-center gap-1">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                placeholder="+ add tag"
                                disabled={isUpdatingTag}
                                className="w-20 px-2 py-0.5 bg-background border border-border rounded-full text-[10px] text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
                            />
                        </form>
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
                        <option key={r.value} value={r.value}>
                            {r.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
            </div>
        </motion.div>
    );
}

export default function MemberManagement() {
    const { isModerator, isFaculty, loading: authLoading } = useUser();
    const supabase = createClient();
    const [members, setMembers] = useState<MemberProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

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
            <div className="flex items-center gap-3 mb-6">
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
        </div>
    );
}
