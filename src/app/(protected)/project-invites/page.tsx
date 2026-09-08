"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { getMyProjectInvites, respondToProjectInvite } from "@/actions/project-invites";
import VajraLoader from "@/components/ui/VajraLoader";
import {
    Mail,
    Check,
    X,
    CheckCircle2,
    XCircle,
    Loader2,
} from "lucide-react";
import Link from "next/link";

interface Invite {
    id: string;
    status: string;
    created_at: string;
    project: { id: string; title: string; description?: string | null; status: string } | null;
    inviter: { id: string; display_name: string; avatar_url: string | null } | null;
}

/* ── Avatar ───────────────────────────────────────── */
function Avatar({ initials, size = 28 }: { initials: string; size?: number }) {
    return (
        <span
            className="inline-flex items-center justify-center rounded-full font-mono font-semibold uppercase shrink-0"
            style={{
                width: size,
                height: size,
                fontSize: size * 0.36,
                background: "rgba(0,229,255,0.12)",
                border: "1px solid rgba(0,229,255,0.40)",
                color: "#00e5ff",
            }}
        >
            {initials}
        </span>
    );
}

/* ── Pending invite card ──────────────────────────── */
function PendingCard({
    invite,
    onAccept,
    onDecline,
}: {
    invite: Invite;
    onAccept: (id: string) => void;
    onDecline: (id: string) => void;
}) {
    const [hovered, setHovered] = useState(false);
    const [deciding, setDeciding] = useState<"accept" | "decline" | null>(null);

    const handleAccept = () => {
        if (deciding) return;
        setDeciding("accept");
        setTimeout(() => onAccept(invite.id), 520);
    };
    const handleDecline = () => {
        if (deciding) return;
        setDeciding("decline");
        setTimeout(() => onDecline(invite.id), 520);
    };

    const inviterName = invite.inviter?.display_name ?? "A project lead";
    const projectId = invite.project?.id ?? "";
    const projectTitle = invite.project?.title ?? "Untitled project";

    const inviterInitials = inviterName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const dateStr = new Date(invite.created_at)
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .toUpperCase();

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative rounded-md overflow-hidden"
            style={{
                background: "#0d1117",
                border: `1px solid ${hovered ? "rgba(245,158,11,0.45)" : "rgba(245,158,11,0.22)"}`,
                boxShadow: hovered
                    ? "0 0 0 1px rgba(245,158,11,0.08), 0 8px 24px -12px rgba(0,0,0,0.7)"
                    : "none",
                opacity: deciding ? 0.5 : 1,
                transform: deciding ? "scale(0.98)" : "scale(1)",
                transition: "all 200ms ease",
            }}
        >
            {/* Amber top bar */}
            <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{
                    background:
                        "linear-gradient(90deg,transparent,rgba(245,158,11,0.7),transparent)",
                    opacity: hovered ? 1 : 0.5,
                    transition: "opacity 200ms",
                }}
            />

            <div className="px-5 py-4">
                {/* Project title */}
                <Link
                    href={projectId ? `/projects/${projectId}` : "#"}
                    className="inline-block font-sans font-semibold text-[15px] tracking-tight leading-tight mb-2 transition-colors"
                    style={{ color: hovered ? "#00e5ff" : "#f0f4ff" }}
                >
                    {projectTitle}
                </Link>

                {/* Inviter row */}
                <div className="flex items-center gap-2 mb-4">
                    <Avatar initials={inviterInitials} size={28} />
                    <span className="text-[12.5px]" style={{ color: "#8b9ab0" }}>
                        Invited by{" "}
                        <span className="font-medium" style={{ color: "#f0f4ff" }}>
                            {inviterName}
                        </span>
                    </span>
                    <span className="flex-1" />
                    <span
                        className="font-mono text-[10.5px] tabular-nums tracking-[0.08em]"
                        style={{ color: "#4a5568" }}
                    >
                        {dateStr}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAccept}
                        disabled={!!deciding}
                        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-sm border font-mono text-[11px] uppercase tracking-[0.14em] font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
                        style={{
                            color: deciding === "accept" ? "#fff" : "#22c55e",
                            background:
                                deciding === "accept"
                                    ? "rgba(34,197,94,0.35)"
                                    : "rgba(34,197,94,0.10)",
                            borderColor:
                                deciding === "accept"
                                    ? "rgba(34,197,94,0.80)"
                                    : "rgba(34,197,94,0.50)",
                            boxShadow:
                                deciding === "accept"
                                    ? "0 0 14px -2px rgba(34,197,94,0.6)"
                                    : "none",
                        }}
                        onMouseOver={(e) => {
                            if (!deciding)
                                e.currentTarget.style.background = "rgba(34,197,94,0.20)";
                        }}
                        onMouseOut={(e) => {
                            if (!deciding)
                                e.currentTarget.style.background = "rgba(34,197,94,0.10)";
                        }}
                    >
                        {deciding === "accept" ? (
                            <Loader2 size={13} className="animate-spin" />
                        ) : (
                            <Check size={13} />
                        )}
                        Accept
                    </button>

                    <button
                        onClick={handleDecline}
                        disabled={!!deciding}
                        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-sm border font-mono text-[11px] uppercase tracking-[0.14em] font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
                        style={{
                            color: "#ef4444",
                            background:
                                deciding === "decline"
                                    ? "rgba(239,68,68,0.20)"
                                    : "rgba(239,68,68,0.08)",
                            borderColor: "rgba(239,68,68,0.45)",
                        }}
                        onMouseOver={(e) => {
                            if (!deciding)
                                e.currentTarget.style.background = "rgba(239,68,68,0.18)";
                        }}
                        onMouseOut={(e) => {
                            if (!deciding)
                                e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                        }}
                    >
                        <X size={13} />
                        Decline
                    </button>

                    <span className="flex-1" />
                    <span
                        className="font-mono text-[10px] uppercase tracking-[0.18em]"
                        style={{ color: "#4a5568" }}
                    >
                        // AWAITING RESPONSE
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ── Past invite row ──────────────────────────────── */
const PAST_STATUS: Record<
    string,
    { label: string; fg: string; bg: string; bd: string; icon: "CheckCircle2" | "XCircle" }
> = {
    accepted: {
        label: "ACCEPTED",
        fg: "#22c55e",
        bg: "rgba(34,197,94,0.10)",
        bd: "rgba(34,197,94,0.45)",
        icon: "CheckCircle2",
    },
    rejected: {
        label: "DECLINED",
        fg: "#ef4444",
        bg: "rgba(239,68,68,0.10)",
        bd: "rgba(239,68,68,0.45)",
        icon: "XCircle",
    },
};

function PastRow({ invite }: { invite: Invite }) {
    const [hov, setHov] = useState(false);
    const s = PAST_STATUS[invite.status] ?? PAST_STATUS.rejected;
    const StatusIcon = s.icon === "CheckCircle2" ? CheckCircle2 : XCircle;

    const dateStr = new Date(invite.created_at)
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .toUpperCase();

    return (
        <div
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-md border transition-all"
            style={{
                background: hov ? "rgba(0,229,255,0.025)" : "#0d1117",
                borderColor: hov ? "rgba(0,229,255,0.28)" : "rgba(0,229,255,0.12)",
                opacity: invite.status === "rejected" ? 0.7 : 1,
            }}
        >
            <StatusIcon size={14} style={{ color: s.fg, flexShrink: 0 }} />

            <span
                className="flex-1 font-sans text-[13.5px] tracking-tight truncate"
                style={{ color: invite.status === "rejected" ? "#8b9ab0" : "#f0f4ff" }}
            >
                {invite.project?.title ?? "Untitled project"}
            </span>

            <span
                className="inline-flex items-center h-[20px] px-2 rounded-sm border font-mono text-[9.5px] uppercase tracking-[0.12em] shrink-0"
                style={{ color: s.fg, background: s.bg, borderColor: s.bd }}
            >
                {s.label}
            </span>

            <span
                className="font-mono text-[10.5px] tabular-nums tracking-[0.06em] shrink-0 w-28 text-right"
                style={{ color: "#4a5568" }}
            >
                {dateStr}
            </span>
        </div>
    );
}

/* ── Empty state ──────────────────────────────────── */
function InvitesEmpty() {
    return (
        <div
            className="relative border border-dashed rounded-md overflow-hidden text-center py-16 px-6"
            style={{
                borderColor: "rgba(0,229,255,0.18)",
                background: "rgba(13,17,23,0.4)",
            }}
        >
            {/* Grid wash */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.04) 1px,transparent 1px)",
                    backgroundSize: "32px 32px",
                }}
            />
            {/* Corner ticks */}
            <span
                className="absolute top-2 right-2 w-3 h-3 pointer-events-none"
                style={{
                    borderTop: "1px solid rgba(0,229,255,0.35)",
                    borderRight: "1px solid rgba(0,229,255,0.35)",
                }}
            />
            <span
                className="absolute bottom-2 left-2 w-3 h-3 pointer-events-none"
                style={{
                    borderBottom: "1px solid rgba(0,229,255,0.35)",
                    borderLeft: "1px solid rgba(0,229,255,0.35)",
                }}
            />

            <div className="relative">
                <div
                    className="mx-auto w-14 h-14 grid place-items-center border rounded-md mb-4"
                    style={{
                        background: "#07090f",
                        borderColor: "rgba(0,229,255,0.18)",
                        color: "#4a5568",
                    }}
                >
                    <Mail size={22} />
                </div>
                <h3
                    className="font-bold text-[18px] tracking-tight"
                    style={{ color: "#f0f4ff" }}
                >
                    No invites yet
                </h3>
                <p
                    className="text-[13px] mt-1.5 max-w-[40ch] mx-auto leading-relaxed"
                    style={{ color: "#8b9ab0" }}
                >
                    When a project lead invites you to collaborate, it&apos;ll appear here for your
                    review.
                </p>
            </div>
        </div>
    );
}

/* ── Section header ───────────────────────────────── */
function InvSectionHeader({
    title,
    count,
    countColor,
    muted,
}: {
    title: string;
    count: number | null;
    countColor?: string;
    muted?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <h2
                className="font-sans font-bold tracking-tight leading-none"
                style={{ fontSize: 20, color: muted ? "#8b9ab0" : "#f0f4ff" }}
            >
                {title}
            </h2>
            {count != null && count > 0 && (
                <span
                    className="inline-flex items-center h-5 px-2 rounded-sm border font-mono text-[10px] font-semibold tabular-nums"
                    style={{
                        color: countColor ?? "#f59e0b",
                        background: countColor ? `${countColor}18` : "rgba(245,158,11,0.12)",
                        borderColor: countColor ? `${countColor}55` : "rgba(245,158,11,0.50)",
                    }}
                >
                    {String(count).padStart(2, "0")}
                </span>
            )}
        </div>
    );
}

/* ── Page ─────────────────────────────────────────── */
export default function ProjectInvitesPage() {
    const { user, loading: userLoading } = useUser();
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInvites = useCallback(async () => {
        if (!user) return;
        const result = await getMyProjectInvites();
        if (result.ok) {
            setInvites(result.invites);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) fetchInvites();
    }, [user, fetchInvites]);

    const handleAccept = async (inviteId: string) => {
        const invite = invites.find((i) => i.id === inviteId);
        if (!invite || !user) return;

        const result = await respondToProjectInvite({ inviteId, action: "accepted" });
        if (!result.ok) {
            alert("Failed to accept invite: " + result.error);
            return;
        }

        setInvites((prev) =>
            prev.map((inv) => (inv.id === inviteId ? { ...inv, status: "accepted" } : inv))
        );
    };

    const handleDecline = async (inviteId: string) => {
        const result = await respondToProjectInvite({ inviteId, action: "rejected" });
        if (!result.ok) {
            alert("Failed to decline invite: " + result.error);
            return;
        }

        setInvites((prev) =>
            prev.map((inv) => (inv.id === inviteId ? { ...inv, status: "rejected" } : inv))
        );
    };

    if (userLoading || loading) {
        return <VajraLoader fullPage />;
    }

    const pending = invites.filter((inv) => inv.status === "pending");
    const past = invites.filter((inv) => inv.status !== "pending");
    const bothEmpty = pending.length === 0 && past.length === 0;

    return (
        <div
            className="min-h-screen relative"
            style={{ background: "#07090f" }}
        >
            {/* Grid bg */}
            <div
                className="fixed inset-0 pointer-events-none animate-grid-pan"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            {/* Scanlines */}
            <div className="fixed inset-0 pointer-events-none scanline animate-scanline-pan opacity-50" />
            {/* Amber radial decoration */}
            <div
                className="fixed top-0 right-0 w-96 h-96 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(circle,rgba(245,158,11,0.06) 0%,transparent 70%)",
                }}
            />

            <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-20">
                {/* Page header */}
                <div className="mb-10">
                    <div className="flex items-end justify-between gap-4 flex-wrap">
                        <div>
                            <h1
                                className="font-sans font-extrabold tracking-tight leading-none"
                                style={{ fontSize: 36, color: "#f0f4ff" }}
                            >
                                Project Invites
                            </h1>
                            <p className="text-[13.5px] mt-2" style={{ color: "#8b9ab0" }}>
                                Accept invites to join project teams. Accepted projects appear in My
                                Projects.
                            </p>
                        </div>
                        {pending.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-[7px] h-[7px] rounded-full shrink-0 animate-pulse"
                                    style={{
                                        background: "#f59e0b",
                                        boxShadow: "0 0 6px #f59e0b",
                                    }}
                                />
                                <span
                                    className="font-mono text-[11px] uppercase tracking-[0.18em]"
                                    style={{ color: "#f59e0b" }}
                                >
                                    {pending.length} pending
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {bothEmpty ? (
                    <InvitesEmpty />
                ) : (
                    <div className="space-y-10">
                        {/* Pending section */}
                        {pending.length > 0 && (
                            <section>
                                <InvSectionHeader
                                    title="Pending Invites"
                                    count={pending.length}
                                    countColor="#f59e0b"
                                />
                                <div className="space-y-3">
                                    {pending.map((invite) => (
                                        <PendingCard
                                            key={invite.id}
                                            invite={invite}
                                            onAccept={handleAccept}
                                            onDecline={handleDecline}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* All caught up — pending cleared but past exists */}
                        {pending.length === 0 && past.length > 0 && (
                            <section>
                                <InvSectionHeader
                                    title="Pending Invites"
                                    count={0}
                                    countColor="#4a5568"
                                />
                                <div
                                    className="border border-dashed rounded-md py-8 text-center"
                                    style={{
                                        borderColor: "rgba(0,229,255,0.18)",
                                        background: "rgba(13,17,23,0.3)",
                                    }}
                                >
                                    <CheckCircle2
                                        size={20}
                                        className="mx-auto mb-2"
                                        style={{ color: "#22c55e" }}
                                    />
                                    <p
                                        className="font-mono text-[11px] uppercase tracking-[0.18em]"
                                        style={{ color: "#8b9ab0" }}
                                    >
                                        All caught up
                                    </p>
                                    <p className="text-[12.5px] mt-1" style={{ color: "#8b9ab0" }}>
                                        No pending invites.
                                    </p>
                                </div>
                            </section>
                        )}

                        {/* Past section */}
                        {past.length > 0 && (
                            <section>
                                <InvSectionHeader title="Past Invites" count={null} muted />
                                <div className="space-y-2">
                                    {past.map((invite) => (
                                        <PastRow key={invite.id} invite={invite} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
