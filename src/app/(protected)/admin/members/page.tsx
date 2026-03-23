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
} from "lucide-react";
import { motion } from "framer-motion";

interface MemberProfile {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
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
            .select("id, display_name, avatar_url, role, created_at")
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
                    <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass p-4 flex items-center gap-3"
                    >
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
                            <p className="text-[10px] text-text-muted">
                                Joined{" "}
                                {new Date(member.created_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    year: "numeric",
                                })}
                            </p>
                        </div>

                        {/* Role selector */}
                        <div className="relative">
                            <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
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
                ))}
            </div>
        </div>
    );
}
