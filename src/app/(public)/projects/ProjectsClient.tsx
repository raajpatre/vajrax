"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Tables } from "@/types/database";
import { Cpu, Filter, FolderPlus } from "lucide-react";
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
        <div className="relative min-h-screen overflow-hidden pb-24 pt-[calc(var(--nav-height)+2.5rem)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(125,114,255,0.12),transparent_30%),radial-gradient(circle_at_88%_14%,rgba(0,242,255,0.12),transparent_28%)]" />

            <div className="relative z-10 mx-auto max-w-7xl px-6">
                <div className="mb-11 flex flex-col gap-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="section-title mb-3 text-3xl">Projects</h1>
                            <p className="max-w-xl text-text-secondary">
                                Explore our robotics R&D portfolio, from first prototype to competition-ready systems.
                            </p>
                        </div>
                        {isAuthenticated && (
                            <Link
                                href="/projects/request"
                                className="btn-primary w-fit text-sm !px-5 !py-2.5"
                            >
                                <FolderPlus className="h-4 w-4" />
                                Propose a Project
                            </Link>
                        )}
                    </div>

                    <div className="glass inline-flex w-fit flex-wrap items-center gap-2 rounded-2xl px-3 py-2">
                        <Filter className="h-4 w-4 text-text-muted" />
                        {["all", "in_progress", "completed", "archived"].map((s) => {
                            const isActive = filter === s;
                            return (
                                <button
                                    key={s}
                                    onClick={() => setFilter(s)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                                        isActive
                                            ? "border-cyan-300/35 bg-cyan-300/14 text-cyan-100 shadow-[0_0_20px_rgba(0,242,255,0.15)]"
                                            : "border-transparent text-text-muted hover:border-white/12 hover:bg-white/[0.05] hover:text-text-secondary"
                                    }`}
                                >
                                    {s.replace("_", " ")}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="glass p-16 text-center">
                        <Cpu className="mx-auto mb-4 h-12 w-12 text-text-muted" />
                        <h3 className="mb-2 text-lg font-semibold">No projects yet</h3>
                        <p className="text-text-muted text-sm">
                            Projects will appear here once the club faculty adds them.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((project, i) => (
                            <Link key={project.id} href={`/projects/${project.id}`} className="block">
                                <motion.div
                                    custom={i}
                                    initial="hidden"
                                    animate="visible"
                                    variants={fadeUp}
                                    className="glass energy-card group relative overflow-hidden rounded-[22px] border-white/14 transition-all duration-500 hover:border-cyan-300/32"
                                >
                                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                        <div className="absolute -left-10 top-0 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl" />
                                        <div className="absolute -bottom-10 right-0 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
                                    </div>

                                    {project.cover_image_url ? (
                                        <div className="aspect-video overflow-hidden">
                                            <img
                                                src={project.cover_image_url}
                                                alt={project.title}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex aspect-video items-center justify-center bg-surface-light/70">
                                            <Cpu className="h-12 w-12 text-text-muted/30" />
                                        </div>
                                    )}

                                    <div className="relative p-6">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <h3 className="line-clamp-1 text-lg font-semibold transition-colors group-hover:text-cyan-100">
                                                {project.title}
                                            </h3>
                                            <span
                                                className={`badge whitespace-nowrap text-[10px] ${
                                                    statusConfig[project.status]?.class ?? "status-archived"
                                                }`}
                                            >
                                                {statusConfig[project.status]?.label ?? project.status}
                                            </span>
                                        </div>
                                        <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-text-secondary">
                                            {project.description}
                                        </p>
                                        {project.tech_stack && project.tech_stack.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {project.tech_stack.map((tech) => (
                                                    <span
                                                        key={tech}
                                                        className="rounded-md border border-white/10 bg-[#0e223c]/70 px-2 py-0.5 font-mono text-[11px] text-text-muted"
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
