"use client";

import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, GithubIcon, Linkedin, Users, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ---- Role palette ----
const ROLE_COLOR: Record<string, { fg: string; bg: string; bd: string; label: string }> = {
  faculty:              { fg: "#00e5ff", bg: "rgba(0,229,255,0.10)",  bd: "rgba(0,229,255,0.45)",  label: "FACULTY" },
  president:            { fg: "#f59e0b", bg: "rgba(245,158,11,0.10)", bd: "rgba(245,158,11,0.45)", label: "PRESIDENT" },
  vice_president:       { fg: "#a78bfa", bg: "rgba(167,139,250,0.10)",bd: "rgba(167,139,250,0.45)",label: "VP" },
  project_manager:      { fg: "#ec4899", bg: "rgba(236,72,153,0.10)", bd: "rgba(236,72,153,0.45)", label: "PROJECT MGR" },
  inventory_manager:    { fg: "#22c55e", bg: "rgba(34,197,94,0.10)",  bd: "rgba(34,197,94,0.45)",  label: "INVENTORY MGR" },
  lead_developer:       { fg: "#fbbf24", bg: "rgba(251,191,36,0.10)", bd: "rgba(251,191,36,0.45)", label: "LEAD DEV" },
  printing_head:        { fg: "#f97316", bg: "rgba(249,115,22,0.10)", bd: "rgba(249,115,22,0.45)", label: "PRINTING HEAD" },
  social_media_head:    { fg: "#ef4444", bg: "rgba(239,68,68,0.10)",  bd: "rgba(239,68,68,0.45)",  label: "SOCIAL MEDIA HEAD" },
  social_media_co_head: { fg: "#ef4444", bg: "rgba(239,68,68,0.08)",  bd: "rgba(239,68,68,0.30)",  label: "SOCIAL MEDIA CO-HEAD" },
  sponsorship_head:     { fg: "#10b981", bg: "rgba(16,185,129,0.10)", bd: "rgba(16,185,129,0.45)", label: "SPONSORSHIP HEAD" },
  workshop_head:        { fg: "#6366f1", bg: "rgba(99,102,241,0.10)", bd: "rgba(99,102,241,0.45)", label: "WORKSHOP HEAD" },
  mechanics_head:       { fg: "#8b5cf6", bg: "rgba(139,92,246,0.10)", bd: "rgba(139,92,246,0.45)", label: "MECHANICS HEAD" },
  cad_head:             { fg: "#f97316", bg: "rgba(249,115,22,0.10)", bd: "rgba(249,115,22,0.45)", label: "CAD HEAD" },
  electronics_head:     { fg: "#06b6d4", bg: "rgba(6,182,212,0.10)",  bd: "rgba(6,182,212,0.45)",  label: "ELECTRONICS HEAD" },
  procurement_head:     { fg: "#14b8a6", bg: "rgba(20,184,166,0.10)", bd: "rgba(20,184,166,0.45)", label: "PROCUREMENT HEAD" },
  makerspace_head:      { fg: "#ef4444", bg: "rgba(239,68,68,0.10)",  bd: "rgba(239,68,68,0.45)",  label: "MAKERSPACE HEAD" },
  member:               { fg: "#8b9ab0", bg: "rgba(139,154,176,0.10)",bd: "rgba(139,154,176,0.40)",label: "MEMBER" },
};

// ---- Filter config ----
type FilterKey = "all" | "faculty" | "committee" | "members";

const ROSTER_FILTERS: { key: FilterKey; label: string; test: (p: Profile) => boolean }[] = [
  { key: "all",       label: "All",            test: () => true },
  { key: "faculty",   label: "Faculty",        test: (p) => p.role === "faculty" },
  { key: "committee", label: "Club Committee", test: (p) => ["president","vice_president","inventory_manager","lead_developer","project_manager","printing_head","social_media_head","social_media_co_head","sponsorship_head","workshop_head","mechanics_head","cad_head","electronics_head","procurement_head","makerspace_head"].includes(p.role) },
  { key: "members",   label: "Members",        test: (p) => p.role === "member" },
];

// ---- Tag parsing ----
interface ParsedTag { name: string; color: string; }

function parseTag(raw: string): ParsedTag {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.name && parsed.color) return parsed;
  } catch {}
  return { name: raw, color: "#8b9ab0" };
}

// ---- Avatar hue from profile id ----
function profileHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h % 360;
}

function getInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0] ?? "").join("").toUpperCase();
}

// =============================================
// RosterAvatar
// =============================================
function RosterAvatar({ profile, size = 48 }: { profile: Profile; size?: number }) {
  const hue   = profileHue(profile.id);
  const tint  = `hsl(${hue} 90% 60%)`;
  const c1    = `hsl(${hue} 60% 18%)`;
  const c2    = `hsl(${(hue + 30) % 360} 70% 8%)`;
  const gradId = `av-${profile.id.replace(/-/g, "")}`;

  if (profile.avatar_url) {
    return (
      <span
        className="relative inline-block shrink-0 rounded-full overflow-hidden border"
        style={{ width: size, height: size, borderColor: `${tint}88` }}
      >
        <img
          src={profile.avatar_url}
          alt={profile.display_name}
          className="w-full h-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className="relative inline-grid place-items-center shrink-0 rounded-full overflow-hidden border"
      style={{ width: size, height: size, borderColor: `${tint}88` }}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <rect width="48" height="48" fill={`url(#${gradId})`} />
        <path d="M0 36 L10 36 L14 32 L48 32" stroke={tint} strokeWidth="0.8" opacity="0.35" fill="none" />
        <circle cx="10" cy="36" r="1.2" fill={tint} opacity="0.7" />
      </svg>
      <span
        className="relative font-mono font-semibold tabular-nums"
        style={{
          color: tint,
          fontSize: Math.max(11, Math.round(size * 0.32)),
          letterSpacing: "0.06em",
          textShadow: `0 0 ${size / 4}px ${tint}55`,
        }}
      >
        {getInitials(profile.display_name || "?")}
      </span>
    </span>
  );
}

function RoleChip({ role }: { role: string }) {
  const c = ROLE_COLOR[role] ?? ROLE_COLOR.member;
  return (
    <span
      className="inline-flex items-center h-[22px] px-2 rounded-sm border font-mono text-[10px] uppercase tracking-[0.14em] whitespace-nowrap shrink-0"
      style={{ color: c.fg, background: c.bg, borderColor: c.bd }}
    >
      {c.label}
    </span>
  );
}

// =============================================
// IconBtn
// =============================================
function IconBtn({ icon: Icon, href, label }: { icon: LucideIcon; href: string; label: string }) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="grid place-items-center w-7 h-7 rounded-sm border border-edge text-fg2 hover:text-cyan2 hover:border-cyan2/45 transition-colors"
    >
      <Icon size={14} />
    </a>
  );
}

// =============================================
// Desktop landscape card
// =============================================
function TeamCardDesktop({ profile, delay, shown }: { profile: Profile; delay: number; shown: boolean }) {
  const [hover, setHover] = useState(false);
  const router = useRouter();
  const tags = useMemo(() => (profile.custom_tags ?? []).map(parseTag), [profile.custom_tags]);

  return (
    <div
      onClick={() => router.push(`/profile/${profile.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative rounded-md p-[1px] cursor-pointer overflow-hidden"
      style={{
        background: "rgba(0,229,255,0.12)",
        boxShadow: hover ? "0 0 0 1px rgba(0,229,255,0.10), 0 12px 28px -16px rgba(0,0,0,0.7)" : "none",
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(10px)",
        transition: `box-shadow 220ms, opacity 480ms ${delay}ms cubic-bezier(.2,.7,.2,1), transform 480ms ${delay}ms cubic-bezier(.2,.7,.2,1)`,
      }}
    >
      {/* Rotating Background Beam */}
      <div 
        className="absolute z-0 top-1/2 left-1/2 pointer-events-none transition-opacity duration-300"
        style={{
          width: "100px",
          height: "800px",
          marginLeft: "-50px",
          marginTop: "-400px",
          backgroundImage: "linear-gradient(180deg, #00e5ff 0%, #00e5ff 40%, rgba(0,229,255,0) 80%)",
          animation: "spin 3s linear infinite",
          opacity: hover ? 1 : 0
        }}
      />

      {/* Inner dark cover */}
      <div 
        className="relative z-10 w-full h-full rounded-[5px] p-4 transition-colors duration-200"
        style={{ background: "#0d1117" }}
      >
        <div className="flex items-start gap-3">
          <RosterAvatar profile={profile} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="font-sans font-semibold text-fg text-[14.5px] tracking-tight leading-tight truncate min-w-0">
                {profile.display_name}
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-1.5 min-w-0">
              {profile.contact_email ? (
                <a
                  href={`mailto:${profile.contact_email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-[12px] text-fg2 hover:text-cyan2 transition-colors min-w-0"
                >
                  <Mail size={11} className="text-cyan2/80 shrink-0" />
                  <span className="font-mono truncate">{profile.contact_email}</span>
                </a>
              ) : (
                <span />
              )}
              <span className="flex-1" />
              {profile.github_url   && <IconBtn icon={GithubIcon} href={profile.github_url}   label="GitHub"   />}
              {profile.linkedin_url && <IconBtn icon={Linkedin}   href={profile.linkedin_url} label="LinkedIn" />}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-edge flex items-center flex-wrap gap-1">
          {(profile.roles && profile.roles.length > 0 ? profile.roles : [profile.role]).map((r) => (
            <RoleChip key={r} role={r} />
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================
// Mobile vertical card
// =============================================
function TeamCardMobile({ profile, delay, shown }: { profile: Profile; delay: number; shown: boolean }) {
  const [hover, setHover] = useState(false);
  const router = useRouter();
  const tags = useMemo(() => (profile.custom_tags ?? []).map(parseTag), [profile.custom_tags]);

  return (
    <div
      onClick={() => router.push(`/profile/${profile.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative rounded-md p-4 text-center cursor-pointer"
      style={{
        border: `1px solid ${hover ? "rgba(0,229,255,0.32)" : "rgba(0,229,255,0.12)"}`,
        background: "#0d1117",
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(10px)",
        transition: `border-color 180ms, opacity 480ms ${delay}ms cubic-bezier(.2,.7,.2,1), transform 480ms ${delay}ms cubic-bezier(.2,.7,.2,1)`,
      }}
    >
      <div
        className="flex justify-center transition-transform duration-200"
        style={{ transform: hover ? "scale(1.05)" : "scale(1)" }}
      >
        <RosterAvatar profile={profile} size={80} />
      </div>

      <h3 className="font-sans font-semibold text-fg text-[15px] tracking-tight leading-tight mt-3">
        {profile.display_name}
      </h3>

      <div className="mt-3 flex justify-center flex-wrap gap-1">
        {(profile.roles && profile.roles.length > 0 ? profile.roles : [profile.role]).map((r) => (
          <RoleChip key={r} role={r} />
        ))}
      </div>

      {profile.contact_email && (
        <a
          href={`mailto:${profile.contact_email}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-fg2 hover:text-cyan2 transition-colors max-w-full"
        >
          <Mail size={11} className="text-cyan2/80 shrink-0" />
          <span className="font-mono truncate">{profile.contact_email}</span>
        </a>
      )}

      <div className="mt-3 flex items-center justify-center gap-2">
        {profile.github_url   && <IconBtn icon={GithubIcon} href={profile.github_url}   label="GitHub"   />}
        {profile.linkedin_url && <IconBtn icon={Linkedin}   href={profile.linkedin_url} label="LinkedIn" />}
      </div>
    </div>
  );
}

// =============================================
// Filter pills
// =============================================
function RosterFilterPills({
  value,
  onChange,
  counts,
}: {
  value: FilterKey;
  onChange: (k: FilterKey) => void;
  counts: Record<string, number>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLLabelElement | null>>({});
  const [bar, setBar] = useState({ x: 0, w: 0, ready: false });

  const measureRef = useRef<() => void>(() => {});
  const measure = () => {
    const el = btnRefs.current[value];
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const er = el.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    setBar({ x: er.left - wr.left, w: er.width, ready: true });
  };
  measureRef.current = measure;

  useIsomorphicLayoutEffect(() => { measure(); }, [value]);
  useEffect(() => {
    const ro = new ResizeObserver(() => measureRef.current());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div 
      className="cir-tabs max-w-full overflow-x-auto relative" 
      ref={wrapRef}
      style={{ 
        background: "rgba(13,17,23,0.8)", 
        backdropFilter: "blur(8px)", 
        borderColor: "rgba(0,229,255,0.15)",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <style>{`
        .cir-tabs::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Sliding Pill Background */}
      <div 
        className="absolute rounded-full pointer-events-none"
        style={{
          top: "6px",
          left: 0,
          height: "36px",
          transform: `translateX(${bar.x - 1}px)`,
          width: bar.w,
          opacity: bar.ready ? 1 : 0,
          background: "#00e5ff",
          boxShadow: "0 1px 1px rgba(0,229,255,0.06), 0 8px 18px -10px rgba(0,229,255,0.5)",
          transition: "transform 250ms cubic-bezier(0.22, 1, 0.36, 1), width 250ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms",
        }}
      />

      {ROSTER_FILTERS.map((f) => {
        const active = value === f.key;
        return (
          <label 
            key={f.key} 
            className="relative inline-flex mb-0 cursor-pointer z-10" 
            title={f.label}
            ref={(el) => { btnRefs.current[f.key] = el; }}
          >
            <input
              type="radio"
              className="cir-tabs__r"
              name="rosterFilter"
              value={f.key}
              checked={active}
              onChange={() => onChange(f.key)}
              aria-label={f.label}
            />
            <span 
              className="cir-tabs__t transition-colors duration-200 !px-4 !bg-transparent flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] whitespace-nowrap"
            >
              <span>{f.label}</span>
              <span
                className="font-mono text-[9.5px] tabular-nums tracking-[0.10em] transition-colors duration-200"
                style={{ color: active ? "rgba(0,0,0,0.6)" : "#4a5568" }}
              >
                {String(counts[f.key] ?? 0).padStart(2, "0")}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

// =============================================
// Empty state
// =============================================
function RosterEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div
      className="relative border border-dashed border-edge rounded-md overflow-hidden corner-ticks"
      style={{ background: "rgba(13,17,23,0.4)" }}
    >
      <span className="ct-tr" />
      <span className="ct-bl" />
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative text-center py-16 px-6">
        <div className="mx-auto w-14 h-14 grid place-items-center border border-edge rounded-md text-fg3 mb-4 bg-base">
          <Users size={22} />
        </div>
        <h3 className="text-fg font-bold text-[18px] tracking-tight">No innovators found</h3>
        <p className="text-fg2 text-[13px] mt-1.5 max-w-[42ch] mx-auto leading-relaxed">
          Try a different filter or clear it to see the full roster.
        </p>
        <button onClick={onClear} className="btn btn-primary btn-md mt-5">
          <LayoutGrid size={13} />
          Show all
        </button>
      </div>
    </div>
  );
}

// =============================================
// CircuitTrace SVG decorations
// =============================================
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

// =============================================
// InnovatorsClient
// =============================================
export default function InnovatorsClient({ profiles }: { profiles: Profile[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [shown, setShown]   = useState(false);
  const [t, setT] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(id);
  }, []);

  // Drive the slow circuit-trace drift
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

  useEffect(() => {
    setShown(false);
    const id = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(id);
  }, [filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    ROSTER_FILTERS.forEach((f) => { c[f.key] = profiles.filter(f.test).length; });
    return c;
  }, [profiles]);

  const filtered = useMemo(() => {
    const def = ROSTER_FILTERS.find((f) => f.key === filter);
    return profiles.filter(def ? def.test : () => true);
  }, [profiles, filter]);

  return (
    <div className="relative min-h-screen bg-base overflow-hidden">
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

      <main className="relative z-10 max-w-[1480px] mx-auto w-full px-6 lg:px-12 pb-16" style={{ paddingTop: "calc(var(--nav-height) + 3rem)" }}>
        {/* ── Section header ── */}
        <div className="mb-8">
          <h1 className="font-sans font-extrabold tracking-tight text-fg text-[44px] leading-none">
            Our Innovators
          </h1>
          <p className="text-fg2 text-[14px] mt-3 max-w-[68ch] leading-relaxed">
            Powerhouse that fuels the MakerSpace Lab, All Real folks here, feel free to say hi =]
          </p>
        </div>

        {/* ── Filter pills ── */}
        <div className="mb-5">
          <RosterFilterPills value={filter} onChange={setFilter} counts={counts} />
        </div>

        {/* ── Meta strip ── */}
        <div className="flex items-center mb-5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg2">
          <div className="flex items-center gap-3">
            <span
              className="led-pulse"
              style={{
                display: "inline-block",
                width: 7,
                height: 7,
                borderRadius: 999,
                background: "#22c55e",
                boxShadow: "0 0 0 1px #22c55e33, 0 0 8px #22c55eaa",
              }}
            />
            <span>
              {String(filtered.length).padStart(2, "0")} of {String(profiles.length).padStart(2, "0")} showing
            </span>
          </div>
        </div>

        {/* ── Cards ── */}
        {filtered.length === 0 ? (
          <RosterEmpty onClear={() => setFilter("all")} />
        ) : (
          <>
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }}
            >
              {filtered.map((p, i) => (
                <TeamCardDesktop
                  key={p.id}
                  profile={p}
                  delay={Math.min(i, 16) * 35}
                  shown={shown}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
