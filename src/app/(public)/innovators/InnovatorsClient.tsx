"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tables } from "@/types/database";
import { Users, User as UserIcon, Mail, Github, Linkedin } from "lucide-react";

type Profile = Tables<"profiles">;
type FilterType = "all" | "faculty" | "committee" | "members";

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

const MAPPED_ROLES: Record<string, { label: string; class: string }> = {
    member: { label: "Member", class: "text-text-muted bg-surface border-border" },
    inventory_manager: { label: "Inventory Manager", class: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
    president: { label: "President", class: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
    vice_president: { label: "Vice President", class: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
    faculty: { label: "Faculty", class: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
};

export default function InnovatorsClient({ profiles }: { profiles: Profile[] }) {
    const [filter, setFilter] = useState<FilterType>("all");

    const filteredProfiles = profiles.filter((p) => {
        if (filter === "all") return true;
        if (filter === "faculty") return p.role === "faculty";
        if (filter === "committee") return p.role === "president" || p.role === "vice_president";
        if (filter === "members") return p.role === "member";
        return true;
    });

    const filters: { id: FilterType; label: string }[] = [
        { id: "all", label: "All" },
        { id: "faculty", label: "Faculty" },
        { id: "committee", label: "Club Committee" },
        { id: "members", label: "Members" },
    ];

    return (
        <div className="min-h-screen pt-[calc(var(--nav-height)+2rem)]">
            <div className="max-w-7xl mx-auto px-6 mb-12">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary-light" />
                    </div>
                    <h1 className="section-title text-3xl">Our Innovators</h1>
                </div>
                <p className="text-text-secondary max-w-2xl mb-8">
                    Meet the brilliant minds behind VajraX. From dedicated faculty and leadership to our active builders shaping the future of robotics.
                </p>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-10">
                    {filters.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.id
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "bg-surface border border-border text-text-secondary hover:text-foreground hover:bg-white/[0.03]"
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
                    <AnimatePresence mode="popLayout">
                        {filteredProfiles.map((profile) => {
                            const parsedTags: TagObject[] = (profile.custom_tags || []).map(parseTag);
                            return (
                                <motion.div
                                    layout
                                    key={profile.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                    className="glass p-6 rounded-2xl flex flex-col items-center text-center group"
                                >
                                    <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden mb-4 group-hover:scale-105 group-hover:border-primary/40 transition-all duration-300">
                                        {profile.avatar_url ? (
                                            <img
                                                src={profile.avatar_url}
                                                alt={profile.display_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <UserIcon className="w-10 h-10 text-primary-light/50" />
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold mb-1 truncate w-full text-foreground group-hover:text-primary-light transition-colors">
                                        {profile.display_name}
                                    </h3>

                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border mb-4 shadow-sm ${MAPPED_ROLES[profile.role]?.class || MAPPED_ROLES.member.class}`}>
                                        {MAPPED_ROLES[profile.role]?.label || "Member"}
                                    </span>

                                    {/* Colored Custom Tags */}
                                    {parsedTags.length > 0 && (
                                        <div className="flex flex-wrap justify-center gap-1.5 mt-auto">
                                            {parsedTags.map((tag) => (
                                                <span
                                                    key={tag.name}
                                                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                                                    style={{
                                                        color: tag.color,
                                                        backgroundColor: `${tag.color}18`,
                                                        borderColor: `${tag.color}40`,
                                                    }}
                                                >
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Contact Email */}
                                    {profile.contact_email && (
                                        <a
                                            href={`mailto:${profile.contact_email}`}
                                            className="flex items-center gap-1.5 mt-3 text-[11px] text-text-muted hover:text-primary-light transition-colors"
                                        >
                                            <Mail className="w-3.5 h-3.5" />
                                            {profile.contact_email}
                                        </a>
                                    )}

                                    {/* Social Links */}
                                    {(profile.github_url || profile.linkedin_url) && (
                                        <div className="flex items-center gap-3 mt-3">
                                            {profile.github_url && (
                                                <a
                                                    href={profile.github_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-text-muted hover:text-white transition-colors"
                                                    title="GitHub"
                                                >
                                                    <Github className="w-4.5 h-4.5" />
                                                </a>
                                            )}
                                            {profile.linkedin_url && (
                                                <a
                                                    href={profile.linkedin_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-text-muted hover:text-[#0A66C2] transition-colors"
                                                    title="LinkedIn"
                                                >
                                                    <Linkedin className="w-4.5 h-4.5" />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {filteredProfiles.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full py-20 text-center glass rounded-2xl"
                        >
                            <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No innovators found</h3>
                            <p className="text-text-muted text-sm">
                                There are currently no members in this category.
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
