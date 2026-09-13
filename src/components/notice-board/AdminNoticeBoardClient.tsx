"use client";

import { useState, useCallback } from "react";
import { Pin, Archive, Trash2, Pencil, ArchiveRestore, Radio, Plus, X, PinOff, Clock, ExternalLink, ArrowRight } from "lucide-react";
import type { NoticeRow, NoticeInput } from "@/actions/notice-board";
import type { NoticeCTA } from "@/types/database";
import { createNotice, updateNotice, deleteNotice } from "@/actions/notice-board";
import NoticeForm from "./NoticeForm";

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function isExpiringSoon(iso: string): boolean {
    return new Date(iso).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
}
function isExpired(iso: string): boolean {
    return new Date(iso).getTime() < Date.now();
}

interface AdminNoticeBoardClientProps {
    initialNotices: NoticeRow[];
}

export default function AdminNoticeBoardClient({ initialNotices }: AdminNoticeBoardClientProps) {
    const [notices, setNotices] = useState<NoticeRow[]>(initialNotices);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<NoticeRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const toast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    const openCreate = () => { setEditTarget(null); setDrawerOpen(true); };
    const openEdit = (n: NoticeRow) => { setEditTarget(n); setDrawerOpen(true); };
    const closeDrawer = () => { setDrawerOpen(false); setEditTarget(null); };

    const handleSubmit = useCallback(async (input: NoticeInput) => {
        setIsSubmitting(true);
        try {
            if (editTarget) {
                const res = await updateNotice(editTarget.id, input);
                if (res.ok) {
                    setNotices((prev) => prev.map((n) => n.id === editTarget.id ? res.data : n));
                    toast("Notice updated.");
                } else {
                    toast(`Error: ${res.error}`);
                }
            } else {
                const res = await createNotice(input);
                if (res.ok) {
                    setNotices((prev) => [res.data, ...prev]);
                    toast("Notice broadcast!");
                } else {
                    toast(`Error: ${res.error}`);
                }
            }
        } finally {
            setIsSubmitting(false);
            closeDrawer();
        }
    }, [editTarget]);

    const handleTogglePin = async (n: NoticeRow) => {
        setActionLoading(n.id + "-pin");
        const res = await updateNotice(n.id, { is_pinned: !n.is_pinned });
        if (res.ok) setNotices((prev) => prev.map((x) => x.id === n.id ? res.data : x));
        setActionLoading(null);
    };

    const handleToggleArchive = async (n: NoticeRow) => {
        setActionLoading(n.id + "-archive");
        const res = await updateNotice(n.id, { is_archived: !n.is_archived });
        if (res.ok) setNotices((prev) => prev.map((x) => x.id === n.id ? res.data : x));
        setActionLoading(null);
    };

    const handleDelete = async (id: string) => {
        setActionLoading(id + "-delete");
        const res = await deleteNotice(id);
        if (res.ok) setNotices((prev) => prev.filter((n) => n.id !== id));
        else toast(`Error: ${res.error}`);
        setDeleteConfirm(null);
        setActionLoading(null);
    };

    // Stats
    const live = notices.filter((n) => !n.is_archived && (!n.expires_at || !isExpired(n.expires_at))).length;
    const pinned = notices.filter((n) => n.is_pinned && !n.is_archived).length;
    const expiring = notices.filter((n) => n.expires_at && isExpiringSoon(n.expires_at) && !isExpired(n.expires_at) && !n.is_archived).length;
    const archived = notices.filter((n) => n.is_archived).length;

    const STAT_CONFIGS = [
        { label: "LIVE", value: live, color: "#22c55e" },
        { label: "PINNED", value: pinned, color: "#f59e0b" },
        { label: "EXPIRING SOON", value: expiring, color: "#f59e0b" },
        { label: "ARCHIVED", value: archived, color: "#8b9ab0" },
    ];

    const iconBtn = (label: string, Icon: React.ComponentType<{ size?: number }>, color: string, bg: string, border: string, onClick: () => void, loading?: boolean) => (
        <button
            title={label}
            onClick={onClick}
            disabled={loading}
            className="grid place-items-center w-7 h-7 rounded-sm border transition-all"
            style={{ color, background: bg, borderColor: border, opacity: loading ? 0.5 : 1 }}
            onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 10px -3px ${color}`; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
            <Icon size={12} />
        </button>
    );

    return (
        <div className="relative min-h-screen bg-[#07090f] overflow-hidden">
            {/* Background */}
            <div
                className="absolute inset-0 pointer-events-none animate-grid-pan"
                style={{
                    backgroundImage: "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            <div className="absolute inset-0 pointer-events-none scanline animate-scanline-pan opacity-40" />

            {/* Toast */}
            {toastMsg && (
                <div
                    className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-sm font-mono text-[12px] uppercase tracking-[0.14em]"
                    style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.35)", color: "#00e5ff", boxShadow: "0 0 20px -6px rgba(0,229,255,0.4)" }}
                >
                    {toastMsg}
                </div>
            )}

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-24">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
                    <div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <h1
                                className="font-sans font-black tracking-tight leading-none"
                                style={{ fontSize: "clamp(20px, 4vw, 30px)", color: "#f0f4ff" }}
                            >
                                Notice Board
                            </h1>
                            <span
                                className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 h-5 rounded-sm border grid place-items-center"
                                style={{ color: "#f59e0b", background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)" }}
                            >
                                ADMIN ACCESS
                            </span>
                        </div>
                        <p className="text-[13px] mt-1.5" style={{ color: "#8b9ab0" }}>
                            Manage public announcements for VajraX.
                        </p>
                    </div>

                    <div
                        onClick={openCreate}
                        className="btn-3d-cyan cursor-pointer"
                        style={{ textDecoration: 'none' }}
                    >
                        <div className="btn-top flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] font-bold">
                            <Plus size={14} />
                            <span>New Notice</span>
                        </div>
                        <div className="btn-bottom" />
                        <div className="btn-base" />
                    </div>
                </div>

                {/* Stats strip */}
                <div
                    className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-8 rounded-sm overflow-hidden"
                    style={{ border: "1px solid rgba(0,229,255,0.12)", background: "rgba(0,229,255,0.08)" }}
                >
                    {STAT_CONFIGS.map(({ label, value, color }) => (
                        <div key={label} className="flex items-center gap-3 px-4 sm:px-5 py-4" style={{ background: "#0d1117" }}>
                            <span
                                className="font-mono tabular-nums font-bold text-[20px] sm:text-[22px] leading-none"
                                style={{ color }}
                            >
                                {String(value).padStart(2, "0")}
                            </span>
                            <span className="font-mono text-[9px] uppercase tracking-[0.14em] leading-tight" style={{ color: "#8b9ab0" }}>
                                {label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="rounded-sm overflow-hidden" style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.12)" }}>
                    {/* Desktop header */}
                    <div
                        className="hidden sm:grid gap-4 px-5 py-3 border-b"
                        style={{
                            gridTemplateColumns: "100px 1fr 130px 100px 100px 120px",
                            borderColor: "rgba(0,229,255,0.12)",
                        }}
                    >
                        {["STATUS", "TITLE", "AUTHOR", "POSTED", "EXPIRES", "ACTIONS"].map((h) => (
                            <span key={h} className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "#4a5568" }}>
                                {h}
                            </span>
                        ))}
                    </div>

                    {notices.length === 0 ? (
                        <div className="text-center py-16 px-6">
                            <Radio size={28} style={{ color: "#4a5568", margin: "0 auto 12px" }} />
                            <div className="font-mono text-[12px] uppercase tracking-[0.2em]" style={{ color: "#4a5568" }}>
                                NO NOTICES YET · BROADCAST YOUR FIRST
                            </div>
                        </div>
                    ) : (
                        notices.map((n) => {
                            const expired = n.expires_at && isExpired(n.expires_at);
                            const expiringSoon = n.expires_at && !expired && isExpiringSoon(n.expires_at);

                            // Status config
                            let statusLabel = "LIVE";
                            let statusColor = "#22c55e";
                            let statusDot = "●";
                            if (n.is_archived) { statusLabel = "ARCHIVED"; statusColor = "#4a5568"; statusDot = "◌"; }
                            else if (expired) { statusLabel = "EXPIRED"; statusColor = "#ef4444"; statusDot = "◉"; }
                            else if (expiringSoon) { statusLabel = "EXPIRING"; statusColor = "#f59e0b"; statusDot = "◉"; }
                            else if (n.is_pinned) { statusLabel = "PINNED"; statusColor = "#f59e0b"; statusDot = "⬡"; }

                            return (
                                <div
                                    key={n.id}
                                    className="border-b last:border-0 transition-colors"
                                    style={{ borderColor: "rgba(0,229,255,0.08)" }}
                                    onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.02)"; }}
                                    onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                >
                                    {/* Desktop row */}
                                    <div
                                        className="hidden sm:grid gap-4 items-center px-5 py-3.5"
                                        style={{ gridTemplateColumns: "100px 1fr 130px 100px 100px 120px" }}
                                    >
                                        {/* Status */}
                                        <span
                                            className="font-mono text-[10.5px] uppercase tracking-[0.1em] inline-flex items-center gap-1.5"
                                            style={{ color: statusColor }}
                                        >
                                            <span style={{ fontFamily: "monospace" }}>{statusDot}</span>
                                            {statusLabel}
                                        </span>

                                        {/* Title */}
                                        <div className="min-w-0">
                                            <div
                                                className="text-[13px] font-medium tracking-tight truncate"
                                                style={{ color: n.is_archived ? "#4a5568" : "#f0f4ff" }}
                                            >
                                                {n.title}
                                            </div>
                                            {((n.ctas as NoticeCTA[])?.length > 0
                                                ? (n.ctas as NoticeCTA[])
                                                : n.cta_label ? [{ label: n.cta_label }] : []
                                            ).map((cta, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 font-mono text-[9.5px] mt-0.5 mr-2" style={{ color: "#00e5ff" }}>
                                                    <ExternalLink size={8} />{cta.label.toUpperCase()}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Author */}
                                        <span className="font-mono text-[11px] truncate" style={{ color: "#8b9ab0" }}>
                                            {n.author?.display_name ?? "—"}
                                        </span>

                                        {/* Posted */}
                                        <span className="font-mono text-[11px]" style={{ color: "#8b9ab0" }}>
                                            {fmtDate(n.created_at)}
                                        </span>

                                        {/* Expires */}
                                        <span
                                            className="font-mono text-[11px] inline-flex items-center gap-1"
                                            style={{ color: expired ? "#ef4444" : expiringSoon ? "#f59e0b" : "#4a5568" }}
                                        >
                                            {n.expires_at ? <><Clock size={9} />{fmtDate(n.expires_at)}</> : "—"}
                                        </span>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5">
                                            {iconBtn("Edit", Pencil, "#00e5ff", "rgba(0,229,255,0.06)", "rgba(0,229,255,0.22)", () => openEdit(n))}
                                            {iconBtn(
                                                n.is_pinned ? "Unpin" : "Pin",
                                                n.is_pinned ? PinOff : Pin,
                                                "#f59e0b", "rgba(245,158,11,0.06)", "rgba(245,158,11,0.22)",
                                                () => handleTogglePin(n),
                                                actionLoading === n.id + "-pin"
                                            )}
                                            {iconBtn(
                                                n.is_archived ? "Restore" : "Archive",
                                                n.is_archived ? ArchiveRestore : Archive,
                                                "#8b9ab0", "rgba(139,154,176,0.06)", "rgba(139,154,176,0.22)",
                                                () => handleToggleArchive(n),
                                                actionLoading === n.id + "-archive"
                                            )}
                                            {deleteConfirm === n.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleDelete(n.id)}
                                                        className="font-mono text-[9.5px] h-7 px-2 rounded-sm border"
                                                        style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)" }}
                                                    >
                                                        CONFIRM
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className="grid place-items-center w-7 h-7 rounded-sm border"
                                                        style={{ color: "#4a5568", borderColor: "rgba(74,85,104,0.3)", background: "transparent" }}
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ) : (
                                                iconBtn("Delete", Trash2, "#ef4444", "rgba(239,68,68,0.06)", "rgba(239,68,68,0.22)", () => setDeleteConfirm(n.id))
                                            )}
                                        </div>
                                    </div>

                                    {/* Mobile card */}
                                    <div className="sm:hidden px-4 py-4">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <span
                                                className="font-mono text-[10px] uppercase tracking-[0.1em]"
                                                style={{ color: statusColor }}
                                            >
                                                {statusDot} {statusLabel}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                {iconBtn("Edit", Pencil, "#00e5ff", "rgba(0,229,255,0.06)", "rgba(0,229,255,0.22)", () => openEdit(n))}
                                                {iconBtn(n.is_pinned ? "Unpin" : "Pin", n.is_pinned ? PinOff : Pin, "#f59e0b", "rgba(245,158,11,0.06)", "rgba(245,158,11,0.22)", () => handleTogglePin(n), actionLoading === n.id + "-pin")}
                                                {iconBtn(n.is_archived ? "Restore" : "Archive", n.is_archived ? ArchiveRestore : Archive, "#8b9ab0", "rgba(139,154,176,0.06)", "rgba(139,154,176,0.22)", () => handleToggleArchive(n), actionLoading === n.id + "-archive")}
                                                {deleteConfirm === n.id ? (
                                                    <>
                                                        <button onClick={() => handleDelete(n.id)} className="font-mono text-[9px] h-7 px-2 rounded-sm border" style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)" }}>DEL</button>
                                                        <button onClick={() => setDeleteConfirm(null)} className="grid place-items-center w-7 h-7 rounded-sm border" style={{ color: "#4a5568", borderColor: "rgba(74,85,104,0.3)" }}><X size={10} /></button>
                                                    </>
                                                ) : (
                                                    iconBtn("Delete", Trash2, "#ef4444", "rgba(239,68,68,0.06)", "rgba(239,68,68,0.22)", () => setDeleteConfirm(n.id))
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-[13.5px] font-medium" style={{ color: n.is_archived ? "#4a5568" : "#f0f4ff" }}>{n.title}</div>
                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            <span className="font-mono text-[10px]" style={{ color: "#4a5568" }}>{n.author?.display_name ?? "—"}</span>
                                            <span className="font-mono text-[10px]" style={{ color: "#4a5568" }}>{fmtDate(n.created_at)}</span>
                                            {n.expires_at && (
                                                <span className="font-mono text-[10px] inline-flex items-center gap-1" style={{ color: expired ? "#ef4444" : expiringSoon ? "#f59e0b" : "#4a5568" }}>
                                                    <Clock size={9} />{fmtDate(n.expires_at)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Drawer ── */}
            {drawerOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        style={{ background: "rgba(7,9,15,0.8)", backdropFilter: "blur(4px)" }}
                        onClick={closeDrawer}
                    />

                    {/* Drawer panel */}
                    <div
                        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto"
                        style={{
                            background: "#0d1117",
                            borderLeft: "1px solid rgba(0,229,255,0.2)",
                            boxShadow: "-16px 0 60px rgba(0,0,0,0.6)",
                        }}
                    >
                        {/* Drawer header */}
                        <div
                            className="flex items-center justify-between px-5 sm:px-7 py-5 border-b sticky top-0 z-10"
                            style={{ borderColor: "rgba(0,229,255,0.15)", background: "#0d1117" }}
                        >
                            <div>
                                <div className="font-sans font-bold text-[16px]" style={{ color: "#f0f4ff" }}>
                                    {editTarget ? "Edit Announcement" : "Broadcast Announcement"}
                                </div>
                            </div>
                            <button
                                onClick={closeDrawer}
                                className="grid place-items-center w-8 h-8 rounded-sm border transition-colors"
                                style={{ color: "#8b9ab0", borderColor: "rgba(139,154,176,0.28)", background: "transparent" }}
                                onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "#f0f4ff"; }}
                                onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "#8b9ab0"; }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Top accent stripe */}
                        <div
                            className="h-px w-full"
                            style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.6),transparent)" }}
                        />

                        <div className="px-5 sm:px-7 py-6">
                            <NoticeForm
                                initial={editTarget}
                                onSubmit={handleSubmit}
                                onCancel={closeDrawer}
                                isSubmitting={isSubmitting}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
