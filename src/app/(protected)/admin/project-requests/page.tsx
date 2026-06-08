"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import {
    ShieldOff,
    Loader2,
    CheckCircle2,
    XCircle,
    Calendar,
    FolderOpen,
} from "lucide-react";
import { reviewProjectRequest } from "@/actions/project-requests";

type RequestStatus = "pending" | "approved" | "rejected";

interface ProjectRequest {
    id: string;
    title: string;
    description: string | null;
    tech_stack: string[] | null;
    status: RequestStatus;
    created_at: string | null;
    requester: { id: string; display_name: string; avatar_url: string | null };
}

const STATUS_CFG: Record<RequestStatus, { fg: string; bg: string; bd: string; dot: string; label: string }> = {
    pending:  { fg: "#f59e0b", bg: "rgba(245,158,11,0.10)",  bd: "rgba(245,158,11,0.45)", dot: "#f59e0b", label: "PENDING"  },
    approved: { fg: "#22c55e", bg: "rgba(34,197,94,0.10)",   bd: "rgba(34,197,94,0.45)",  dot: "#22c55e", label: "APPROVED" },
    rejected: { fg: "#ef4444", bg: "rgba(239,68,68,0.10)",   bd: "rgba(239,68,68,0.45)",  dot: "#ef4444", label: "REJECTED" },
};

const STACK_COLORS = [
    { bg: "rgba(0,229,255,0.10)",    bd: "rgba(0,229,255,0.35)"    },
    { bg: "rgba(167,139,250,0.10)",  bd: "rgba(167,139,250,0.35)"  },
    { bg: "rgba(56,189,248,0.10)",   bd: "rgba(56,189,248,0.35)"   },
    { bg: "rgba(34,197,94,0.10)",    bd: "rgba(34,197,94,0.35)"    },
    { bg: "rgba(245,158,11,0.10)",   bd: "rgba(245,158,11,0.35)"   },
];

function getInitials(name: string) {
    return name
        .split(" ")
        .map(w => w[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function StatusBadge({ status }: { status: RequestStatus }) {
    const c = STATUS_CFG[status];
    return (
        <span
            className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-sm border font-mono text-[10.5px] uppercase tracking-[0.12em] font-medium"
            style={{ color: c.fg, background: c.bg, borderColor: c.bd }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: c.dot, boxShadow: `0 0 5px ${c.dot}` }}
            />
            {c.label}
        </span>
    );
}

function ProposalCard({
    req,
    delay,
    onApprove,
    onReject,
}: {
    req: ProjectRequest;
    delay: number;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}) {
    const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
    const isPending = req.status === "pending";
    const c = STATUS_CFG[req.status];
    const initials = getInitials(req.requester.display_name);

    const handle = async (action: "approve" | "reject") => {
        setBusy(action);
        const result = await reviewProjectRequest({
            requestId: req.id,
            action: action === "approve" ? "approved" : "rejected",
        });
        setBusy(null);
        if (result.ok) {
            action === "approve" ? onApprove(req.id) : onReject(req.id);
        }
    };

    const dateLabel = req.created_at
        ? new Date(req.created_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "—";

    return (
        <div
            className="rounded-md overflow-hidden"
            style={{
                background: "#0d1117",
                border: `1px solid ${isPending ? "rgba(0,229,255,0.14)" : c.bd + "55"}`,
                animationDelay: `${delay}ms`,
            }}
        >
            {/* Accent stripe */}
            <div
                className="h-[2px]"
                style={{ background: `linear-gradient(90deg,transparent,${c.fg}90,transparent)` }}
            />

            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-sans font-semibold text-[#f0f4ff] text-[16px] tracking-tight leading-snug">
                            {req.title}
                        </h3>
                        <span className="font-mono text-[10px]" style={{ color: "#4a5568" }}>
                            {req.id.slice(0, 8).toUpperCase()}
                        </span>
                    </div>
                    <div className="shrink-0 mt-0.5">
                        <StatusBadge status={req.status} />
                    </div>
                </div>

                {/* Requester row */}
                <div className="flex items-center gap-2 mb-4">
                    <div
                        className="shrink-0 w-7 h-7 rounded-full grid place-items-center font-mono text-[10px] font-bold text-[#00e5ff]"
                        style={{ background: "rgba(0,229,255,0.10)", border: "1.5px solid rgba(0,229,255,0.38)" }}
                    >
                        {req.requester.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={req.requester.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            initials
                        )}
                    </div>
                    <span className="text-[#8b9ab0] text-[12.5px]">{req.requester.display_name}</span>
                    <span className="flex-1" />
                    <span className="font-mono text-[10.5px] text-[#4a5568] flex items-center gap-1">
                        <Calendar size={10} />
                        {dateLabel}
                    </span>
                </div>

                {/* Description (3-line clamp) */}
                {req.description && (
                    <p
                        className="text-[#8b9ab0] text-[13px] leading-relaxed mb-4 overflow-hidden"
                        style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                        } as React.CSSProperties}
                    >
                        {req.description}
                    </p>
                )}

                {/* Tech stack */}
                {req.tech_stack && req.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {req.tech_stack.map((s, i) => {
                            const sc = STACK_COLORS[i % STACK_COLORS.length];
                            return (
                                <span
                                    key={s}
                                    className="inline-flex items-center h-[20px] px-2 rounded-sm border font-mono text-[9.5px] tracking-[0.08em] text-[#f0f4ff]"
                                    style={{ background: sc.bg, borderColor: sc.bd }}
                                >
                                    {s}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Actions — pending only */}
                {isPending && (
                    <div className="pt-3 border-t" style={{ borderColor: "rgba(0,229,255,0.08)" }}>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handle("approve")}
                                disabled={!!busy}
                                className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] transition-all disabled:opacity-60"
                                style={{
                                    color: "#22c55e",
                                    background: "rgba(34,197,94,0.12)",
                                    borderColor: "rgba(34,197,94,0.45)",
                                }}
                            >
                                {busy === "approve" ? (
                                    <><Loader2 size={14} className="animate-spin" />Approving…</>
                                ) : (
                                    <><CheckCircle2 size={14} />Approve</>
                                )}
                            </button>
                            <button
                                onClick={() => handle("reject")}
                                disabled={!!busy}
                                className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] transition-all disabled:opacity-60"
                                style={{
                                    color: "#ef4444",
                                    background: "rgba(239,68,68,0.10)",
                                    borderColor: "rgba(239,68,68,0.45)",
                                }}
                            >
                                {busy === "reject" ? (
                                    <><Loader2 size={14} className="animate-spin" />Rejecting…</>
                                ) : (
                                    <><XCircle size={14} />Reject</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

type FilterKey = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const FILTER_OPTIONS: { value: FilterKey; label: string; color: string | null }[] = [
    { value: "ALL",      label: "All",      color: null       },
    { value: "PENDING",  label: "Pending",  color: "#f59e0b"  },
    { value: "APPROVED", label: "Approved", color: "#22c55e"  },
    { value: "REJECTED", label: "Rejected", color: "#ef4444"  },
];

export default function AdminProjectRequestsPage() {
    const { isModerator, isFaculty, loading: userLoading } = useUser();
    const supabase = createClient();
    const [requests, setRequests] = useState<ProjectRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>("ALL");

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from("project_requests")
            .select(
                "id, title, description, tech_stack, status, created_at, requester:profiles!project_requests_requester_id_fkey(id, display_name, avatar_url)"
            )
            .order("created_at", { ascending: false });

        if (data) {
            setRequests(
                data.map(r => ({
                    id: r.id,
                    title: r.title,
                    description: r.description,
                    tech_stack: r.tech_stack,
                    status: (r.status ?? "pending") as RequestStatus,
                    created_at: r.created_at,
                    requester: r.requester as unknown as { id: string; display_name: string; avatar_url: string | null },
                }))
            );
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        void fetchRequests();
    }, [fetchRequests]);

    const counts = useMemo(
        () => ({
            ALL:      requests.length,
            PENDING:  requests.filter(r => r.status === "pending").length,
            APPROVED: requests.filter(r => r.status === "approved").length,
            REJECTED: requests.filter(r => r.status === "rejected").length,
        }),
        [requests]
    );

    const visible = useMemo(() => {
        const list =
            filter === "ALL"
                ? requests
                : requests.filter(r => r.status === filter.toLowerCase());
        return [...list].sort(
            (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
        );
    }, [requests, filter]);

    const handleApprove = (id: string) =>
        setRequests(prev => prev.map(r => (r.id !== id ? r : { ...r, status: "approved" as RequestStatus })));

    const handleReject = (id: string) =>
        setRequests(prev => prev.map(r => (r.id !== id ? r : { ...r, status: "rejected" as RequestStatus })));

    if (userLoading) return <VajraLoader fullPage />;

    if (!isModerator && !isFaculty) {
        return (
            <div className="max-w-3xl mx-auto px-8 pt-20 pb-20 text-center">
                <div
                    className="mx-auto w-16 h-16 grid place-items-center rounded-md mb-5"
                    style={{
                        border: "1px solid rgba(245,158,11,0.45)",
                        background: "rgba(245,158,11,0.08)",
                        boxShadow: "0 0 28px -8px rgba(245,158,11,0.50)",
                    }}
                >
                    <ShieldOff size={26} className="text-[#f59e0b]" />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#f59e0b] mb-2">// ERR 403</p>
                <h2 className="font-sans font-extrabold text-[#f0f4ff] text-[22px] tracking-tight mb-2">Access Denied</h2>
                <p className="text-[#8b9ab0] text-[13.5px]">
                    Only faculty and moderators can review project proposals.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative" style={{ background: "#07090f" }}>
        {/* Grid bg */}
        <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* Radial glow */}
        <div className="fixed top-0 right-0 w-[500px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(ellipse,rgba(0,229,255,0.04) 0%,transparent 70%)" }} />

        <div className="relative max-w-3xl mx-auto px-8 pt-10 pb-20">
            {/* Page header */}
            <div className="flex items-center gap-2 mb-2">
                <span className="h-px w-8" style={{ background: "rgba(0,229,255,0.6)" }} />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#00e5ff]">
                    // ADMIN / PROPOSALS
                </span>
            </div>

            <div className="flex items-end justify-between gap-6 mb-8">
                <div>
                    <h1
                        className="font-sans font-black text-[#f0f4ff] tracking-tight"
                        style={{ fontSize: 30 }}
                    >
                        Project Proposals
                    </h1>
                    <p className="text-[#8b9ab0] text-[13.5px] mt-1.5">
                        Review member-submitted project ideas.
                    </p>
                </div>
                {counts.PENDING > 0 && (
                    <span
                        className="inline-flex items-center gap-2 h-8 px-3 rounded-sm border font-mono text-[11px] shrink-0"
                        style={{
                            color: "#f59e0b",
                            background: "rgba(245,158,11,0.10)",
                            borderColor: "rgba(245,158,11,0.45)",
                        }}
                    >
                        <span
                            className="w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{ background: "#f59e0b" }}
                        />
                        {counts.PENDING} PENDING REVIEW
                    </span>
                )}
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 mb-6">
                {FILTER_OPTIONS.map(f => {
                    const active = filter === f.value;
                    const color = f.color ?? "#00e5ff";
                    const count = counts[f.value] ?? 0;
                    return (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className="h-7 px-3 rounded-sm border font-mono text-[10px] uppercase tracking-[0.14em] transition-all inline-flex items-center gap-2"
                            style={
                                active
                                    ? {
                                          color: color,
                                          background: `${color}16`,
                                          borderColor: color,
                                      }
                                    : {
                                          color: "#8b9ab0",
                                          background: "transparent",
                                          borderColor: "rgba(139,154,176,0.22)",
                                      }
                            }
                        >
                            {f.label}
                            <span
                                className="font-mono text-[10px] tabular-nums"
                                style={{ color: active ? color : "#4a5568" }}
                            >
                                {String(count).padStart(2, "0")}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <VajraLoader />
                </div>
            ) : visible.length === 0 ? (
                <div
                    className="text-center py-14 border border-dashed rounded-md"
                    style={{ borderColor: "rgba(0,229,255,0.15)", background: "rgba(0,229,255,0.02)" }}
                >
                    <div
                        className="mx-auto w-12 h-12 grid place-items-center border rounded-md text-[#4a5568] mb-4"
                        style={{ borderColor: "rgba(0,229,255,0.18)", background: "#07090f" }}
                    >
                        <FolderOpen size={20} />
                    </div>
                    <div className="font-sans font-semibold text-[#f0f4ff] text-[15px]">
                        No project proposals
                    </div>
                    <p className="text-[#8b9ab0] text-[13px] mt-1.5">
                        {filter !== "ALL"
                            ? "No proposals with this status."
                            : "Members haven't submitted any proposals yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {visible.map((req, i) => (
                        <ProposalCard
                            key={req.id}
                            req={req}
                            delay={i * 60}
                            onApprove={handleApprove}
                            onReject={handleReject}
                        />
                    ))}
                </div>
            )}
        </div>
        </div>
    );
}
