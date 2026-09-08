"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Play, ExternalLink, Users, Award } from "lucide-react";
import { Tables } from "@/types/database";
import type { ReportMedia, ReportGuest, ReportSponsor } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

type Event = Tables<"events">;

// ── Helpers ───────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function extractYoutubeId(url: string): string | null {
    try {
        const u = new URL(url);
        let vid = u.searchParams.get("v");
        if (!vid && u.hostname === "youtu.be") vid = u.pathname.slice(1);
        if (!vid) {
            const m = url.match(/embed\/([^?&]+)/);
            if (m) vid = m[1];
        }
        return vid;
    } catch { return null; }
}

const TIER_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
    platinum: { label: "PLATINUM", color: "#e2e8f0", bg: "rgba(226,232,240,0.08)", border: "rgba(226,232,240,0.30)" },
    gold:     { label: "GOLD",     color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.30)"  },
    silver:   { label: "SILVER",   color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.30)" },
    community:{ label: "COMMUNITY",color: "#22c55e", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.30)"  },
};

// ── Photo thumbnail ───────────────────────────────────────────────
function MediaTile({ item, onClick }: { item: ReportMedia; onClick: () => void }) {
    const [imgFailed, setImgFailed] = useState(false);
    const isVideo = item.type === "video";
    return (
        <button
            onClick={onClick}
            className="relative w-full overflow-hidden rounded-sm border group cursor-pointer"
            style={{ borderColor: "rgba(0,229,255,0.12)", aspectRatio: "16/9" }}
        >
            {isVideo && !imgFailed ? (
                <div className="w-full h-full bg-[#07090f] flex items-center justify-center">
                    <div
                        className="w-12 h-12 rounded-full grid place-items-center"
                        style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.35)" }}
                    >
                        <Play size={18} className="text-[#00e5ff] ml-0.5" />
                    </div>
                </div>
            ) : (
                <>
                    {!imgFailed ? (
                        <img
                            src={item.url}
                            alt={item.caption ?? ""}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={() => setImgFailed(true)}
                        />
                    ) : (
                        <div className="w-full h-full bg-[#0d1117] flex items-center justify-center text-[#4a5568] font-mono text-[11px]">
                            Image unavailable
                        </div>
                    )}
                    {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-black/60 grid place-items-center">
                                <Play size={18} className="text-white ml-0.5" />
                            </div>
                        </div>
                    )}
                </>
            )}
            {item.caption && (
                <div className="absolute bottom-0 inset-x-0 px-3 py-2 text-left opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "linear-gradient(transparent, rgba(7,9,15,0.85))" }}>
                    <p className="text-[11px] text-[#f0f4ff] leading-tight">{item.caption}</p>
                </div>
            )}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.35)" }}
            />
        </button>
    );
}

// ── YouTube embed ─────────────────────────────────────────────────
function YoutubeEmbed({ url }: { url: string }) {
    const vid = extractYoutubeId(url);
    if (!vid) return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#00e5ff] text-[13px] hover:underline">
            <ExternalLink size={13} /> Watch Video
        </a>
    );
    return (
        <div className="relative w-full overflow-hidden rounded-sm border" style={{ aspectRatio: "16/9", borderColor: "rgba(0,229,255,0.15)" }}>
            <iframe
                src={`https://www.youtube.com/embed/${vid}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                title="Event video"
            />
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────
export default function EventReportClient({ event }: { event: Event }) {
    const supabase = useMemo(() => createClient(), []);
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
    const [imgFailed, setImgFailed] = useState(false);

    const coverUrl = useMemo((): string | null => {
        const raw = event.cover_image_url;
        if (!raw) return null;
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        const norm = raw.replace(/^\/+/, "").replace(/^event-images\//, "");
        return supabase.storage.from("event-images").getPublicUrl(norm).data.publicUrl;
    }, [event.cover_image_url, supabase]);
    const showCover = !!coverUrl && !imgFailed;

    const reportMedia = (event.report_media ?? []) as ReportMedia[];
    const reportYoutubeUrls = (event.report_youtube_urls ?? []) as string[];
    const reportGuests = (event.report_guests ?? []) as ReportGuest[];
    const reportSponsors = (event.report_sponsors ?? []) as ReportSponsor[];
    const hasReport = !!event.report_summary;

    return (
        <div className="relative min-h-screen bg-[#07090f] pb-24">
            {/* Grid bg */}
            <div
                className="fixed inset-0 pointer-events-none animate-grid-pan"
                style={{
                    backgroundImage: "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            <div className="fixed inset-0 pointer-events-none scanline animate-scanline-pan opacity-40" />

            {/* Hero banner */}
            <div className="relative overflow-hidden" style={{ minHeight: 340 }}>
                {showCover && (
                    <>
                        <img
                            src={coverUrl!}
                            alt={event.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={() => setImgFailed(true)}
                            style={{ filter: "saturate(0.35) brightness(0.35)" }}
                        />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(7,9,15,0.3) 0%, rgba(7,9,15,0.9) 70%, #07090f 100%)" }} />
                    </>
                )}
                {!showCover && (
                    <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #07090f 0%, #0d1117 100%)" }} />
                )}

                <div className="relative z-10 max-w-[1100px] mx-auto px-6 sm:px-10 pt-[calc(var(--nav-height)+3rem)] pb-16">
                    <Link
                        href="/events"
                        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4a5568] hover:text-[#00e5ff] transition-colors mb-8"
                    >
                        <ArrowLeft size={12} />
                        All Events
                    </Link>

                    <div className="flex items-center gap-2 mb-3">
                        <span className="h-px w-8" style={{ background: "rgba(0,229,255,0.6)" }} />
                        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#00e5ff]">// EVENT REPORT</span>
                    </div>

                    <h1 className="font-sans font-extrabold text-[#f0f4ff] text-[38px] sm:text-[52px] tracking-tight leading-tight mb-4">
                        {event.title}
                    </h1>

                    <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2 font-mono text-[12px] text-[#8b9ab0]">
                            <Calendar size={13} className="text-[#00e5ff]/70" />
                            {fmtDate(event.starts_at)}
                        </div>
                        {event.location && (
                            <div className="flex items-center gap-2 font-mono text-[12px] text-[#8b9ab0]">
                                <MapPin size={13} className="text-[#00e5ff]/70" />
                                {event.location}
                            </div>
                        )}
                        <span
                            className="inline-flex items-center h-6 px-3 rounded-sm font-mono text-[9.5px] uppercase tracking-[0.18em]"
                            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
                        >
                            CONCLUDED
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-[1100px] mx-auto px-6 sm:px-10 space-y-16">

                {/* Summary */}
                {hasReport ? (
                    <section>
                        <SectionHeader label="Event Summary" />
                        <div
                            className="rounded-sm border p-6 sm:p-8"
                            style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(13,17,23,0.6)" }}
                        >
                            <p className="text-[#8b9ab0] text-[15px] leading-[1.9] whitespace-pre-line">
                                {event.report_summary}
                            </p>
                        </div>
                    </section>
                ) : (
                    <section>
                        <div
                            className="rounded-sm border border-dashed p-8 text-center"
                            style={{ borderColor: "rgba(0,229,255,0.15)" }}
                        >
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#4a5568] mb-2">// REPORT PENDING</div>
                            <p className="text-[#4a5568] text-[13.5px]">The event report is being prepared. Check back soon.</p>
                        </div>
                    </section>
                )}

                {/* Photo gallery */}
                {reportMedia.length > 0 && (
                    <section>
                        <SectionHeader label="Photos & Highlights" icon={<Award size={14} />} />
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {reportMedia.map((item, i) => (
                                <MediaTile key={i} item={item} onClick={() => setLightboxIdx(i)} />
                            ))}
                        </div>
                    </section>
                )}

                {/* YouTube videos */}
                {reportYoutubeUrls.length > 0 && (
                    <section>
                        <SectionHeader label="Videos" icon={<Play size={14} />} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {reportYoutubeUrls.map((url, i) => (
                                <YoutubeEmbed key={i} url={url} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Guest speakers */}
                {reportGuests.length > 0 && (
                    <section>
                        <SectionHeader label="Guest Speakers" icon={<Users size={14} />} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {reportGuests.map((guest, i) => (
                                <GuestCard key={i} guest={guest} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Sponsors */}
                {reportSponsors.length > 0 && (
                    <section>
                        <SectionHeader label="Event Sponsors" />
                        {(["platinum", "gold", "silver", "community"] as const).map((tier) => {
                            const tierSponsors = reportSponsors.filter((s) => s.tier === tier);
                            if (tierSponsors.length === 0) return null;
                            const ts = TIER_STYLES[tier];
                            return (
                                <div key={tier} className="mb-8">
                                    <div
                                        className="inline-flex items-center h-6 px-3 rounded-sm font-mono text-[9.5px] uppercase tracking-[0.2em] mb-4"
                                        style={{ color: ts.color, background: ts.bg, border: `1px solid ${ts.border}` }}
                                    >
                                        {ts.label}
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        {tierSponsors.map((sponsor, i) => (
                                            <SponsorCard key={i} sponsor={sponsor} ts={ts} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                )}
            </div>

            {/* Lightbox */}
            {lightboxIdx !== null && reportMedia[lightboxIdx] && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightboxIdx(null)}
                >
                    <img
                        src={reportMedia[lightboxIdx].url}
                        alt={reportMedia[lightboxIdx].caption ?? ""}
                        className="max-w-full max-h-[90vh] rounded-sm object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    {reportMedia[lightboxIdx].caption && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[12px] text-[#8b9ab0] bg-black/60 px-4 py-2 rounded-sm">
                            {reportMedia[lightboxIdx].caption}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Section header ────────────────────────────────────────────────
function SectionHeader({ label, icon }: { label: string; icon?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-6" style={{ background: "rgba(0,229,255,0.5)" }} />
            {icon && <span className="text-[#00e5ff]">{icon}</span>}
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#00e5ff]">{label}</span>
            <span className="flex-1 h-px" style={{ background: "rgba(0,229,255,0.1)" }} />
        </div>
    );
}

// ── Guest card ────────────────────────────────────────────────────
function GuestCard({ guest }: { guest: ReportGuest }) {
    const [imgFailed, setImgFailed] = useState(false);
    return (
        <div
            className="rounded-sm border p-5 flex gap-4 items-start"
            style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(13,17,23,0.6)" }}
        >
            <div
                className="w-14 h-14 rounded-sm shrink-0 overflow-hidden border"
                style={{ borderColor: "rgba(0,229,255,0.2)" }}
            >
                {guest.photo_url && !imgFailed ? (
                    <img src={guest.photo_url} alt={guest.name} className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
                ) : (
                    <div className="w-full h-full grid place-items-center bg-[#0d1117] font-mono text-[18px] font-bold text-[#00e5ff]/40">
                        {guest.name.charAt(0)}
                    </div>
                )}
            </div>
            <div className="min-w-0">
                <div className="font-sans font-semibold text-[#f0f4ff] text-[14px] tracking-tight">{guest.name}</div>
                <div className="font-mono text-[10.5px] text-[#00e5ff] mt-0.5 mb-2">{guest.title}</div>
                {guest.description && (
                    <p className="text-[#8b9ab0] text-[12px] leading-relaxed line-clamp-3">{guest.description}</p>
                )}
            </div>
        </div>
    );
}

// ── Sponsor card ──────────────────────────────────────────────────
function SponsorCard({ sponsor, ts }: { sponsor: ReportSponsor; ts: { color: string; bg: string; border: string } }) {
    const [imgFailed, setImgFailed] = useState(false);
    return (
        <a
            href={sponsor.website_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-sm border px-5 py-4 min-w-[160px] transition-all hover:scale-[1.02]"
            style={{ borderColor: ts.border, background: ts.bg }}
        >
            {sponsor.logo_url && !imgFailed ? (
                <img src={sponsor.logo_url} alt={sponsor.name} className="h-10 object-contain" onError={() => setImgFailed(true)} />
            ) : (
                <div className="font-sans font-bold text-[15px]" style={{ color: ts.color }}>{sponsor.name}</div>
            )}
        </a>
    );
}
