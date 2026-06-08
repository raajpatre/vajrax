"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import {
    Loader2,
    Rocket,
    CheckCircle2,
    AlertCircle,
    X,
    Plus,
    ArrowLeft,
    ArrowRight,
    Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submitProjectRequest } from "@/actions/project-requests";

const CHIP_COLORS = [
    { border: "rgba(0,229,255,0.40)", text: "#00e5ff" },
    { border: "rgba(139,92,246,0.45)", text: "#a78bfa" },
    { border: "rgba(56,189,248,0.45)", text: "#7dd3fc" },
    { border: "rgba(34,197,94,0.35)", text: "#4ade80" },
    { border: "rgba(245,158,11,0.40)", text: "#fbbf24" },
];

function SuccessState({ title }: { title: string }) {
    const router = useRouter();
    const [secs, setSecs] = useState(3);

    useEffect(() => {
        const id = setInterval(() => {
            setSecs(s => {
                if (s <= 1) {
                    clearInterval(id);
                    router.push("/projects");
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [router]);

    return (
        <div
            className="relative rounded-md border overflow-hidden text-center"
            style={{
                borderColor: "rgba(34,197,94,0.45)",
                background: "#111820",
                boxShadow: "0 0 0 1px rgba(34,197,94,0.08), 0 0 40px -12px rgba(34,197,94,0.35)",
            }}
        >
            <div
                className="absolute inset-x-0 top-0 h-px pointer-events-none"
                style={{ background: "linear-gradient(90deg,transparent,rgba(34,197,94,0.6),transparent)" }}
            />
            <div
                className="absolute -inset-x-10 -top-20 h-52 pointer-events-none"
                style={{ background: "radial-gradient(40% 50% at 50% 100%, rgba(34,197,94,0.18) 0%, transparent 70%)" }}
            />

            <div className="relative px-8 py-12">
                <div
                    className="mx-auto w-16 h-16 grid place-items-center rounded-full mb-5"
                    style={{
                        border: "1px solid rgba(34,197,94,0.50)",
                        background: "rgba(34,197,94,0.10)",
                        boxShadow: "0 0 28px -6px rgba(34,197,94,0.6)",
                    }}
                >
                    <CheckCircle2 size={30} className="text-[#22c55e]" />
                </div>

                <h2 className="font-sans font-extrabold text-[#f0f4ff] text-[26px] tracking-tight">
                    Proposal Submitted
                </h2>
                <p className="text-[#8b9ab0] text-[14px] mt-3 max-w-[46ch] mx-auto leading-relaxed">
                    Your proposal for{" "}
                    <span className="text-[#f0f4ff] font-semibold">&ldquo;{title}&rdquo;</span> is in the moderation
                    queue. You&apos;ll receive an email once it&apos;s been reviewed — usually within 5 business days.
                </p>

                <div
                    className="mt-6 inline-flex items-center gap-2 px-3 h-8 border rounded-sm"
                    style={{ borderColor: "rgba(0,229,255,0.14)", background: "rgba(13,17,23,0.6)" }}
                >
                    <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ background: "#f59e0b" }}
                    />
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#8b9ab0]">
                        MOD QUEUE · PENDING
                    </span>
                </div>

                <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4a5568]">
                    {secs > 0 ? `Redirecting in ${secs}s…` : "Taking you back…"}
                </div>

                <div className="mt-5 flex items-center justify-center">
                    <Link
                        href="/projects"
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border text-[13px] font-medium transition-all hover:opacity-80"
                        style={{
                            color: "#8b9ab0",
                            borderColor: "rgba(0,229,255,0.20)",
                            background: "rgba(0,229,255,0.04)",
                        }}
                    >
                        <ArrowLeft size={13} />
                        Back to Projects
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ProjectRequestPage() {
    const { user, loading: userLoading } = useUser();
    const tagRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [techStack, setTechStack] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [submittedTitle, setSubmittedTitle] = useState("");

    const addTag = () => {
        const t = tagInput.trim();
        if (!t) return;
        if (!techStack.includes(t)) setTechStack(ts => [...ts, t]);
        setTagInput("");
        tagRef.current?.focus();
    };

    const removeTag = (t: string) => setTechStack(ts => ts.filter(x => x !== t));

    const handleSubmit = async () => {
        setError(null);
        if (!title.trim()) {
            setError("Project title is required.");
            return;
        }
        if (description.trim().length < 30) {
            setError("Description must be at least 30 characters — give moderators something to work with.");
            return;
        }
        if (!user) return;

        setLoading(true);
        try {
            const result = await submitProjectRequest({ title, description, techStack });

            if (!result.ok) {
                setError(result.error ?? "Failed to submit proposal.");
                return;
            }

            setSubmittedTitle(title);
            setSuccess(true);
        } catch {
            setError("Something went wrong — please try again.");
        } finally {
            setLoading(false);
        }
    };

    const todayLabel = new Date()
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .toUpperCase();

    if (userLoading) return <VajraLoader fullPage />;

    return (
        <div className="relative max-w-2xl mx-auto px-6 pt-12 pb-20">
            {/* Section header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                    <span className="h-px w-8" style={{ background: "rgba(0,229,255,0.6)" }} />
                    <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#00e5ff]">
                        // WORKSPACE / PROPOSE
                    </span>
                </div>
                <h1 className="font-sans font-extrabold tracking-tight text-[#f0f4ff] text-[38px] leading-none">
                    Propose a Project
                </h1>
                <p className="text-[#8b9ab0] text-[14px] mt-3 leading-relaxed">
                    Your idea will be reviewed by club moderators. Good proposals include a clear problem statement,
                    a rough tech plan, and an idea of who&apos;d work on it.
                </p>
            </div>

            {success ? (
                <SuccessState title={submittedTitle} />
            ) : (
                <>
                    {/* Form card */}
                    <div
                        className="relative rounded-md border corner-ticks"
                        style={{
                            background: "rgba(17,24,32,0.90)",
                            backdropFilter: "blur(12px)",
                            borderColor: "rgba(0,229,255,0.28)",
                            boxShadow:
                                "0 0 0 1px rgba(0,229,255,0.06), 0 24px 60px -24px rgba(0,0,0,0.8), 0 0 40px -16px rgba(0,229,255,0.25)",
                        }}
                    >
                        {/* top accent line */}
                        <div
                            className="absolute inset-x-0 top-0 h-px pointer-events-none"
                            style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.6),transparent)" }}
                        />

                        {/* Header strip */}
                        <div
                            className="px-6 h-12 flex items-center justify-between border-b"
                            style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(7,9,15,0.40)" }}
                        >
                            <div className="flex items-center gap-2.5">
                                <span
                                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                                    style={{ background: "#00e5ff", boxShadow: "0 0 6px #00e5ff" }}
                                />
                                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#f0f4ff]">
                                    PROPOSAL FORM
                                </span>
                            </div>
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#4a5568]">
                                DRAFT · {todayLabel}
                            </span>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Title */}
                            <div>
                                <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b9ab0] mb-1.5">
                                    <span style={{ color: "rgba(0,229,255,0.70)" }}>$</span> Project Title
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Autonomous LiDAR Field Mapping"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full h-10 text-[13.5px] text-[#f0f4ff] placeholder:text-[#4a5568] rounded-md px-3 focus-cyan transition-shadow outline-none"
                                    style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.14)" }}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <div className="flex items-end justify-between mb-1.5">
                                    <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b9ab0]">
                                        <span style={{ color: "rgba(0,229,255,0.70)" }}>$</span> Description
                                    </label>
                                    <span className="font-mono text-[9.5px] text-[#4a5568] tracking-[0.06em]">
                                        REQUIRED · 30+ CHARS
                                    </span>
                                </div>
                                <textarea
                                    rows={6}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Describe what you're building, why, and what impact it'll have..."
                                    className="w-full text-[13.5px] text-[#f0f4ff] placeholder:text-[#4a5568] rounded-md px-3 py-2.5 resize-none leading-relaxed focus-cyan transition-shadow outline-none"
                                    style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.14)" }}
                                />
                            </div>

                            {/* Tech stack */}
                            <div>
                                <div className="flex items-end justify-between mb-1.5">
                                    <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b9ab0]">
                                        <span style={{ color: "rgba(0,229,255,0.70)" }}>$</span> Tech Stack
                                    </label>
                                    <span className="font-mono text-[9.5px] text-[#4a5568] tracking-[0.06em]">
                                        Add technologies used in this project
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={tagRef}
                                        type="text"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addTag();
                                            }
                                        }}
                                        placeholder="e.g. ROS2, Python, ESP32…"
                                        className="flex-1 h-9 text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] rounded-md px-3 focus-cyan transition-shadow outline-none"
                                        style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.14)" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={addTag}
                                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border font-mono text-[12px] font-medium transition-all hover:opacity-80"
                                        style={{
                                            color: "#00e5ff",
                                            borderColor: "rgba(0,229,255,0.35)",
                                            background: "rgba(0,229,255,0.08)",
                                        }}
                                    >
                                        <Plus size={13} />
                                        Add
                                    </button>
                                </div>

                                {techStack.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {techStack.map((t, i) => {
                                            const c = CHIP_COLORS[i % CHIP_COLORS.length];
                                            return (
                                                <span
                                                    key={t}
                                                    className="inline-flex items-center gap-1.5 h-[24px] pl-2 pr-1 rounded-sm border font-mono text-[10.5px] uppercase tracking-[0.08em]"
                                                    style={{
                                                        borderColor: c.border,
                                                        color: c.text,
                                                        background: "rgba(7,9,15,0.70)",
                                                    }}
                                                >
                                                    {t}
                                                    <button
                                                        onClick={() => removeTag(t)}
                                                        className="grid place-items-center w-4 h-4 rounded-sm text-[#8b9ab0] hover:text-[#f0f4ff] transition-colors"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="mt-2 font-mono text-[10px] text-[#4a5568] tracking-[0.06em] flex items-center gap-1.5">
                                        <Info size={10} style={{ color: "rgba(0,229,255,0.60)" }} />
                                        Optional — helps reviewers match you with collaborators
                                    </div>
                                )}
                            </div>

                            {/* Error */}
                            {error && (
                                <div
                                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-md border"
                                    style={{
                                        borderColor: "rgba(239,68,68,0.45)",
                                        background: "rgba(239,68,68,0.08)",
                                    }}
                                >
                                    <AlertCircle size={15} className="text-[#ef4444] shrink-0 mt-px" />
                                    <div className="text-[12.5px] text-[#ef4444] leading-snug">{error}</div>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-sm font-mono text-[12px] uppercase tracking-[0.14em] font-medium transition-all disabled:opacity-50"
                                style={{
                                    background: "#00e5ff",
                                    color: "#07090f",
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Submitting proposal…
                                    </>
                                ) : (
                                    <>
                                        <Rocket size={14} />
                                        Submit Proposal
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <span className="text-[#8b9ab0] text-[12.5px]">Changed your mind? </span>
                        <Link
                            href="/projects"
                            className="text-[#00e5ff] text-[12.5px] font-medium hover:underline underline-offset-2 inline-flex items-center gap-1"
                        >
                            Back to projects <ArrowRight size={11} />
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
