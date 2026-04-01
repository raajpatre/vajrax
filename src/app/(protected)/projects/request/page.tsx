"use client";

import { useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import {
    Loader2,
    Send,
    CheckCircle2,
    AlertCircle,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { submitProjectRequest } from "@/actions/project-requests";

export default function ProjectRequestPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [techInput, setTechInput] = useState("");
    const [techStack, setTechStack] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const addTech = () => {
        const t = techInput.trim();
        if (t && !techStack.includes(t)) {
            setTechStack([...techStack, t]);
            setTechInput("");
        }
    };

    const removeTech = (tech: string) => {
        setTechStack(techStack.filter((t) => t !== tech));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !title.trim()) return;

        setLoading(true);
        setError(null);

        const result = await submitProjectRequest({
            title,
            description,
            techStack,
        });

        if (!result.ok) {
            setError(result.error);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
        setTimeout(() => router.push("/projects"), 2000);
    };

    if (userLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-xl mx-auto px-4 py-16 text-center">
                <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
                <p className="text-text-muted text-sm">
                    You need to be signed in to request a project.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-bold">Request a Project</h1>
                    <p className="text-xs text-text-muted">
                        Submit a project proposal for faculty approval
                    </p>
                </div>
            </div>

            {success ? (
                <div className="glass p-12 text-center">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Request Submitted!</h3>
                    <p className="text-text-muted text-sm">
                        Your project proposal will be reviewed by faculty. Redirecting...
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="glass p-6 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            Project Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="e.g. Autonomous Drone Navigation"
                            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            placeholder="Describe your project idea, goals, and what you plan to build..."
                            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            Tech Stack
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={techInput}
                                onChange={(e) => setTechInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addTech();
                                    }
                                }}
                                placeholder="Add a technology..."
                                className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                            />
                            <button
                                type="button"
                                onClick={addTech}
                                className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary-light border border-primary/20 text-sm font-medium hover:bg-primary/20 transition-all"
                            >
                                Add
                            </button>
                        </div>
                        {techStack.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {techStack.map((tech) => (
                                    <span
                                        key={tech}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-light text-xs text-text-secondary font-mono"
                                    >
                                        {tech}
                                        <button
                                            type="button"
                                            onClick={() => removeTech(tech)}
                                            className="text-text-muted hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !title.trim()}
                        className="btn-primary w-full !py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Submit Proposal
                    </button>
                </form>
            )}
        </div>
    );
}
