"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Mail, GithubIcon, Linkedin, Users, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

// ---- Role palette ----
const ROLE_COLOR: Record<string, { fg: string; bg: string; bd: string; label: string }> = {
  faculty:           { fg: "#00e5ff", bg: "rgba(0,229,255,0.10)",   bd: "rgba(0,229,255,0.45)",   label: "FACULTY"       },
  president:         { fg: "#f59e0b", bg: "rgba(245,158,11,0.10)",  bd: "rgba(245,158,11,0.45)",  label: "PRESIDENT"     },
  vice_president:    { fg: "#a78bfa", bg: "rgba(167,139,250,0.10)", bd: "rgba(167,139,250,0.45)", label: "VP"            },
  inventory_manager: { fg: "#22c55e", bg: "rgba(34,197,94,0.10)",   bd: "rgba(34,197,94,0.45)",   label: "INVENTORY MGR" },
  website_manager:   { fg: "#fbbf24", bg: "rgba(251,191,36,0.10)",  bd: "rgba(251,191,36,0.45)",  label: "WEBSITE MGR"   },
  printing_head:     { fg: "#f97316", bg: "rgba(249,115,22,0.10)",  bd: "rgba(249,115,22,0.45)",  label: "PRINTING HEAD" },
  member:            { fg: "#8b9ab0", bg: "rgba(139,154,176,0.10)", bd: "rgba(139,154,176,0.40)", label: "MEMBER"        },
};

// ---- Filter config ----
type FilterKey = "all" | "faculty" | "committee" | "members";

const ROSTER_FILTERS: { key: FilterKey; label: string; test: (p: Profile) => boolean }[] = [
  { key: "all",       label: "All",            test: () => true },
  { key: "faculty",   label: "Faculty",        test: (p) => p.role === "faculty" },
  { key: "committee", label: "Club Committee", test: (p) => ["president","vice_president","inventory_manager","website_manager","printing_head"].includes(p.role) },
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

// =============================================
// TagChip
// =============================================
function TagChip({ tag }: { tag: ParsedTag }) {
  const fg = tag.color || "#8b9ab0";
  return (
    <span
      className="inline-flex items-center rounded-sm border font-mono uppercase tracking-[0.10em] h-[18px] px-1.5 text-[9.5px]"
      style={{ color: fg, background: `${fg}14`, borderColor: `${fg}55` }}
    >
      {tag.name}
    </span>
  );
}

// =============================================
// RoleChip
// =============================================
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
      className="relative rounded-md p-4 cursor-pointer"
      style={{
        border: `1px solid ${hover ? "rgba(0,229,255,0.32)" : "rgba(0,229,255,0.12)"}`,
        background: hover ? "rgba(13,17,23,0.95)" : "#0d1117",
        boxShadow: hover ? "0 0 0 1px rgba(0,229,255,0.10), 0 12px 28px -16px rgba(0,0,0,0.7)" : "none",
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(10px)",
        transition: `border-color 180ms, background 180ms, box-shadow 220ms, opacity 480ms ${delay}ms cubic-bezier(.2,.7,.2,1), transform 480ms ${delay}ms cubic-bezier(.2,.7,.2,1)`,
      }}
    >
      <div className="flex items-start gap-3">
        <RosterAvatar profile={profile} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="font-sans font-semibold text-fg text-[14.5px] tracking-tight leading-tight truncate min-w-0">
              {profile.display_name}
            </div>
            <RoleChip role={profile.role} />
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

      {tags.length > 0 && (
        <div className="mt-3 pt-3 border-t border-edge flex items-center flex-wrap gap-1">
          {tags.map((t) => <TagChip key={t.name} tag={t} />)}
        </div>
      )}
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

      <div className="mt-3 flex justify-center">
        <RoleChip role={profile.role} />
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex items-center flex-wrap gap-1 justify-center">
          {tags.map((t) => <TagChip key={t.name} tag={t} />)}
        </div>
      )}

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
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {ROSTER_FILTERS.map((f) => {
        const active = value === f.key;
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className="group shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-sm font-mono text-[11px] uppercase tracking-[0.16em] whitespace-nowrap transition-colors"
            style={{
              color:      active ? "#00e5ff" : "#8b9ab0",
              background: active ? "rgba(0,229,255,0.10)" : "transparent",
              border:     `1px solid ${active ? "rgba(0,229,255,0.55)" : "rgba(0,229,255,0.12)"}`,
              boxShadow:  active ? "0 0 16px -4px rgba(0,229,255,0.45)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.color = "#f0f4ff";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,229,255,0.30)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.color = "#8b9ab0";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,229,255,0.12)";
              }
            }}
          >
            <span>{f.label}</span>
            <span
              className="font-mono text-[9.5px] tabular-nums tracking-[0.10em]"
              style={{ color: active ? "rgba(0,229,255,0.85)" : "#4a5568" }}
            >
              {String(counts[f.key] ?? 0).padStart(2, "0")}
            </span>
          </button>
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
// InnovatorsClient
// =============================================
export default function InnovatorsClient({ profiles }: { profiles: Profile[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [shown, setShown]   = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(id);
  }, []);

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
    <div className="min-h-screen bg-base">
      <main className="max-w-[1480px] mx-auto w-full px-6 lg:px-12 pb-16" style={{ paddingTop: "calc(var(--nav-height) + 3rem)" }}>
        {/* ── Section header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-8 shrink-0" style={{ background: "rgba(0,229,255,0.6)" }} />
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan2">
              // VAJRAX / ROSTER · 2026
            </span>
          </div>
          <h1 className="font-sans font-extrabold tracking-tight text-fg text-[44px] leading-none">
            Our Innovators
          </h1>
          <p className="text-fg2 text-[14px] mt-3 max-w-[68ch] leading-relaxed">
            The faculty, committee, and members who keep the workshop moving. Filter by group, ping
            anyone directly — every email here is real and watched.
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
            {/* Desktop: auto-fill landscape cards */}
            <div
              className="hidden lg:grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
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
            {/* Mobile/tablet: vertical cards */}
            <div className="grid lg:hidden grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((p, i) => (
                <TeamCardMobile
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
