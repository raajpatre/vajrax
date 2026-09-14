"use client";

import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import Image from "next/image";
import {
  Camera,
  PlayCircle,
  FileText,
  LayoutGrid,
  X,
  Trash2,
  Loader2,
  Pencil,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  ExternalLink,
  MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tables } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";
import GalleryUploadModal from "./GalleryUploadModal";

type GalleryItem = Tables<"gallery_items">;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ---- Filter types ----
type FilterKey = "all" | "photo" | "video" | "article";

const KIND_FILTERS: { key: FilterKey; label: string; Icon: LucideIcon }[] = [
  { key: "all",     label: "All",      Icon: LayoutGrid  },
  { key: "photo",   label: "Photos",   Icon: Camera      },
  { key: "video",   label: "Videos",   Icon: PlayCircle  },
  { key: "article", label: "Articles", Icon: FileText    },
];

type KindKey = "photo" | "video" | "article";

const KIND_META: Record<
  KindKey,
  { fg: string; bd: string; bg: string; Icon: LucideIcon; label: string }
> = {
  photo:   { fg: "#00e5ff", bd: "rgba(0,229,255,0.45)",   bg: "rgba(0,229,255,0.10)",   Icon: Camera,     label: "PHOTO"   },
  video:   { fg: "#f59e0b", bd: "rgba(245,158,11,0.50)",  bg: "rgba(245,158,11,0.10)",  Icon: PlayCircle, label: "VIDEO"   },
  article: { fg: "#a78bfa", bd: "rgba(167,139,250,0.50)", bg: "rgba(167,139,250,0.10)", Icon: FileText,   label: "ARTICLE" },
};

function inferKind(item: GalleryItem): KindKey {
  // media_url presence takes precedence
  if (item.media_url) {
    const ytId = extractYouTubeId(item.media_url);
    if (ytId) return "video";
    return "article";
  }
  const t = (item.tag ?? "").toLowerCase();
  if (t === "video" || t === "reel") return "video";
  if (t === "article" || t === "writeup" || t === "blog") return "article";
  return "photo";
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0] || null;
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    return null;
  } catch {
    return null;
  }
}

function ytEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
}

function shouldBypass(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return !["drive.google.com", "lh3.googleusercontent.com", "docs.googleusercontent.com"].includes(hostname);
  } catch {
    return true;
  }
}

// =============================================
// KindFilters — sliding indicator chip bar
// =============================================
function KindFilters({
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

  useIsomorphicLayoutEffect(() => { measure(); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
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
        scrollbarWidth: "none", // Firefox
        msOverflowStyle: "none", // IE/Edge
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

      {KIND_FILTERS.map(({ key, label, Icon }) => {
        const active = value === key;
        return (
          <label 
            key={key} 
            className="relative inline-flex mb-0 cursor-pointer z-10" 
            title={label}
            ref={(el) => { btnRefs.current[key] = el; }}
          >
            <input
              type="radio"
              className="cir-tabs__r"
              name="kindFilter"
              value={key}
              checked={active}
              onChange={() => onChange(key)}
              aria-label={label}
            />
            <span className="cir-tabs__t transition-colors duration-200 !px-4 !bg-transparent">
              <Icon size={16} />
            </span>
          </label>
        );
      })}
    </div>
  );
}

// =============================================
// GalleryCard
// =============================================
function GalleryCard({
  item,
  onOpen,
  canEdit,
  onEdit,
}: {
  item: GalleryItem;
  onOpen: (item: GalleryItem) => void;
  canEdit: boolean;
  onEdit: (item: GalleryItem) => void;
}) {
  const [hover, setHover] = useState(false);
  const kind = inferKind(item);
  const meta = KIND_META[kind];
  const date = new Date(item.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });

  // Tag badge colours — use custom tag_color if set, else fall back to kind meta
  const tagFg = item.tag_color ?? meta.fg;
  const tagBg = item.tag_color ? `${item.tag_color}1a` : meta.bg;
  const tagBd = item.tag_color ? `${item.tag_color}70` : meta.bd;

  // Determine thumbnail URL for card
  const thumbUrl = item.cover_image_url;
  const hasThumb = !!thumbUrl;
  const isVideo = kind === "video";
  const isArticle = kind === "article";

  return (
    <button
      onClick={() => onOpen(item)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group block w-full mb-5 text-left bg-surface border rounded-md overflow-hidden break-inside-avoid transition-all duration-200"
      style={{
        borderColor: hover ? meta.fg : "rgba(0,229,255,0.12)",
        boxShadow: hover
          ? `0 0 0 1px ${meta.bd}, 0 14px 32px -16px rgba(0,0,0,0.7), 0 0 26px -10px ${meta.bd}`
          : "none",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {/* Top meta strip */}
      <div
        className="flex items-center justify-between px-3 h-8 border-b"
        style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(7,9,15,0.6)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 h-5 px-1.5 rounded-sm font-mono text-[9.5px] uppercase tracking-[0.14em]"
            style={{ color: tagFg, background: tagBg, border: `1px solid ${tagBd}` }}
          >
            <meta.Icon size={10} />
            {item.tag || meta.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {canEdit && (
            <span
              role="button" tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onEdit(item); } }}
              className="grid place-items-center w-5 h-5 rounded-sm text-fg3 hover:text-amber2 transition-colors"
              title="Edit"
            >
              <Pencil size={10} />
            </span>
          )}
          <ChevronRight size={12} className="text-fg3 group-hover:text-cyan2 transition-colors" />
        </div>
      </div>

      {/* Thumbnail area */}
      {hasThumb ? (
        <div className="relative w-full" style={{ aspectRatio: "4/3", background: "#0d1117" }}>
          <Image
            src={thumbUrl}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            unoptimized={shouldBypass(thumbUrl)}
          />
          {/* Play overlay for videos */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div
                className="grid place-items-center w-14 h-14 rounded-full transition-transform duration-200 group-hover:scale-110"
                style={{ background: "rgba(239,68,68,0.9)", boxShadow: "0 0 24px rgba(239,68,68,0.6)" }}
              >
                <PlayCircle size={30} className="text-white" />
              </div>
            </div>
          )}
          {/* Article overlay */}
          {isArticle && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div
                className="grid place-items-center w-12 h-12 rounded-full"
                style={{ background: "rgba(167,139,250,0.85)", boxShadow: "0 0 24px rgba(167,139,250,0.5)" }}
              >
                <FileText size={24} className="text-white" />
              </div>
            </div>
          )}
          {/* Hover overlay */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 transition-all duration-300"
            style={{
              transform: hover ? "translateY(0)" : "translateY(100%)",
              opacity: hover ? 1 : 0,
              background: "linear-gradient(to top, rgba(7,9,15,0.95) 0%, rgba(7,9,15,0.65) 70%, rgba(7,9,15,0) 100%)",
              padding: "36px 14px 12px",
            }}
          >
            <div className="text-fg text-[18px] font-bold tracking-tight leading-snug">⚡️ {item.title}</div>
          </div>
        </div>
      ) : isArticle ? (
        /* Article card without thumbnail */
        <div
          className="relative w-full flex flex-col items-center justify-center gap-3 px-4 py-10"
          style={{ background: "rgba(167,139,250,0.06)", minHeight: 120 }}
        >
          <FileText size={32} style={{ color: "rgba(167,139,250,0.7)" }} />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "#a78bfa" }}>
            Read Article
          </span>
        </div>
      ) : null}

      {/* Body */}
      <div className="p-4">
        {item.description && (
          <p className="text-fg2 text-[12.5px] leading-relaxed line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-mono text-[10px] tabular-nums tracking-[0.10em] text-fg3">
            {date}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg3">
            {item.location_city || "VajraX"}
          </span>
        </div>
      </div>
    </button>
  );
}

// =============================================
// Lightbox
// =============================================
function Lightbox({
  items,
  index,
  onClose,
  onNav,
  canEdit,
  onEdit,
}: {
  items: GalleryItem[];
  index: number | null;
  onClose: () => void;
  onNav: (dir: number) => void;
  canEdit: boolean;
  onEdit: (item: GalleryItem) => void;
}) {
  const item = index != null ? items[index] : null;
  const [isDeleting, setIsDeleting] = useState(false);
  const [imgAspect, setImgAspect] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onNav(-1);
      else if (e.key === "ArrowRight") onNav(+1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose, onNav]);

  useEffect(() => {
    if (item) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [!!item]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect natural aspect ratio via a native Image object — reliable unlike onLoad on next/image fill
  useEffect(() => {
    setImgAspect(null);
    const url = item?.cover_image_url;
    if (!url) return;
    const probe = new window.Image();
    probe.onload = () => {
      if (probe.naturalWidth && probe.naturalHeight) {
        setImgAspect(probe.naturalWidth / probe.naturalHeight);
      }
    };
    probe.src = url;
    return () => { probe.onload = null; };
  }, [item?.cover_image_url]);

  if (!item) return null;

  const kind = inferKind(item);
  const meta = KIND_META[kind];

  const d = new Date(item.created_at);
  const dateStr = `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}`;

  const ytId = item.media_url ? extractYouTubeId(item.media_url) : null;

  const tagHex = item.tag_color ?? meta.fg;
  const tagFg = tagHex;
  const tagBg = item.tag_color ? `${tagHex}1a` : meta.bg;
  const tagBd = item.tag_color ? `${tagHex}70` : meta.bd;

  // Clamp to [portrait 0.6 … ultra-wide 2.4]. Panel max-width derived from this so
  // the image always fills edge-to-edge with no pillarboxing (no maxHeight on container needed).
  const clampedAspect = imgAspect ? Math.min(Math.max(imgAspect, 0.6), 2.4) : null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this item from the gallery?")) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("gallery_items").delete().eq("id", item.id);
      if (error) throw error;
      onClose();
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to delete.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110]" style={{ animation: "fadeIn 160ms ease-out" }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: "rgba(7,9,15,0.92)" }}
        onClick={onClose}
      />

      {/* Content zone — mirrors the layout's sidebar offset so arrows + panel center in the visible area */}
      <div className="absolute inset-0 lg:left-[260px] [.sidebar-collapsed_&]:lg:left-[68px] transition-[left] duration-300 pointer-events-none">

        {/* Nav arrows */}
        <button onClick={() => onNav(-1)} aria-label="previous"
          className="absolute left-4 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 border border-edge rounded-sm text-fg2 hover:text-cyan2 hover:border-cyan2/50 backdrop-blur-sm z-20 transition-colors pointer-events-auto"
          style={{ background: "rgba(7,9,15,0.6)" }}>
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => onNav(+1)} aria-label="next"
          className="absolute right-4 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 border border-edge rounded-sm text-fg2 hover:text-cyan2 hover:border-cyan2/50 backdrop-blur-sm z-20 transition-colors pointer-events-auto"
          style={{ background: "rgba(7,9,15,0.6)" }}>
          <ChevronRight size={18} />
        </button>

        {/* Main panel */}
        <div className="absolute inset-0 px-16 py-8 flex items-center justify-center pointer-events-none">
        <div
          className="relative w-full border border-edgeStrong rounded-md shadow-2xl corner-ticks overflow-hidden pointer-events-auto"
          style={{
            background: "rgba(7,9,15,0.98)",
            animation: "fadeIn 220ms ease-out",
            maxHeight: "calc(100vh - 4rem)",
            // Shrink panel width for portrait/square photos so image fills edge-to-edge
            maxWidth: clampedAspect
              ? `min(56rem, calc(72vh * ${clampedAspect}))`
              : "56rem",
          }}
        >
          <span className="ct-tr" />
          <span className="ct-bl" />

          {/* ── IMAGE / MEDIA AREA ── */}
          <div
            className="relative overflow-hidden"
            style={{
              aspectRatio: kind === "photo" && clampedAspect
                ? String(clampedAspect)
                : "16/9",
            }}
          >

            {/* Photo */}
            {kind === "photo" && item.cover_image_url && (
              <Image
                src={item.cover_image_url}
                alt={item.title}
                fill
                sizes="(max-width: 1024px) 100vw, 900px"
                className="object-cover"
                unoptimized={shouldBypass(item.cover_image_url)}
              />
            )}

            {/* Video */}
            {kind === "video" && ytId && (
              <iframe
                src={ytEmbedUrl(ytId)}
                title={item.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            )}

            {/* Article */}
            {kind === "article" && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8"
                style={{ background: "rgba(13,17,23,0.95)" }}
              >
                <div
                  className="grid place-items-center w-16 h-16 rounded-full"
                  style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)" }}
                >
                  <FileText size={28} style={{ color: "#a78bfa" }} />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: "#a78bfa" }}>
                  // ARTICLE
                </span>
                {item.media_url && (
                  <a
                    href={item.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-9 px-5 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] font-medium transition-all hover:opacity-80"
                    style={{ background: "rgba(167,139,250,0.18)", border: "1px solid rgba(167,139,250,0.5)", color: "#a78bfa" }}
                  >
                    <ExternalLink size={12} />
                    Read Article
                  </a>
                )}
              </div>
            )}

            {/* Gradient overlay — photo only */}
            {kind === "photo" && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(7,9,15,0.10) 0%, rgba(7,9,15,0.30) 45%, rgba(7,9,15,0.82) 100%)",
                }}
              />
            )}

            {/* Diagonal hatch — photo only */}
            {kind === "photo" && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(0,229,255,0.06) 0px, rgba(0,229,255,0.06) 1px, transparent 1px, transparent 14px)",
                  opacity: 0.6,
                }}
              />
            )}

            {/* Corner brackets — photo only */}
            {kind === "photo" && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path d="M2 11 L2 2 L11 2"   stroke="#00e5ff" strokeWidth="0.6" fill="none" opacity="0.65" />
                <path d="M89 2 L98 2 L98 11"  stroke="#00e5ff" strokeWidth="0.6" fill="none" opacity="0.65" />
                <path d="M2 89 L2 98 L11 98"  stroke="#00e5ff" strokeWidth="0.6" fill="none" opacity="0.65" />
                <path d="M89 98 L98 98 L98 89" stroke="#00e5ff" strokeWidth="0.6" fill="none" opacity="0.65" />
              </svg>
            )}

            {/* Circuit path decoration — photo only */}
            {kind === "photo" && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 800 350"
                preserveAspectRatio="none"
              >
                <path d="M0 70 L55 70 L75 90 L130 90" stroke="rgba(0,229,255,0.22)" strokeWidth="1" fill="none" />
                <circle cx="130" cy="90" r="2.5" fill="rgba(0,229,255,0.55)" />
                <circle cx="55"  cy="70" r="1.5" fill="rgba(0,229,255,0.35)" />
                <path d="M800 280 L745 280 L725 260 L670 260" stroke="rgba(0,229,255,0.22)" strokeWidth="1" fill="none" />
                <circle cx="670" cy="260" r="2.5" fill="rgba(0,229,255,0.55)" />
                <circle cx="745" cy="280" r="1.5" fill="rgba(0,229,255,0.35)" />
                <path d="M195 0 L195 38 L215 58" stroke="rgba(0,229,255,0.15)" strokeWidth="1" fill="none" />
                <circle cx="215" cy="58" r="2" fill="rgba(0,229,255,0.45)" />
                <path d="M605 350 L605 312 L585 292" stroke="rgba(0,229,255,0.15)" strokeWidth="1" fill="none" />
                <circle cx="585" cy="292" r="2" fill="rgba(0,229,255,0.45)" />
              </svg>
            )}

            {/* Top-right controls */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
              {canEdit && (
                <>
                  <button
                    onClick={() => onEdit(item)}
                    className="grid place-items-center w-8 h-8 border border-edge rounded-sm text-fg2 hover:text-amber2 hover:border-amber2/50 transition-colors backdrop-blur-sm"
                    style={{ background: "rgba(7,9,15,0.75)" }}
                    title="Edit"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="grid place-items-center w-8 h-8 border border-edge rounded-sm text-fg2 hover:text-red-400 hover:border-red-500/50 transition-colors backdrop-blur-sm disabled:opacity-50"
                    style={{ background: "rgba(7,9,15,0.75)" }}
                    title="Delete"
                  >
                    {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="grid place-items-center w-8 h-8 border border-edge rounded-sm text-fg2 hover:text-fg hover:border-cyan2/50 transition-colors backdrop-blur-sm"
                style={{ background: "rgba(7,9,15,0.75)" }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Top-left: item counter */}
            <div
              className="absolute top-3 left-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-edge font-mono text-[10px] tabular-nums backdrop-blur-sm z-10"
              style={{ background: "rgba(7,9,15,0.75)", color: "rgba(0,229,255,0.8)" }}
            >
              <span style={{ color: "rgba(0,229,255,0.4)" }}>//</span>
              {String((index ?? 0) + 1).padStart(2, "0")}
              <span className="text-fg3">·</span>
              {String(items.length).padStart(2, "0")}
            </div>
          </div>

          {/* ── METADATA STRIP ── */}
          <div
            className="px-6 py-5"
            style={{ borderTop: "1px solid rgba(0,229,255,0.08)" }}
          >
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              {/* Tag badge */}
              <span
                className="inline-flex items-center gap-1 h-[22px] px-2 rounded-sm border font-mono text-[9.5px] uppercase tracking-[0.14em]"
                style={{ color: tagFg, background: tagBg, borderColor: tagBd }}
              >
                <meta.Icon size={9} />
                {item.tag ?? meta.label}
              </span>

              {/* Date */}
              <span className="font-mono text-[10.5px] tabular-nums" style={{ color: "rgba(255,255,255,0.32)" }}>
                {dateStr}
              </span>

              {/* Location */}
              <span
                className="inline-flex items-center gap-1 font-mono text-[10.5px]"
                style={{ color: "rgba(255,255,255,0.32)" }}
              >
                <MapPin size={10} />
                {item.location_city || "Bengaluru"}
              </span>

              {/* Article link */}
              {kind === "article" && item.media_url && (
                <a
                  href={item.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1.5 h-7 px-3 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] transition-all hover:opacity-80"
                  style={{ background: "rgba(167,139,250,0.14)", border: "1px solid rgba(167,139,250,0.45)", color: "#a78bfa" }}
                >
                  <ExternalLink size={10} />
                  Open Article
                </a>
              )}

              {/* YouTube link */}
              {kind === "video" && item.media_url && (
                <a
                  href={item.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1.5 h-7 px-3 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] transition-all hover:opacity-80"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.45)", color: "#ef4444" }}
                >
                  <ExternalLink size={10} />
                  Watch on YouTube
                </a>
              )}
            </div>

            <h2 className="font-sans font-extrabold text-fg text-[22px] tracking-tight leading-tight">
              ⚡️ {item.title}
            </h2>
            {item.description && (
              <p className="text-fg2 text-[13px] leading-relaxed mt-1.5 max-w-[60ch]">
                {item.description}
              </p>
            )}
          </div>
        </div>
      </div>
      </div> {/* end content zone */}
    </div>
  );
}

// =============================================
// Empty state
// =============================================
function EmptyGallery({ onClear }: { onClear: () => void }) {
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
      <div className="relative text-center py-20 px-6">
        <div className="mx-auto w-24 h-24 mb-6">
          <svg viewBox="0 0 96 96" className="w-full h-full">
            <rect x="6" y="6" width="84" height="84" stroke="rgba(0,229,255,0.45)" strokeWidth="1.5" fill="rgba(0,229,255,0.04)" strokeDasharray="3 4" />
            <path d="M6 6 L18 6 M6 6 L6 18 M90 90 L78 90 M90 90 L90 78" stroke="#00e5ff" strokeWidth="1.5" />
            <line x1="6" y1="6" x2="90" y2="90" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.6" />
            <line x1="90" y1="6" x2="6" y2="90" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.6" />
            <circle cx="48" cy="48" r="6" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="48" cy="48" r="2" fill="#f59e0b" />
          </svg>
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-amber2 mb-3">// EMPTY FRAME</div>
        <h3 className="text-fg font-bold text-[20px] tracking-tight">No media found</h3>
        <p className="text-fg2 text-[13.5px] mt-2 max-w-[44ch] mx-auto leading-relaxed">
          Nothing in this category yet. Either we haven&apos;t shipped one, or someone&apos;s still editing.
        </p>
        <button onClick={onClear} className="btn btn-primary btn-md mt-6">
          <LayoutGrid size={13} />
          Show all media
        </button>
      </div>
    </div>
  );
}

// =============================================
// GalleryClient (main export)
// =============================================
export default function GalleryClient({ items }: { items: GalleryItem[] }) {
  const { isFaculty, isModerator } = useUser();
  const router = useRouter();
  const canEdit = isFaculty || isModerator;

  const [filter, setFilter] = useState<FilterKey>("all");
  const [lbIndex, setLbIndex] = useState<number | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editItem, setEditItem] = useState<GalleryItem | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver(
      ([e]) => setStuck(!e.isIntersecting),
      { threshold: 0, rootMargin: "-65px 0px 0px 0px" }
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach((item) => {
      const k = inferKind(item);
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => inferKind(item) === filter);
  }, [items, filter]);

  const openLightbox = useCallback(
    (item: GalleryItem) => {
      const idx = filtered.findIndex((i) => i.id === item.id);
      setLbIndex(idx >= 0 ? idx : 0);
    },
    [filtered]
  );

  const nav = useCallback(
    (dir: number) => {
      setLbIndex((i) => {
        if (i == null) return i;
        return (i + dir + filtered.length) % filtered.length;
      });
    },
    [filtered.length]
  );

  return (
    <div className="min-h-screen bg-base">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-edge bg-circuit">
        <div className="absolute inset-0 scanline pointer-events-none" />
        <div
          className="absolute -inset-x-10 -top-40 h-80 pointer-events-none"
          style={{ background: "radial-gradient(60% 60% at 50% 70%, rgba(0,229,255,0.18) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-[1480px] mx-auto px-6 lg:px-12 pt-[calc(var(--nav-height)+1.5rem)] pb-14">
          <div className="flex items-end justify-between gap-10 flex-wrap">
            <div className="min-w-0">
              <h1 className="font-sans font-extrabold tracking-tight text-fg leading-[0.95] text-[56px] lg:text-[80px] max-w-[14ch]">
                Achievements <span className="text-fg2 font-medium">&amp;</span>
                <br />
                <span style={{
                  display: "inline-block",
                  background: "linear-gradient(95deg, #00e5ff 0%, #5eead4 45%, #f59e0b 100%)",
                  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                  filter: "drop-shadow(0 0 18px rgba(0,229,255,0.25))",
                }}>
                  Builds.
                </span>
              </h1>
              <p className="text-fg2 text-[15px] lg:text-[16.5px] mt-6 max-w-[58ch] leading-relaxed">
                Photos from the floor, video from the field, articles from the people doing the work.
              </p>
            </div>

            {/* Stats panel */}
            <div className="grid grid-cols-3 gap-px bg-edge border border-edge rounded-md overflow-hidden">
              {(
                [
                  ["PHOTOS",   String(counts.photo   || 0).padStart(2, "0")],
                  ["VIDEOS",   String(counts.video   || 0).padStart(2, "0")],
                  ["ARTICLES", String(counts.article || 0).padStart(2, "0")],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="bg-surface px-5 py-4 text-center">
                  <div className="font-mono text-[40px] text-fg leading-none tabular-nums font-semibold">{v}</div>
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-fg3 mt-2">{k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky filter bar */}
      <div ref={sentinelRef} aria-hidden="true" />
      <div className="sticky z-30" style={{ top: 64 }}>
        <div
          className="transition-all duration-200"
          style={{
            background: stuck ? "rgba(7,9,15,0.78)" : "transparent",
            backdropFilter: stuck ? "blur(12px)" : "none",
            WebkitBackdropFilter: stuck ? "blur(12px)" : "none",
            borderBottom: stuck ? "1px solid rgba(0,229,255,0.12)" : "1px solid transparent",
          }}
        >
          <div className="max-w-[1480px] mx-auto px-6 lg:px-12 py-3.5 flex items-center gap-4 flex-wrap">
            <div className="hidden md:flex items-center" title="Media Type">
              <Filter size={14} className="text-cyan2" />
            </div>
            <KindFilters value={filter} onChange={setFilter} counts={counts} />
            <div className="flex-1" />
            <div className="hidden md:flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em]">
              <span className="led-pulse" style={{
                display: "inline-block", width: 7, height: 7, borderRadius: 999,
                background: "#22c55e", boxShadow: "0 0 0 1px #22c55e33, 0 0 8px #22c55eaa",
              }} />
              <span className="text-fg2">{String(filtered.length).padStart(2, "0")} matched</span>
              <span className="text-fg3">/ {String(items.length).padStart(2, "0")} total</span>
            </div>
            {canEdit && (
              <button onClick={() => setIsUploadOpen(true)} className="btn btn-primary btn-sm">
                <Plus size={13} />
                Add Media
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Masonry grid */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 pt-10 pb-16">
        {filtered.length === 0 ? (
          <EmptyGallery onClear={() => setFilter("all")} />
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
            {filtered.map((item) => (
              <GalleryCard
                key={item.id}
                item={item}
                onOpen={openLightbox}
                canEdit={canEdit}
                onEdit={(i) => setEditItem(i)}
              />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="mt-10 flex items-center justify-between border-t border-edge pt-6">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg3">
              SHOWING {String(filtered.length).padStart(2, "0")} OF {String(items.length).padStart(2, "0")}
            </span>
          </div>
        )}
      </section>

      {/* Lightbox */}
      <Lightbox
        items={filtered}
        index={lbIndex}
        onClose={() => setLbIndex(null)}
        onNav={nav}
        canEdit={canEdit}
        onEdit={(i) => { setLbIndex(null); setEditItem(i); }}
      />

      {/* Upload / Edit modal */}
      <GalleryUploadModal
        isOpen={isUploadOpen || !!editItem}
        onClose={() => { setIsUploadOpen(false); setEditItem(null); }}
        editItem={editItem}
        onSuccess={() => { setLbIndex(null); router.refresh(); }}
      />
    </div>
  );
}
