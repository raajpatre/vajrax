"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Tables } from "@/types/database";
import { Users, User as UserIcon, Mail, Github, Linkedin } from "lucide-react";
import { TeamSection } from "@/components/ui/TeamSection";

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
    return { name: raw, color: "#00e5ff" };
}

const MAPPED_ROLES: Record<string, { label: string; class: string }> = {
    member: { label: "Member", class: "text-text-muted bg-surface border-border" },
    inventory_manager: { label: "Inventory Manager", class: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
    website_manager: { label: "Website Manager", class: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    printing_head: { label: "3D Printing Head", class: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
    president: { label: "President", class: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
    vice_president: { label: "Vice President", class: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
    faculty: { label: "Faculty", class: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
};

export default function InnovatorsClient({ profiles }: { profiles: Profile[] }) {
    const [filter, setFilter] = useState<FilterType>("all");
    const router = useRouter();

    const filteredProfiles = profiles.filter((p) => {
        if (filter === "all") return true;
        if (filter === "faculty") return p.role === "faculty";
        if (filter === "committee") return p.role !== "faculty" && p.role !== "member";
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
        <div className="relative min-h-screen overflow-hidden pb-24 pt-[calc(var(--nav-height)+2.5rem)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(0,229,255,0.10),transparent_30%),radial-gradient(circle_at_86%_16%,rgba(0,218,243,0.08),transparent_32%)]" />

            <div className="relative z-10 mx-auto mb-12 max-w-7xl px-4 sm:px-6">
                <h1 className="section-title mb-4 text-2xl sm:text-3xl">Our Innovators</h1>
                <p className="mb-8 max-w-2xl text-text-secondary">
                    Meet the brilliant minds behind VajraX. From dedicated faculty and leadership to our active builders shaping the future of robotics.
                </p>

                {/* Filters */}
                <div className="glass mb-10 inline-flex w-full overflow-x-auto flex-nowrap items-center gap-1.5 sm:gap-2 rounded-lg px-2 py-2 sm:px-3 sm:w-fit [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {filters.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-[11px] sm:text-sm font-semibold transition-all sm:px-4 sm:py-2 ${
                                filter === f.id
                                    ? "border-cyan-300/35 bg-cyan-300/14 text-cyan-100 shadow-[0_0_20px_rgba(0,242,255,0.15)]"
                                    : "border-transparent text-text-secondary hover:border-white/12 hover:bg-white/[0.05] hover:text-foreground"
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {filteredProfiles.length === 0 ? (
                    <div className="pb-24">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="glass col-span-full rounded-lg py-20 text-center"
                        >
                            <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No innovators found</h3>
                            <p className="text-text-muted text-sm">
                                There are currently no members in this category.
                            </p>
                        </motion.div>
                    </div>
                ) : (
                    <>
                        <AnimatePresence mode="popLayout">
                            <TeamSection profiles={filteredProfiles} roleMap={MAPPED_ROLES} />
                        </AnimatePresence>

                        <div className="grid grid-cols-1 gap-6 pb-24 sm:grid-cols-2 lg:hidden">
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
                                            className="glass group flex cursor-pointer flex-col items-center rounded-lg p-4 md:p-6 text-center"
                                            onClick={() => router.push(`/profile/${profile.id}`)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    router.push(`/profile/${profile.id}`);
                                                }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <div className="mb-4 flex shrink-0 h-40 w-40 items-center justify-center overflow-hidden rounded-full border-[3px] border-slate-500/40 shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:border-slate-400/60">
                                                {profile.avatar_url ? (
                                                    <img
                                                        src={profile.avatar_url}
                                                        alt={profile.display_name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <UserIcon className="h-10 w-10 text-primary-light/50" />
                                                )}
                                            </div>

                                            <h3 className="mb-1 w-full truncate text-lg font-bold text-foreground transition-colors group-hover:text-primary-light">
                                                {profile.display_name}
                                            </h3>

                                            <span className={`mb-4 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm ${MAPPED_ROLES[profile.role]?.class || MAPPED_ROLES.member.class}`}>
                                                {MAPPED_ROLES[profile.role]?.label || "Member"}
                                            </span>

                                            {parsedTags.length > 0 && (
                                                <div className="mt-auto flex flex-wrap justify-center gap-1.5">
                                                    {parsedTags.map((tag) => (
                                                        <span
                                                            key={tag.name}
                                                            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
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

                                            {profile.contact_email && (
                                                <a
                                                    href={`mailto:${profile.contact_email}`}
                                                    onClick={(event) => event.stopPropagation()}
                                                    className="mt-3 flex items-center gap-1.5 text-[11px] text-text-muted transition-colors hover:text-primary-light"
                                                >
                                                    <Mail className="h-3.5 w-3.5" />
                                                    {profile.contact_email}
                                                </a>
                                            )}

                                            {(profile.github_url || profile.linkedin_url) && (
                                                <div className="mt-3 flex items-center gap-3">
                                                    {profile.github_url && (
                                                        <a
                                                            href={profile.github_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(event) => event.stopPropagation()}
                                                            className="text-text-muted transition-colors hover:text-white"
                                                            title="GitHub"
                                                        >
                                                            <Github className="h-4.5 w-4.5" />
                                                        </a>
                                                    )}
                                                    {profile.linkedin_url && (
                                                        <a
                                                            href={profile.linkedin_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(event) => event.stopPropagation()}
                                                            className="text-text-muted transition-colors hover:text-[#0A66C2]"
                                                            title="LinkedIn"
                                                        >
                                                            <Linkedin className="h-4.5 w-4.5" />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
