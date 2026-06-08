"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    GraduationCap,
    Loader2,
    Mail,
    Search,
    ShieldCheck,
    UserRoundPlus,
    X,
    XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import VajraLoader from "@/components/ui/VajraLoader";
import { useUser } from "@/lib/hooks/useUser";
import { Tables } from "@/types/database";

type Applicant = Tables<"applicants"> & {
    reviewerName?: string | null;
};

type FilterValue = "all" | Applicant["status"];

/* ── Status config ────────────────────────────────────────── */
const STATUS_CFG: Record<
    Applicant["status"],
    { fg: string; bg: string; bd: string; dot: string; icon: LucideIcon; label: string }
> = {
    pending:  { fg: "#f59e0b", bg: "rgba(245,158,11,0.10)", bd: "rgba(245,158,11,0.45)", dot: "#f59e0b", icon: Clock,        label: "PENDING"  },
    approved: { fg: "#22c55e", bg: "rgba(34,197,94,0.10)",  bd: "rgba(34,197,94,0.45)",  dot: "#22c55e", icon: CheckCircle2, label: "APPROVED" },
    rejected: { fg: "#ef4444", bg: "rgba(239,68,68,0.10)",  bd: "rgba(239,68,68,0.45)",  dot: "#ef4444", icon: XCircle,      label: "REJECTED" },
};

/* ── Stat card ────────────────────────────────────────────── */
function StatCard({
    status,
    count,
    label,
}: {
    status: Applicant["status"];
    count: number;
    label: string;
}) {
    const c = STATUS_CFG[status];
    const Icon = c.icon;
    return (
        <div
            className="flex-1 flex items-center gap-4 rounded-md px-5 py-4"
            style={{
                background: "#0d1117",
                border: `1px solid ${c.bd}`,
                boxShadow: `0 0 24px -8px ${c.fg}28`,
            }}
        >
            <div
                className="grid place-items-center w-11 h-11 rounded-sm shrink-0"
                style={{
                    color: c.fg,
                    background: c.bg,
                    border: `1px solid ${c.bd}`,
                    boxShadow: `0 0 16px -4px ${c.fg}60`,
                }}
            >
                <Icon size={20} />
            </div>
            <div>
                <div
                    className="font-mono font-semibold tabular-nums leading-none"
                    style={{ fontSize: 28, color: c.fg }}
                >
                    {String(count).padStart(2, "0")}
                </div>
                <div
                    className="font-mono text-[10px] uppercase tracking-[0.20em] mt-1"
                    style={{ color: "#8b9ab0" }}
                >
                    {label}
                </div>
            </div>
        </div>
    );
}

/* ── Status badge ─────────────────────────────────────────── */
function StatusBadge({ status }: { status: Applicant["status"] }) {
    const c = STATUS_CFG[status];
    return (
        <span
            className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-sm border font-mono text-[10.5px] uppercase tracking-[0.12em] font-medium"
            style={{ color: c.fg, background: c.bg, borderColor: c.bd }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: c.dot, boxShadow: `0 0 6px ${c.dot}` }}
            />
            {c.label}
        </span>
    );
}

/* ── Filter pill ──────────────────────────────────────────── */
function FilterPill({
    label,
    active,
    count,
    color,
    onClick,
}: {
    label: string;
    active: boolean;
    count: number;
    color?: string;
    onClick: () => void;
}) {
    const activeColor = color ?? "#00e5ff";
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-sm border font-mono text-[10.5px] uppercase tracking-[0.12em] transition-all"
            style={
                active
                    ? {
                        color: activeColor,
                        background: color ? `${color}18` : "rgba(0,229,255,0.10)",
                        borderColor: activeColor,
                      }
                    : {
                        color: "#8b9ab0",
                        background: "transparent",
                        borderColor: "rgba(139,154,176,0.25)",
                      }
            }
        >
            {label}
            <span
                className="font-mono text-[10px] tabular-nums"
                style={{ color: active ? activeColor : "#4a5568" }}
            >
                {String(count).padStart(2, "0")}
            </span>
        </button>
    );
}

/* ── Applicant card ───────────────────────────────────────── */
function ApplicantCard({
    applicant,
    note,
    onNoteChange,
    onReview,
    processingId,
    processingAction,
}: {
    applicant: Applicant;
    note: string;
    onNoteChange: (id: string, val: string) => void;
    onReview: (id: string, action: "approve" | "reject") => void;
    processingId: string | null;
    processingAction: "approve" | "reject" | null;
}) {
    const isPending = applicant.status === "pending";
    const c = STATUS_CFG[applicant.status];
    const StatusIcon = c.icon;
    const isProcessing = processingId === applicant.id;
    const fullName = `${applicant.first_name} ${applicant.last_name}`;

    const appliedDate = new Date(applicant.created_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
    const reviewedDate = applicant.reviewed_at
        ? new Date(applicant.reviewed_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : null;

    return (
        <div
            className="rounded-md overflow-hidden transition-all duration-200"
            style={{
                background: "#0d1117",
                border: `1px solid ${isPending ? "rgba(0,229,255,0.14)" : c.bd + "55"}`,
            }}
        >
            {/* Status accent stripe */}
            <div
                className="h-[2px] w-full"
                style={{
                    background: `linear-gradient(90deg,transparent,${c.fg}90,transparent)`,
                }}
            />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <h3
                        className="font-sans font-semibold text-[16px] tracking-tight leading-snug"
                        style={{ color: "#f0f4ff" }}
                    >
                        {fullName}
                    </h3>
                    <div className="shrink-0">
                        <StatusBadge status={applicant.status} />
                    </div>
                </div>

                {/* Info row */}
                <div
                    className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mb-4 font-mono text-[11px]"
                    style={{ color: "#8b9ab0" }}
                >
                    <span className="flex items-center gap-1.5">
                        <Mail size={11} style={{ color: "#4a5568" }} />
                        {applicant.email}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <GraduationCap size={11} style={{ color: "#4a5568" }} />
                        Sem {applicant.current_semester}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Calendar size={11} style={{ color: "#4a5568" }} />
                        Applied {appliedDate}
                    </span>
                </div>

                {/* Purpose blockquote */}
                <div
                    className="relative pl-4 mb-4"
                    style={{ borderLeft: "2px solid rgba(0,229,255,0.55)" }}
                >
                    <div
                        className="font-mono text-[9.5px] uppercase tracking-[0.18em] mb-1.5"
                        style={{ color: "#4a5568" }}
                    >
                        PURPOSE
                    </div>
                    <p
                        className="text-[13px] italic leading-relaxed"
                        style={{ color: "#8b9ab0" }}
                    >
                        {applicant.purpose}
                    </p>
                </div>

                {/* Review note textarea */}
                <div className="mb-4">
                    <div
                        className="font-mono text-[9.5px] uppercase tracking-[0.18em] mb-1.5"
                        style={{ color: "#4a5568" }}
                    >
                        REVIEW NOTE
                    </div>
                    <textarea
                        rows={2}
                        value={note}
                        onChange={(e) => onNoteChange(applicant.id, e.target.value)}
                        placeholder="Add review note…"
                        disabled={!isPending}
                        className="w-full text-[12.5px] border rounded-sm px-3 py-2 resize-none transition-all leading-relaxed outline-none"
                        style={{
                            background: "#07090f",
                            color: "#f0f4ff",
                            borderColor: isPending
                                ? "rgba(0,229,255,0.18)"
                                : "rgba(0,229,255,0.08)",
                            opacity: isPending ? 1 : 0.7,
                        }}
                        onFocus={(e) => {
                            if (isPending) {
                                e.currentTarget.style.borderColor = "rgba(0,229,255,0.55)";
                                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(0,229,255,0.25)";
                            }
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = isPending
                                ? "rgba(0,229,255,0.18)"
                                : "rgba(0,229,255,0.08)";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />
                </div>

                {/* Review history (non-pending) */}
                {!isPending && (applicant.reviewerName || applicant.reviewed_at || applicant.review_note) && (
                    <div
                        className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-sm"
                        style={{
                            background: "rgba(0,229,255,0.04)",
                            border: "1px solid rgba(0,229,255,0.10)",
                        }}
                    >
                        <StatusIcon size={13} style={{ color: c.fg, marginTop: 1, flexShrink: 0 }} />
                        <div>
                            <span className="font-mono text-[10.5px]" style={{ color: "#8b9ab0" }}>
                                Reviewed
                                {applicant.reviewerName && (
                                    <>
                                        {" "}by{" "}
                                        <span style={{ color: "#f0f4ff" }}>{applicant.reviewerName}</span>
                                    </>
                                )}
                                {reviewedDate && (
                                    <>
                                        {" "}on{" "}
                                        <span style={{ color: "#f0f4ff" }}>{reviewedDate}</span>
                                    </>
                                )}
                            </span>
                            {applicant.review_note && (
                                <div
                                    className="font-mono text-[11px] mt-1 italic"
                                    style={{ color: "#8b9ab0" }}
                                >
                                    &ldquo;{applicant.review_note}&rdquo;
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Action row — pending only */}
                {isPending && (
                    <div className="flex items-center gap-2 pt-1">
                        <button
                            onClick={() => onReview(applicant.id, "approve")}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] transition-all disabled:opacity-60"
                            style={{
                                background: "rgba(34,197,94,0.12)",
                                color: "#22c55e",
                                borderColor: "rgba(34,197,94,0.45)",
                            }}
                            onMouseOver={(e) => {
                                if (!isProcessing) e.currentTarget.style.background = "rgba(34,197,94,0.22)";
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = "rgba(34,197,94,0.12)";
                            }}
                        >
                            {isProcessing && processingAction === "approve" ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Approving…
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={14} />
                                    Approve
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => onReview(applicant.id, "reject")}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] transition-all disabled:opacity-60"
                            style={{
                                background: "rgba(239,68,68,0.10)",
                                color: "#ef4444",
                                borderColor: "rgba(239,68,68,0.45)",
                            }}
                            onMouseOver={(e) => {
                                if (!isProcessing) e.currentTarget.style.background = "rgba(239,68,68,0.20)";
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = "rgba(239,68,68,0.10)";
                            }}
                        >
                            {isProcessing && processingAction === "reject" ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Rejecting…
                                </>
                            ) : (
                                <>
                                    <XCircle size={14} />
                                    Reject
                                </>
                            )}
                        </button>
                        <span
                            className="font-mono text-[10px] ml-1"
                            style={{ color: "#4a5568" }}
                        >
                            // note is optional
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function AdminApplicantsPage() {
    const { isFaculty, isModerator, loading: authLoading } = useUser();
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterValue>("all");
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [processingAction, setProcessingAction] = useState<"approve" | "reject" | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchApplicants = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/admin/applicants");
            const data = await response.json().catch(() => ({ error: "Failed to parse response." }));
            if (!response.ok) {
                setError(data.error || "Failed to load applicants.");
                return;
            }
            setApplicants(data.applicants ?? []);
        } catch {
            setError("Network error — could not reach the server.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const id = window.setTimeout(() => { void fetchApplicants(); }, 0);
        return () => window.clearTimeout(id);
    }, [fetchApplicants]);

    const counts = useMemo(
        () => ({
            all:      applicants.length,
            pending:  applicants.filter((a) => a.status === "pending").length,
            approved: applicants.filter((a) => a.status === "approved").length,
            rejected: applicants.filter((a) => a.status === "rejected").length,
        }),
        [applicants]
    );

    const visible = useMemo(() => {
        let list = filter === "all" ? applicants : applicants.filter((a) => a.status === filter);
        const q = search.toLowerCase().trim();
        if (q) {
            list = list.filter((a) => {
                const name = `${a.first_name} ${a.last_name}`.toLowerCase();
                return name.includes(q) || a.email.toLowerCase().includes(q) || a.purpose.toLowerCase().includes(q);
            });
        }
        return [...list].sort((a, b) => {
            const order: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
            return (order[a.status] ?? 3) - (order[b.status] ?? 3);
        });
    }, [applicants, filter, search]);

    const handleNoteChange = useCallback((id: string, val: string) => {
        setNotes((prev) => ({ ...prev, [id]: val }));
    }, []);

    const handleReview = useCallback(
        async (applicantId: string, action: "approve" | "reject") => {
            setProcessingId(applicantId);
            setProcessingAction(action);
            setError(null);

            const response = await fetch(`/api/admin/applicants/${applicantId}/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reviewNote: notes[applicantId]?.trim() || null }),
            });
            const data = await response.json().catch(() => ({ error: `Failed to ${action} applicant.` }));

            if (!response.ok) {
                setError(data.error || `Failed to ${action} applicant.`);
                setProcessingId(null);
                setProcessingAction(null);
                return;
            }

            setNotes((prev) => ({ ...prev, [applicantId]: "" }));
            await fetchApplicants();
            setProcessingId(null);
            setProcessingAction(null);
        },
        [notes, fetchApplicants]
    );

    if (authLoading || loading) return <VajraLoader fullPage />;

    if (!isFaculty && !isModerator) {
        return (
            <div className="min-h-screen grid place-items-center" style={{ background: "#07090f" }}>
                <div
                    className="relative w-full max-w-sm text-center rounded-md p-10"
                    style={{
                        background: "#0d1117",
                        border: "1px solid rgba(239,68,68,0.30)",
                    }}
                >
                    <div
                        className="absolute inset-x-0 top-0 h-px"
                        style={{
                            background:
                                "linear-gradient(90deg,transparent,rgba(239,68,68,0.7),transparent)",
                        }}
                    />
                    <ShieldCheck size={32} className="mx-auto mb-4" style={{ color: "#4a5568" }} />
                    <h2
                        className="font-bold text-[18px] tracking-tight"
                        style={{ color: "#f0f4ff" }}
                    >
                        Access Denied
                    </h2>
                    <p className="text-[13px] mt-2" style={{ color: "#8b9ab0" }}>
                        Only faculty and club leadership can review applicants.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative" style={{ background: "#07090f" }}>
            {/* Grid bg */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />

            <div className="relative max-w-3xl mx-auto px-8 pt-10 pb-20">
                {/* Kicker */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="h-px w-8" style={{ background: "rgba(0,229,255,0.6)" }} />
                    <span
                        className="font-mono text-[10.5px] uppercase tracking-[0.24em]"
                        style={{ color: "#00e5ff" }}
                    >
                        // ADMIN / APPLICANTS
                    </span>
                </div>

                {/* Page header */}
                <div className="mb-8">
                    <h1
                        className="font-sans font-black tracking-tight"
                        style={{ fontSize: 30, color: "#f0f4ff" }}
                    >
                        New Applicants
                    </h1>
                    <p className="text-[13.5px] mt-1.5" style={{ color: "#8b9ab0" }}>
                        Review signup applications and admit or decline candidates.
                    </p>
                </div>

                {/* Stat cards */}
                <div className="flex gap-4 mb-8">
                    <StatCard status="pending"  count={counts.pending}  label="Pending"  />
                    <StatCard status="approved" count={counts.approved} label="Approved" />
                    <StatCard status="rejected" count={counts.rejected} label="Rejected" />
                </div>

                {/* Filter + search row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                    <div className="flex items-center gap-2 flex-wrap">
                        {(
                            [
                                { label: "All",      value: "all",      color: undefined },
                                { label: "Pending",  value: "pending",  color: "#f59e0b" },
                                { label: "Approved", value: "approved", color: "#22c55e" },
                                { label: "Rejected", value: "rejected", color: "#ef4444" },
                            ] as const
                        ).map((f) => (
                            <FilterPill
                                key={f.value}
                                label={f.label}
                                active={filter === f.value}
                                count={f.value === "all" ? counts.all : counts[f.value]}
                                color={f.color}
                                onClick={() => setFilter(f.value)}
                            />
                        ))}
                    </div>

                    <div className="relative sm:ml-auto w-full sm:w-auto sm:min-w-[220px]">
                        <span
                            className="absolute inset-y-0 left-0 grid place-items-center w-9 pointer-events-none border-r"
                            style={{ borderColor: "rgba(0,229,255,0.12)", color: "#8b9ab0" }}
                        >
                            <Search size={13} />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search applicants…"
                            className="w-full h-9 text-[12.5px] border rounded-md outline-none pl-11 pr-3 placeholder:opacity-40 transition-colors"
                            style={{
                                background: "#0d1117",
                                color: "#f0f4ff",
                                borderColor: "rgba(0,229,255,0.12)",
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.45)"; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.12)"; }}
                        />
                    </div>
                </div>

                {/* Error banner */}
                {error && (
                    <div
                        className="mb-4 flex items-center gap-2.5 px-4 py-2.5 rounded-sm border"
                        style={{
                            background: "rgba(239,68,68,0.08)",
                            borderColor: "rgba(239,68,68,0.35)",
                        }}
                    >
                        <AlertCircle size={13} style={{ color: "#ef4444" }} />
                        <span className="font-mono text-[11px]" style={{ color: "#8b9ab0" }}>
                            <span style={{ color: "#ef4444" }}>Error: </span>
                            {error}
                        </span>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto"
                            style={{ color: "#4a5568" }}
                        >
                            <X size={13} />
                        </button>
                    </div>
                )}

                {/* List / empty */}
                {visible.length === 0 ? (
                    <div
                        className="text-center py-14 border border-dashed rounded-md"
                        style={{
                            borderColor: "rgba(0,229,255,0.15)",
                            background: "rgba(0,229,255,0.02)",
                        }}
                    >
                        <div
                            className="mx-auto w-12 h-12 grid place-items-center border rounded-md mb-4"
                            style={{
                                borderColor: "rgba(0,229,255,0.18)",
                                background: "#07090f",
                                color: "#4a5568",
                            }}
                        >
                            <UserRoundPlus size={20} />
                        </div>
                        <div
                            className="font-sans font-semibold text-[15px]"
                            style={{ color: "#f0f4ff" }}
                        >
                            No applicants
                        </div>
                        <p className="text-[13px] mt-1.5" style={{ color: "#8b9ab0" }}>
                            {search
                                ? "No results for that query."
                                : "All caught up — nothing to review."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {visible.map((a) => (
                            <ApplicantCard
                                key={a.id}
                                applicant={a}
                                note={notes[a.id] ?? a.review_note ?? ""}
                                onNoteChange={handleNoteChange}
                                onReview={handleReview}
                                processingId={processingId}
                                processingAction={processingAction}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
