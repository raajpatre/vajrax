"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertCircle,
    Check,
    Clock3,
    Loader2,
    Mail,
    Search,
    ShieldCheck,
    UserRoundPlus,
    X,
} from "lucide-react";
import VajraLoader from "@/components/ui/VajraLoader";
import { useUser } from "@/lib/hooks/useUser";
import { Tables } from "@/types/database";

type Applicant = Tables<"applicants"> & {
    reviewerName?: string | null;
};

const statusBadge: Record<Applicant["status"], string> = {
    pending: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    approved: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    rejected: "border-red-400/25 bg-red-400/10 text-red-300",
};

export default function AdminApplicantsPage() {
    const { isFaculty, isModerator, loading: authLoading } = useUser();
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    const fetchApplicants = useCallback(async () => {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/admin/applicants");
        const data = await response.json().catch(() => ({ error: "Failed to load applicants." }));

        if (!response.ok) {
            setError(data.error || "Failed to load applicants.");
            setLoading(false);
            return;
        }

        setApplicants(data.applicants ?? []);
        setLoading(false);
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchApplicants();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [fetchApplicants]);

    const filteredApplicants = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return applicants;

        return applicants.filter((applicant) => {
            const name = `${applicant.first_name} ${applicant.last_name}`.toLowerCase();
            return (
                name.includes(query) ||
                applicant.email.toLowerCase().includes(query) ||
                applicant.purpose.toLowerCase().includes(query)
            );
        });
    }, [applicants, search]);

    const handleReview = async (applicantId: string, action: "approve" | "reject") => {
        setProcessingId(applicantId);
        setError(null);

        const response = await fetch(`/api/admin/applicants/${applicantId}/${action}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                reviewNote: notes[applicantId]?.trim() || null,
            }),
        });

        const data = await response.json().catch(() => ({ error: `Failed to ${action} applicant.` }));

        if (!response.ok) {
            setError(data.error || `Failed to ${action} applicant.`);
            setProcessingId(null);
            return;
        }

        setNotes((current) => ({ ...current, [applicantId]: "" }));
        await fetchApplicants();
        setProcessingId(null);
    };

    if (authLoading) {
        return <VajraLoader fullPage />;
    }

    if (!isFaculty && !isModerator) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-16 text-center">
                <ShieldCheck className="mx-auto mb-4 h-16 w-16 text-text-muted" />
                <h2 className="mb-2 text-xl font-bold">Access Denied</h2>
                <p className="text-sm text-text-muted">
                    Only faculty and club leadership can review applicants.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            <div className="mb-6 flex items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold">New Applicants</h1>
                    <p className="text-sm text-text-muted">
                        Review incoming member applications before granting VajraX access.
                    </p>
                </div>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="glass p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Pending</p>
                    <p className="mt-2 text-2xl font-semibold">
                        {applicants.filter((applicant) => applicant.status === "pending").length}
                    </p>
                </div>
                <div className="glass p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Approved</p>
                    <p className="mt-2 text-2xl font-semibold">
                        {applicants.filter((applicant) => applicant.status === "approved").length}
                    </p>
                </div>
                <div className="glass p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Rejected</p>
                    <p className="mt-2 text-2xl font-semibold">
                        {applicants.filter((applicant) => applicant.status === "rejected").length}
                    </p>
                </div>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search applicants..."
                    className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
            </div>

            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <VajraLoader />
                </div>
            ) : filteredApplicants.length === 0 ? (
                <div className="glass p-8 text-center md:p-16">
                    <UserRoundPlus className="mx-auto mb-4 h-12 w-12 text-text-muted" />
                    <h3 className="mb-2 text-lg font-semibold">No applicants found</h3>
                    <p className="text-sm text-text-muted">
                        New signups will appear here once someone submits the public application form.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {filteredApplicants.map((applicant) => {
                            const isProcessing = processingId === applicant.id;
                            const fullName = `${applicant.first_name} ${applicant.last_name}`;

                            return (
                                <motion.div
                                    key={applicant.id}
                                    layout
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="glass p-4 md:p-5"
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                                <h2 className="text-lg font-semibold">{fullName}</h2>
                                                <span
                                                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusBadge[applicant.status]}`}
                                                >
                                                    {applicant.status}
                                                </span>
                                            </div>

                                            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary">
                                                <span className="inline-flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-text-muted" />
                                                    {applicant.email}
                                                </span>
                                                <span className="inline-flex items-center gap-2">
                                                    <Clock3 className="h-4 w-4 text-text-muted" />
                                                    Semester {applicant.current_semester}
                                                </span>
                                                <span className="text-xs text-text-muted">
                                                    Applied{" "}
                                                    {new Date(applicant.created_at).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </span>
                                            </div>

                                            <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                                                <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-text-muted">
                                                    Purpose to Join VajraX
                                                </p>
                                                <p className="text-sm leading-relaxed text-text-secondary">
                                                    {applicant.purpose}
                                                </p>
                                            </div>

                                            <div className="mt-4">
                                                <label
                                                    htmlFor={`note-${applicant.id}`}
                                                    className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-text-muted"
                                                >
                                                    Review Note
                                                </label>
                                                <textarea
                                                    id={`note-${applicant.id}`}
                                                    value={notes[applicant.id] ?? applicant.review_note ?? ""}
                                                    onChange={(event) =>
                                                        setNotes((current) => ({
                                                            ...current,
                                                            [applicant.id]: event.target.value,
                                                        }))
                                                    }
                                                    rows={3}
                                                    placeholder="Optional note for approval or rejection"
                                                    className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                                                />
                                            </div>

                                            {(applicant.reviewed_at || applicant.reviewerName || applicant.review_note) && (
                                                <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-text-secondary">
                                                    <p className="font-medium text-foreground">Review history</p>
                                                    <p className="mt-1">
                                                        {applicant.reviewerName
                                                            ? `Reviewed by ${applicant.reviewerName}`
                                                            : "Reviewed"}
                                                        {applicant.reviewed_at
                                                            ? ` on ${new Date(applicant.reviewed_at).toLocaleDateString("en-US", {
                                                                  month: "short",
                                                                  day: "numeric",
                                                                  year: "numeric",
                                                              })}`
                                                            : ""}
                                                    </p>
                                                    {applicant.review_note && (
                                                        <p className="mt-2 text-text-muted">{applicant.review_note}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {applicant.status === "pending" && (
                                            <div className="flex w-full flex-col gap-2 lg:w-[220px]">
                                                <button
                                                    onClick={() => handleReview(applicant.id, "approve")}
                                                    disabled={isProcessing}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/25 disabled:opacity-50"
                                                >
                                                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                    Approve Applicant
                                                </button>
                                                <button
                                                    onClick={() => handleReview(applicant.id, "reject")}
                                                    disabled={isProcessing}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/20 disabled:opacity-50"
                                                >
                                                    <X className="h-4 w-4" />
                                                    Reject Applicant
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
