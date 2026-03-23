"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Tables } from "@/types/database";
import { Cpu, Filter, FolderOpen, FolderPlus } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";

type Project = Tables<"projects">;

const statusConfig: Record<string, { class: string; label: string }> = {
    ongoing: { class: "status-ongoing", label: "Ongoing" },
    in_progress: { class: "status-ongoing", label: "In Progress" },
    planning: { class: "status-archived", label: "Planning" },
    completed: { class: "status-completed", label: "Completed" },
    archived: { class: "status-archived", label: "Archived" },
};

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    }),
};

export default function ProjectsClient({ projects }: { projects: Project[] }) {
    const [filter, setFilter] = useState<string>("all");
    const { isAuthenticated } = useUser();
    const filtered =
        filter === "all" ? projects : projects.filter((p) => p.status === filter);

    return (
        <div className="min-h-screen pt-[calc(var(--nav-height)+2rem)]">
            {/* Header */}
            <div className="max-w-7xl mx-auto px-6 mb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <FolderOpen className="w-5 h-5 text-primary-light" />
                            </div>
                            <h1 className="section-title text-3xl">Projects</h1>
                        </div>
                        <p className="text-text-secondary max-w-lg">
                            Explore our portfolio of robotics R&D — from concept to competition.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-text-muted" />
                        {["all", "in_progress", "completed", "archived"].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filter === s
                                    ? "bg-primary/20 text-primary-light border border-primary/30"
                                    : "text-text-muted hover:text-text-secondary border border-transparent"
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    {isAuthenticated && (
                        <Link
                            href="/projects/request"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-primary/15 text-primary-light border border-primary/20 hover:bg-primary/25 transition-all"
                        >
                            <FolderPlus className="w-3.5 h-3.5" />
                            Propose a Project
                        </Link>
                    )}
                </div>
            </div>

            {/* Projects Grid */}
            <div className="max-w-7xl mx-auto px-6 pb-24">
                {filtered.length === 0 ? (
                    <div className="glass p-16 text-center">
                        <Cpu className="w-12 h-12 text-text-muted mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                        <p className="text-text-muted text-sm">
                            Projects will appear here once the club faculty adds them.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((project, i) => (
                            <Link key={project.id} href={`/projects/${project.id}`}>
                            <motion.div
                                custom={i}
                                initial="hidden"
                                animate="visible"
                                variants={fadeUp}
                                className="glass group overflow-hidden hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                                {/* Cover image */}
                                {project.cover_image_url && (
                                    <div className="aspect-video overflow-hidden">
                                        <img
                                            src={project.cover_image_url}
                                            alt={project.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                )}
                                {!project.cover_image_url && (
                                    <div className="aspect-video bg-surface-light flex items-center justify-center">
                                        <Cpu className="w-12 h-12 text-text-muted/30" />
                                    </div>
                                )}

                                <div className="p-6">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <h3 className="text-lg font-semibold line-clamp-1 group-hover:text-primary-light transition-colors">
                                            {project.title}
                                        </h3>
                                        <span
                                            className={`badge text-[10px] whitespace-nowrap ${statusConfig[project.status]?.class ?? "status-archived"
                                                }`}
                                        >
                                            {statusConfig[project.status]?.label ?? project.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-text-secondary line-clamp-3 mb-4 leading-relaxed">
                                        {project.description}
                                    </p>
                                    {project.tech_stack && project.tech_stack.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {project.tech_stack.map((tech) => (
                                                <span
                                                    key={tech}
                                                    className="px-2 py-0.5 rounded-md bg-surface-light text-[11px] text-text-muted font-mono"
                                                >
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
