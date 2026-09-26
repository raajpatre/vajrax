"use client";

import { useMemo, useState, useEffect, useRef, useLayoutEffect, useId } from "react";
import Link from "next/link";
import { FolderOpen, Lightbulb, ArrowRight } from "lucide-react";
import { Tables } from "@/types/database";
import { useUser } from "@/lib/hooks/useUser";

type Project = Tables<"projects">;

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; bg: string; text: string }> = {
  in_progress: { label: "IN PROGRESS", bg: "rgba(245,158,11,0.85)",  text: "#07090f" },
  ongoing:     { label: "IN PROGRESS", bg: "rgba(245,158,11,0.85)",  text: "#07090f" },
  completed:   { label: "COMPLETED",   bg: "rgba(34,197,94,0.85)",   text: "#07090f" },
  archived:    { label: "ARCHIVED",    bg: "rgba(139,154,176,0.85)", text: "#07090f" },
  on_hold:     { label: "ON HOLD",     bg: "rgba(139,154,176,0.85)", text: "#07090f" },
  planning:    { label: "PLANNING",    bg: "rgba(0,229,255,0.85)",   text: "#07090f" },
};

// ─── Filters ──────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "all",         label: "All Projects" },
  { key: "mine",        label: "My Projects" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed" },
  { key: "archived",    label: "Archived" },
];

function matchesFilter(filter: string, status: string, isMine: boolean) {
  if (filter === "mine") return isMine;
  if (filter === "all") return true;
  if (filter === "in_progress") return ["in_progress", "ongoing", "planning"].includes(status);
  if (filter === "archived")    return ["archived", "on_hold"].includes(status);
  return status === filter;
}

// ─── Hue from project id ───────────────────────────────────────────────────────

function projectHue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h % 360;
}

// ─── SVG cover fallback ────────────────────────────────────────────────────────

function ProjectCoverFallback({ hue }: { hue: number }) {
  const id = useId();
  const tint = `hsl(${hue} 90% 60%)`;
  const c1   = `hsl(${hue} 60% 12%)`;
  const c2   = `hsl(${(hue + 30) % 360} 70% 7%)`;
  return (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" className="w-full h-full block">
      <defs>
        <linearGradient id={`pcg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} /><stop offset="100%" stopColor={c2} />
        </linearGradient>
        <pattern id={`pcs-${id}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="14" stroke={tint} strokeWidth="1.1" opacity="0.09" />
        </pattern>
      </defs>
      <rect width="400" height="225" fill={`url(#pcg-${id})`} />
      <rect width="400" height="225" fill={`url(#pcs-${id})`} />
      <g stroke={tint} fill="none" strokeWidth="1" opacity="0.25">
        <path d="M0 60 L70 60 L82 72 L160 72" />
        <path d="M260 168 L320 168 L332 180 L400 180" />
        <circle cx="70"  cy="60"  r="2" fill={tint} />
        <circle cx="332" cy="180" r="2" fill={tint} />
      </g>
      <path d="M0 0 H16 M0 0 V16"       stroke={tint} strokeWidth="1.5" opacity="0.85" />
      <path d="M400 0 H384 M400 0 V16"  stroke={tint} strokeWidth="1.5" opacity="0.6"  />
      <path d="M0 225 H16 M0 225 V209"  stroke={tint} strokeWidth="1.5" opacity="0.6"  />
      <path d="M400 225 H384 M400 225 V209" stroke={tint} strokeWidth="1.5" opacity="0.85" />
      <g stroke={tint} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"
         transform="translate(176,98.5)" opacity="0.80">
        <rect x="0" y="0" width="48" height="48" rx="4" />
        <rect x="10" y="10" width="28" height="28" rx="2" />
        <line x1="-8" y1="14" x2="0" y2="14" /><line x1="-8" y1="22" x2="0" y2="22" />
        <line x1="-8" y1="30" x2="0" y2="30" /><line x1="-8" y1="38" x2="0" y2="38" />
        <line x1="48" y1="14" x2="56" y2="14" /><line x1="48" y1="22" x2="56" y2="22" />
        <line x1="48" y1="30" x2="56" y2="30" /><line x1="48" y1="38" x2="56" y2="38" />
        <line x1="14" y1="-8" x2="14" y2="0" /><line x1="22" y1="-8" x2="22" y2="0" />
        <line x1="30" y1="-8" x2="30" y2="0" /><line x1="38" y1="-8" x2="38" y2="0" />
        <line x1="14" y1="48" x2="14" y2="56" /><line x1="22" y1="48" x2="22" y2="56" />
        <line x1="30" y1="48" x2="30" y2="56" /><line x1="38" y1="48" x2="38" y2="56" />
      </g>
    </svg>
  );
}

// ─── Tech chip ─────────────────────────────────────────────────────────────────

function TechChip({ label, extra }: { label?: string; extra?: number }) {
  if (extra) {
    return (
      <span className="shrink-0 inline-flex items-center h-5 px-2 rounded-sm border border-[rgba(0,229,255,0.12)] bg-[#07090f]/60 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#8b9ab0]">
        +{extra}
      </span>
    );
  }
  return (
    <span className="shrink-0 inline-flex items-center h-5 px-2 rounded-sm border border-[rgba(0,229,255,0.35)] bg-[#07090f]/70 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#f0f4ff]">
      {label}
    </span>
  );
}

// ─── Project card ──────────────────────────────────────────────────────────────

const MAX_TAGS = 4;

function ProjectCard({ project, delay, shown, isMine }: { project: Project; delay: number; shown: boolean; isMine: boolean }) {
  const [hover, setHover] = useState(false);
  const st = STATUS[project.status] ?? STATUS.planning;
  const hue = useMemo(() => projectHue(project.id), [project.id]);
  const tags = project.tech_stack ?? [];
  const visibleTags = tags.slice(0, MAX_TAGS);
  const extra = tags.length - MAX_TAGS;

  return (
    <Link href={`/projects/${project.id}`} className="block">
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="relative w-full text-left bg-[#0d1117] rounded-md overflow-hidden"
        style={{
          border: `1px solid ${hover ? "rgba(0,229,255,0.32)" : "rgba(0,229,255,0.12)"}`,
          boxShadow: hover
            ? "0 0 0 1px rgba(0,229,255,0.12), 0 16px 36px -18px rgba(0,0,0,0.75), 0 0 24px -10px rgba(0,229,255,0.4)"
            : "none",
          transform: hover ? "translateY(-2px)" : "translateY(0)",
          opacity: shown ? 1 : 0,
          transition: [
            "border-color 180ms",
            "box-shadow 220ms",
            "transform 200ms cubic-bezier(.2,.7,.2,1)",
            `opacity 450ms ${delay}ms cubic-bezier(.2,.7,.2,1)`,
          ].join(", "),
        }}
      >
        {/* Cover */}
        <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <div
            className="absolute inset-0 transition-transform duration-300"
            style={{ transform: hover ? "scale(1.025)" : "scale(1)" }}
          >
            {project.cover_image_url ? (
              <img
                src={project.cover_image_url}
                alt={project.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <ProjectCoverFallback hue={hue} />
            )}
          </div>

          {/* Status badge */}
          <span
            className="pointer-events-none absolute top-2.5 right-2.5 inline-flex flex-col gap-1.5 items-end"
          >
            <span
              className="inline-flex items-center h-[22px] px-2 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] font-semibold shadow-sm"
              style={{ color: st.text, background: st.bg, backdropFilter: "blur(4px)" }}
            >
              {st.label}
            </span>
            {isMine && (
              <span
                className="inline-flex items-center h-[20px] px-2 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em] font-semibold shadow-sm border"
                style={{ color: "#00e5ff", background: "rgba(0,229,255,0.15)", borderColor: "rgba(0,229,255,0.4)", backdropFilter: "blur(4px)" }}
              >
                YOUR PROJECT
              </span>
            )}
          </span>
        </div>

        {/* Body */}
        <div className="p-3.5">
          <div className="font-sans font-semibold text-[#f0f4ff] text-[14.5px] tracking-tight leading-snug">{project.title}</div>
          <p
            className="text-[#8b9ab0] text-[12.5px] mt-1.5 leading-relaxed"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}
          >
            {project.description}
          </p>

          {visibleTags.length > 0 && (
            <div className="flex items-center flex-nowrap gap-1 mt-3 overflow-hidden">
              {visibleTags.map((t) => <TechChip key={t} label={t} />)}
              {extra > 0 && <TechChip extra={extra} />}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Filter pills ──────────────────────────────────────────────────────────────

function FilterPills({ value, onChange, counts }: {
  value: string;
  onChange: (v: string) => void;
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
    setBar({ x: el.offsetLeft, w: el.offsetWidth, ready: true });
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
      className="cir-tabs relative" 
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

      {FILTERS.map((f) => {
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
              name="projectsFilter"
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
                className="font-mono text-[9.5px] tabular-nums transition-colors duration-200"
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

// ─── Empty state ───────────────────────────────────────────────────────────────

function ProjectsEmpty({ isFiltered, onClear }: { isFiltered: boolean; onClear: () => void }) {
  return (
    <div
      className="relative border border-dashed rounded-md overflow-hidden corner-ticks"
      style={{ borderColor: "rgba(0,229,255,0.18)", background: "rgba(13,17,23,0.4)" }}
    >
      <span className="ct-tr" /><span className="ct-bl" />
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative text-center py-16 px-6">
        <div
          className="mx-auto w-14 h-14 grid place-items-center rounded-md text-[#4a5568] mb-4"
          style={{ border: "1px solid rgba(0,229,255,0.12)", background: "#07090f" }}
        >
          <FolderOpen size={22} />
        </div>
        <h3 className="text-[#f0f4ff] font-bold text-[18px] tracking-tight">No projects found</h3>
        <p className="text-[#8b9ab0] text-[13px] mt-1.5 max-w-[42ch] mx-auto leading-relaxed">
          {isFiltered
            ? "No projects match that filter. Try a different status or clear to see all."
            : "You haven't been added to any projects yet. Propose one or ask your lead to invite you."}
        </p>
        {isFiltered && (
          <div className="mt-5">
            <button
              onClick={onClear}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00c7e0] transition-colors"
            >
              Show all projects
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CircuitTrace SVG decorations ────────────────────────────────────────────────
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

// ─── Page ──────────────────────────────────────────────────────────────────────


export default function ProjectsClient({ projects, myProjectIds }: { projects: Project[]; myProjectIds: string[] }) {
  const { isFaculty } = useUser();
  const [filter, setFilter] = useState("all");
  const [shown,  setShown]  = useState(false);
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
    const c: Record<string, number> = { all: projects.length, mine: 0 };
    projects.forEach((p) => {
      if (myProjectIds.includes(p.id)) c.mine++;
      // normalize ongoing → in_progress bucket
      const bucket = p.status === "ongoing" ? "in_progress" : p.status;
      c[bucket] = (c[bucket] ?? 0) + 1;
      if (p.status === "on_hold") c.archived = (c.archived ?? 0) + 1;
    });
    c.in_progress = (c.in_progress ?? 0);
    c.completed   = (c.completed   ?? 0);
    c.archived    = (c.archived    ?? 0);
    return c;
  }, [projects]);

  const items = useMemo(() => {
    if (filter === "all") return projects;
    return projects.filter((p) => matchesFilter(filter, p.status, myProjectIds.includes(p.id)));
  }, [filter, projects]);

  return (
    <div className="relative min-h-screen bg-[#07090f] overflow-hidden">
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

      <div className="relative z-10 px-4 sm:px-8 pt-6 sm:pt-10 pb-16">
        {/* Page header */}
      <div className="flex items-end justify-between gap-6 mb-7 flex-wrap">
        <div>
          <h1 className="font-sans font-extrabold tracking-tight text-[#f0f4ff] text-[36px] leading-none">
            {isFaculty ? "Projects" : "My Projects"}
          </h1>
          <p className="text-[#8b9ab0] text-[13.5px] mt-2.5 max-w-[64ch] leading-relaxed">
            {isFaculty
              ? "Explore our robotics R&D portfolio, from first prototype to competition-ready systems."
              : "Projects you've been added to or proposed. Click any card to open the workspace."}
          </p>
        </div>
        <Link
          href="/projects/request"
          className="btn-3d-cyan"
          style={{ textDecoration: 'none' }}
        >
          <div className="btn-top flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] font-bold">
            <Lightbulb size={14} />
            <span>Propose a Project</span>
            <ArrowRight size={12} />
          </div>
          <div className="btn-bottom" />
          <div className="btn-base" />
        </Link>
      </div>

      {/* Filters + meta */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <FilterPills value={filter} onChange={setFilter} counts={counts} />
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#8b9ab0]">
          <span
            className="w-[7px] h-[7px] rounded-full bg-[#22c55e] animate-pulse shrink-0"
            style={{ boxShadow: "0 0 6px rgba(34,197,94,0.7)" }}
          />
          <span>
            {String(items.length).padStart(2, "0")} of {String(projects.length).padStart(2, "0")} showing
          </span>
        </div>
      </div>

      {/* Grid or empty */}
      {items.length === 0 ? (
        <ProjectsEmpty isFiltered={filter !== "all"} onClear={() => setFilter("all")} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {items.map((p, i) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  delay={Math.min(i, 16) * 35}
                  shown={shown}
                  isMine={myProjectIds.includes(p.id)}
                />
              ))}
        </div>
      )}
      </div>
    </div>
  );
}
