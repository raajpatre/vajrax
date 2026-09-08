"use client";

import { useMemo, useState, useId, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Code2, Wrench, Users, Trophy, CalendarRange,
  Calendar, Clock, MapPin, ExternalLink, Lock,
  Pencil, Trash2, Plus, ArrowRight, ChevronRight,
  UserCheck, FileText,
} from "lucide-react";
import { Tables } from "@/types/database";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EventModal from "./EventModal";

type Event = Tables<"events">;

// ─── Event type config ────────────────────────────────────────────────────────

const EVENT_TYPES: Record<string, { Icon: LucideIcon; label: string; fg: string; bg: string; bd: string }> = {
  hackathon:   { Icon: Code2,         label: "HACKATHON",   fg: "#f59e0b", bg: "rgba(245,158,11,0.10)",  bd: "rgba(245,158,11,0.45)"  },
  workshop:    { Icon: Wrench,        label: "WORKSHOP",    fg: "#00e5ff", bg: "rgba(0,229,255,0.10)",   bd: "rgba(0,229,255,0.45)"   },
  meetup:      { Icon: Users,         label: "MEETUP",      fg: "#22c55e", bg: "rgba(34,197,94,0.10)",   bd: "rgba(34,197,94,0.45)"   },
  competition: { Icon: Trophy,        label: "COMPETITION", fg: "#5eead4", bg: "rgba(94,234,212,0.10)",  bd: "rgba(94,234,212,0.45)"  },
  other:       { Icon: CalendarRange, label: "EVENT",       fg: "#38bdf8", bg: "rgba(56,189,248,0.10)",  bd: "rgba(56,189,248,0.45)"  },
};

function tc(type: string) { return EVENT_TYPES[type] ?? EVENT_TYPES.other; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eventHue(id: string, type: string): number {
  const base: Record<string, number> = { hackathon: 28, workshop: 192, meetup: 140, competition: 168, other: 210 };
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return (base[type] ?? 200) + (h % 30) - 15;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ─── EventCover SVG ───────────────────────────────────────────────────────────

function EventCover({ hue = 190, type = "workshop", kicker = "// EVENT", title = "" }: {
  hue?: number; type?: string; kicker?: string; title?: string;
}) {
  const uid  = useId().replace(/:/g, "");
  const c1   = `hsl(${hue} 65% 14%)`;
  const c2   = `hsl(${(hue + 30) % 360} 75% 8%)`;
  const tint = `hsl(${hue} 90% 60%)`;
  const t    = tc(type);
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="w-full h-full block">
      <defs>
        <linearGradient id={`ec-g-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <pattern id={`ec-s-${uid}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="14" stroke={tint} strokeWidth="1.1" opacity="0.10" />
        </pattern>
        <radialGradient id={`ec-r-${uid}`} cx="0.3" cy="0.25" r="0.75">
          <stop offset="0%"   stopColor={tint} stopOpacity="0.32" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#ec-g-${uid})`} />
      <rect width="400" height="260" fill={`url(#ec-s-${uid})`} />
      <rect width="400" height="260" fill={`url(#ec-r-${uid})`} />
      <g stroke={tint} fill="none" strokeWidth="1" opacity="0.30">
        <path d="M0 60 L80 60 L92 72 L180 72" />
        <path d="M260 200 L320 200 L332 212 L400 212" />
        <circle cx="80"  cy="60"  r="2.5" fill={tint} />
        <circle cx="332" cy="212" r="2.5" fill={tint} />
      </g>
      <path d="M0 0 H18 M0 0 V18"            stroke={tint} strokeWidth="1.6" opacity="0.85" />
      <path d="M400 0 H382 M400 0 V18"        stroke={tint} strokeWidth="1.6" opacity="0.6"  />
      <path d="M0 260 H18 M0 260 V242"        stroke={tint} strokeWidth="1.6" opacity="0.6"  />
      <path d="M400 260 H382 M400 260 V242"   stroke={tint} strokeWidth="1.6" opacity="0.85" />
      <g fontFamily="'JetBrains Mono', monospace">
        <text x="50%" y="44%" textAnchor="middle" fontSize="10" letterSpacing="3" fill={t.fg} opacity="0.95">
          {kicker.toUpperCase()}
        </text>
        <text x="50%" y="54%" textAnchor="middle" fontSize="11" fill="#f0f4ff" opacity="0.55">
          {title}
        </text>
      </g>
    </svg>
  );
}

// ─── Flip card ────────────────────────────────────────────────────────────────

function EventFlipCard({
  event, canEdit, isAuthenticated, onEdit, onDelete,
}: {
  event: Event;
  canEdit: boolean;
  isAuthenticated: boolean;
  onEdit: (e: Event) => void;
  onDelete: (e: Event) => void;
}) {
  const [flipped,   setFlipped]   = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const t   = tc(event.event_type);
  const hue = eventHue(event.id, event.event_type);
  const supabase = useMemo(() => createClient(), []);

  const coverUrl = useMemo((): string | null => {
    const raw = event.cover_image_url;
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const norm = raw.replace(/^\/+/, "").replace(/^event-images\//, "");
    return supabase.storage.from("event-images").getPublicUrl(norm).data.publicUrl;
  }, [event.cover_image_url, supabase]);

  const showImg  = !!coverUrl && !imgFailed;
  const startFmt = fmtDate(event.starts_at);
  const endFmt   = fmtDate(event.ends_at);
  const kicker   = `// ${t.label}`;

  const mode = event.registration_mode ?? "none";
  const isOpen = event.registration_open && mode !== "none" && mode !== "external";
  const hasExternalUrl = mode === "external" && event.external_registration_url;
  const isNoneMode = mode === "none";
  const isExclusive = event.is_exclusive && !isAuthenticated;

  const isPast = new Date(event.starts_at) < new Date();

  const regState: "rsvp" | "external" | "open_to_all" | "exclusive" | "closed" =
    isPast           ? "closed"
    : isExclusive    ? "exclusive"
    : isOpen         ? "rsvp"
    : hasExternalUrl ? "external"
    : "open_to_all";

  return (
    <div
      className="relative"
      style={{ perspective: "1000px", maxWidth: 290 }}
      onMouseEnter={isPast ? undefined : () => setFlipped(true)}
      onMouseLeave={isPast ? undefined : () => setFlipped(false)}
    >
      <div
        onClick={() => setFlipped((f) => !f)}
        className="relative w-full cursor-pointer"
        style={{
          aspectRatio: "290 / 380",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 600ms cubic-bezier(.5,.05,.2,1)",
        }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-md overflow-hidden border"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderColor: "rgba(0,229,255,0.18)",
            background: "#0d1117",
          } as React.CSSProperties}
        >
          <div className="absolute inset-0">
            {showImg ? (
              <img
                src={coverUrl!}
                alt={event.title}
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <EventCover hue={hue} type={event.event_type} kicker={kicker} title={event.title} />
            )}
          </div>

          {/* type chip */}
          <span
            className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 h-[22px] px-2 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: t.fg, background: "rgba(7,9,15,0.85)", border: `1px solid ${t.bd}`, backdropFilter: "blur(4px)" }}
          >
            <t.Icon size={10} />
            {t.label}
          </span>

          {/* RSVP badge on front if registration is open */}
          {isOpen && !isPast && (
            <span
              className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 h-[22px] px-2 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "#07090f", background: "#00e5ff", backdropFilter: "blur(4px)" }}
            >
              <UserCheck size={10} />RSVP Open
            </span>
          )}

          {/* corner ticks */}
          <span className="absolute top-0 left-0    w-2.5 h-2.5 border-t border-l z-10" style={{ borderColor: "rgba(0,229,255,0.55)" }} />
          <span className="absolute top-0 right-0   w-2.5 h-2.5 border-t border-r z-10" style={{ borderColor: "rgba(0,229,255,0.55)" }} />
          <span className="absolute bottom-0 left-0  w-2.5 h-2.5 border-b border-l z-10" style={{ borderColor: "rgba(0,229,255,0.55)" }} />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r z-10" style={{ borderColor: "rgba(0,229,255,0.55)" }} />
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-md border overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "#0d1117",
            borderColor: "rgba(0,229,255,0.30)",
            boxShadow: "0 0 0 1px rgba(0,229,255,0.08), 0 12px 28px -14px rgba(0,0,0,0.7)",
          } as React.CSSProperties}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: "linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.04) 1px,transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {canEdit && (
            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
              <Link
                href={`/admin/events/${event.id}/registrations`}
                onClick={(ev) => ev.stopPropagation()}
                aria-label="view registrations"
                className="grid place-items-center w-7 h-7 rounded-sm border bg-[#07090f]/80 text-[#8b9ab0] hover:bg-[rgba(0,229,255,0.15)] hover:text-[#00e5ff] transition-colors"
                style={{ borderColor: "rgba(0,229,255,0.30)" }}
                title="View Registrations"
              >
                <Users size={12} />
              </Link>
              <button
                onClick={(ev) => { ev.stopPropagation(); onEdit(event); }}
                aria-label="edit"
                className="grid place-items-center w-7 h-7 rounded-sm border bg-[#07090f]/80 text-[#00e5ff] hover:bg-[#00e5ff]/15 transition-colors"
                style={{ borderColor: "rgba(0,229,255,0.55)" }}
                title="Edit Event"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={(ev) => { ev.stopPropagation(); onDelete(event); }}
                aria-label="delete"
                className="grid place-items-center w-7 h-7 rounded-sm border bg-[#07090f]/80 text-[#ef4444] hover:bg-[#ef4444]/15 transition-colors"
                style={{ borderColor: "rgba(239,68,68,0.55)" }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}

          <div className="relative h-full flex flex-col p-4">
            <span
              className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] self-start"
              style={{ color: t.fg, background: t.bg, border: `1px solid ${t.bd}` }}
            >
              <t.Icon size={11} />
              {t.label}
            </span>

            <h3 className="font-sans font-bold text-[#f0f4ff] text-[16.5px] tracking-tight leading-snug mt-3 line-clamp-2">
              {event.title}
            </h3>

            <p className="text-[#8b9ab0] text-[12.5px] mt-2 leading-relaxed line-clamp-3">
              {event.description}
            </p>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b9ab0] tracking-[0.06em]">
                <Calendar size={12} className="text-[#00e5ff]/80 shrink-0" />
                <span className="tabular-nums">
                  {startFmt}{endFmt && endFmt !== startFmt ? ` → ${endFmt}` : ""}
                </span>
              </div>
              {event.starts_at && (
                <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b9ab0] tracking-[0.06em]">
                  <Clock size={12} className="text-[#00e5ff]/80 shrink-0" />
                  <span className="tabular-nums">
                    {fmtTime(event.starts_at)}{event.ends_at ? ` – ${fmtTime(event.ends_at)}` : ""}
                  </span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b9ab0] tracking-[0.06em]">
                  <MapPin size={12} className="text-[#00e5ff]/80 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>

            <div className="flex-1" />

            <div className="mt-3 space-y-2" onClick={(ev) => ev.stopPropagation()}>
              {regState === "rsvp" && (
                <Link
                  href={`/events/${event.id}`}
                  className="w-full h-9 flex items-center justify-center gap-2 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00e5ff]/90 transition-colors"
                >
                  <UserCheck size={11} /> Register / RSVP
                </Link>
              )}
              {regState === "external" && (
                <a
                  href={event.external_registration_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-9 flex items-center justify-center gap-2 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00e5ff]/90 transition-colors"
                >
                  Register <ExternalLink size={11} />
                </a>
              )}
              {(regState === "open_to_all" || isNoneMode) && !isPast && (
                <div className="h-9 px-3 grid place-items-center rounded-sm border border-[rgba(34,197,94,0.3)] bg-[#22c55e]/[0.06] font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#22c55e]">
                  Open to all
                </div>
              )}
              {regState === "closed" && (
                <div className="h-9 px-3 grid place-items-center rounded-sm border border-[rgba(239,68,68,0.3)] bg-[#ef4444]/[0.06] font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#ef4444]">
                  Closed
                </div>
              )}
              {regState === "exclusive" && (
                <div
                  className="h-9 px-3 flex items-center gap-2 rounded-sm border bg-[#f59e0b]/[0.06]"
                  style={{ borderColor: "rgba(245,158,11,0.50)" }}
                >
                  <Lock size={11} className="text-[#f59e0b] shrink-0" />
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#f59e0b] flex-1 truncate">
                    Club exclusive — log in
                  </span>
                  <ArrowRight size={11} className="text-[#f59e0b]" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Past event row ───────────────────────────────────────────────────────────

function PastEventRow({ event }: { event: Event }) {
  const t = tc(event.event_type);
  const hasReport = !!event.report_summary;
  return (
    <Link
      href={hasReport ? `/events/${event.id}/report` : `/events/${event.id}`}
      className="group w-full flex items-center gap-3 h-14 px-3 rounded-sm border border-[rgba(0,229,255,0.12)] bg-[#0d1117]/60 transition-all"
      style={{ opacity: 0.75 }}
      onMouseEnter={(ev) => { (ev.currentTarget as HTMLAnchorElement).style.opacity = "1"; (ev.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,229,255,0.45)"; }}
      onMouseLeave={(ev) => { (ev.currentTarget as HTMLAnchorElement).style.opacity = "0.75"; (ev.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,229,255,0.12)"; }}
    >
      <span
        className="grid place-items-center w-9 h-9 rounded-sm shrink-0"
        style={{ color: t.fg, background: t.bg, border: `1px solid ${t.bd}`, filter: "saturate(0.6)" }}
      >
        <t.Icon size={14} />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <div className="font-sans font-semibold text-[#f0f4ff] text-[13.5px] tracking-tight truncate">{event.title}</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4a5568] mt-0.5">{t.label}</div>
      </div>
      <div className="font-mono text-[11px] text-[#8b9ab0] tabular-nums tracking-[0.06em] shrink-0">{fmtDate(event.starts_at)}</div>
      {hasReport && (
        <span className="shrink-0 inline-flex items-center gap-1 h-[18px] px-2 rounded-sm font-mono text-[8.5px] uppercase tracking-[0.12em]" style={{ color: "#00e5ff", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)" }}>
          <FileText size={8} />Report
        </span>
      )}
      <ChevronRight size={13} className="text-[#4a5568] group-hover:text-[#00e5ff] transition-colors shrink-0" />
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EventsEmpty({ canEdit, onAdd }: { canEdit: boolean; onAdd: () => void }) {
  return (
    <div className="relative border border-dashed border-[rgba(0,229,255,0.18)] rounded-md bg-[#0d1117]/40 overflow-hidden">
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00e5ff]/60" />
      <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00e5ff]/60" />
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.04) 1px,transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative text-center py-16 px-6">
        <div className="mx-auto w-14 h-14 grid place-items-center border border-[rgba(0,229,255,0.18)] rounded-md text-[#4a5568] mb-4 bg-[#07090f]">
          <CalendarRange size={22} />
        </div>
        <h3 className="text-[#f0f4ff] font-bold text-[18px] tracking-tight">No events yet</h3>
        <p className="text-[#8b9ab0] text-[13px] mt-1.5 max-w-[42ch] mx-auto leading-relaxed">
          {canEdit ? "Drop in the first event to wake it up." : "Check back after the sprint review."}
        </p>
        {canEdit && (
          <div className="mt-5">
            <button
              onClick={onAdd}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00e5ff]/90 transition-colors"
            >
              <Plus size={13} />
              Add event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CircuitTrace ─────────────────────────────────────────────────────────────
type CircuitTraceProps = {
  which?: number;
  className?: string;
  style?: React.CSSProperties;
};

function CircuitTrace({ which = 0, className = "", style }: CircuitTraceProps) {
  const paths = [
    {
      viewBox: "0 0 600 400",
      d: [
        "M 0 200 L 120 200 L 140 220 L 280 220 L 300 240 L 600 240",
        "M 80 200 L 80 60  M 240 220 L 240 100",
        "M 380 240 L 380 360",
      ],
      nodes: [
        [120, 200], [280, 220], [80, 60], [240, 100], [380, 360],
      ] as [number, number][],
    },
    {
      viewBox: "0 0 500 400",
      d: [
        "M 500 80 L 380 80 L 360 100 L 220 100 L 200 120 L 80 120 L 0 120",
        "M 360 100 L 360 240",
        "M 200 120 L 200 300 L 0 300",
        "M 100 120 L 100 60",
      ],
      nodes: [
        [380, 80], [220, 100], [80, 120], [360, 240], [200, 300], [100, 60],
      ] as [number, number][],
    },
    {
      viewBox: "0 0 400 300",
      d: [
        "M 0 50 L 80 50 L 90 60 L 200 60 L 210 70 L 320 70 L 330 80 L 400 80",
        "M 0 200 L 120 200 L 130 210 L 280 210 L 290 220 L 400 220",
        "M 200 60 L 200 200 M 290 220 L 290 80",
      ],
      nodes: [
        [80, 50], [200, 60], [320, 70], [120, 200], [280, 210],
      ] as [number, number][],
    },
  ];

  const p = paths[which % paths.length];
  return (
    <svg
      className={className}
      style={style}
      viewBox={p.viewBox}
      preserveAspectRatio="none"
      fill="none"
      stroke="#00e5ff"
      strokeWidth="1.2"
    >
      {p.d.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {p.nodes.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.5" fill="#00e5ff" />
      ))}
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EventsClient({ events }: { events: Event[] }) {
  const { isFaculty, isModerator, isAuthenticated } = useUser();
  const router = useRouter();
  const canEdit = isFaculty || isModerator;

  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [editingEvent,  setEditingEvent]  = useState<Event | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [t, setT] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = () => {
        setT((performance.now() - start) / 1000);
        raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const drift = (k: number): string =>
      `translate(${Math.sin(t * 0.08 + k) * 6}px, ${Math.cos(t * 0.07 + k * 1.3) * 4}px)`;

  const now      = new Date();
  const upcoming = events.filter((e) => new Date(e.starts_at) >= now);
  const past     = events.filter((e) => new Date(e.starts_at) <  now);

  const openNew  = () => { setEditingEvent(null); setIsModalOpen(true); };
  const openEdit = (e: Event) => { setEditingEvent(e); setIsModalOpen(true); };

  const handleDelete = async (event: Event) => {
    if (deletingId) return;
    if (!window.confirm("Delete this event?")) return;
    setDeletingId(event.id);
    const supabase = createClient();
    try {
      if (event.cover_image_url) {
        const parts    = event.cover_image_url.split("/event-images/");
        const filename = parts.length > 1 ? parts[1] : null;
        if (filename) supabase.storage.from("event-images").remove([filename]).catch(console.error);
      }
      const { error } = await supabase.from("events").delete().eq("id", event.id);
      if (error) throw error;
      router.refresh();
    } catch {
      alert("Failed to delete event. Check SQL delete policies.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden pb-24 pt-[calc(var(--nav-height)+2.5rem)] bg-[#07090f]">
      {/* 40 px grid overlay, masked radially so edges fade out */}
      <div
        className="absolute inset-0 pointer-events-none animate-grid-pan"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 90%)",
        }}
      />
      
      {/* Radial cyan glows — bottom-left large, top-right smaller */}
      <div
        className="absolute -bottom-32 -left-32 w-[640px] h-[640px] pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, rgba(0,229,255,0.13) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -top-40 -right-40 w-[560px] h-[560px] pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none scanline animate-scanline-pan opacity-50 z-0" />
      
      {/* Circuit-trace SVG decorations — 3 shapes, slow sine/cosine drift */}
      <div
        className="absolute top-[6%] right-[-4%] w-[42vw] h-[40vh] pointer-events-none z-0"
        style={{ opacity: 0.06, transform: drift(0) }}
      >
        <CircuitTrace which={0} className="w-full h-full" />
      </div>
      <div
        className="absolute bottom-[12%] left-[-4%] w-[36vw] h-[44vh] pointer-events-none z-0"
        style={{ opacity: 0.06, transform: drift(2) }}
      >
        <CircuitTrace which={1} className="w-full h-full" />
      </div>
      <div
        className="absolute top-[44%] right-[10%] w-[26vw] h-[28vh] pointer-events-none z-0"
        style={{ opacity: 0.05, transform: drift(4) }}
      >
        <CircuitTrace which={2} className="w-full h-full" />
      </div>

      <div className="relative z-10 max-w-[1480px] mx-auto w-full px-6 lg:px-12">

        {/* Header */}
        <div className="flex items-end justify-between gap-6 mb-10 flex-wrap">
          <div>
            <h1 className="font-sans font-extrabold tracking-tight text-[#f0f4ff] text-[44px] leading-none">Events</h1>
            <p className="text-[#8b9ab0] text-[14px] mt-3 max-w-[68ch] leading-relaxed">
              Workshops, scrimmages, hackathons, meetups. Hover any card to flip and see the details.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00e5ff]/90 transition-colors"
            >
              <Plus size={13} />
              Add Event
            </button>
          )}
        </div>

        {/* UPCOMING */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="w-[9px] h-[9px] rounded-full bg-[#22c55e] animate-pulse"
              style={{ boxShadow: "0 0 6px #22c55e" }}
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#00e5ff]">UPCOMING</span>
          </div>

          {upcoming.length === 0 ? (
            <EventsEmpty canEdit={canEdit} onAdd={openNew} />
          ) : (
            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 290px))" }}
            >
              {upcoming.map((event) => (
                <EventFlipCard
                  key={event.id}
                  event={event}
                  canEdit={canEdit}
                  isAuthenticated={isAuthenticated}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>

        {/* PAST */}
        {past.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-2 h-2 rounded-sm border border-[rgba(0,229,255,0.18)]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#8b9ab0]">PAST EVENTS</span>
            </div>
            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 290px))" }}
            >
              {past.map((event) => (
                <div key={event.id} className="opacity-60 saturate-0 hover:saturate-100 hover:opacity-100 transition-all duration-300 cursor-pointer">
                  <EventFlipCard
                    event={event}
                    canEdit={canEdit}
                    isAuthenticated={isAuthenticated}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      <EventModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
        onSuccess={() => router.refresh()}
        event={editingEvent}
      />
    </div>
  );
}
