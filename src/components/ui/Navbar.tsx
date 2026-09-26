"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Menu,
  X,
  ArrowRight,
  Bell,
  BellOff,
  ChevronDown,
  Settings,
  LogOut,
  Users,
  Package,
  FolderOpen,
  Mail,
  Boxes,
  ClipboardList,
  GitPullRequest,
  CalendarDays,
} from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { formatNotificationTime, getNotificationHref } from "@/lib/notifications";
import { Tables } from "@/types/database";

// SSR-safe layout effect
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ---- Public center nav links ----
const PUBLIC_NAV = [
  { key: "gallery",      href: "/gallery",       label: "Gallery" },
  { key: "events",       href: "/events",        label: "Events" },
  { key: "notice-board", href: "/notice-board",  label: "Notice" },
  { key: "innovators",   href: "/innovators",    label: "Our Innovators" },
  { key: "contact",      href: "/contact",       label: "Contact" },
] as const;

// ---- Role display config ----
const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  member:            { label: "MEMBER",    color: "#8b9ab0" },
  president:         { label: "PRESIDENT", color: "#f59e0b" },
  vice_president:    { label: "VP",        color: "#a78bfa" },
  faculty:           { label: "FACULTY",   color: "#00e5ff" },
  project_manager:   { label: "PROJ MGR",  color: "#ec4899" },
  inventory_manager: { label: "INVENTORY", color: "#5eead4" },
  lead_developer:    { label: "LEAD DEV",  color: "#fbbf24" },
  printing_head:     { label: "PRINT",     color: "#f97316" },
  social_media_head: { label: "SOCIAL HD", color: "#ef4444" },
  social_media_co_head: { label: "SOCIAL CO", color: "#ef4444" },
  sponsorship_head:  { label: "SPONSOR HD", color: "#10b981" },
  workshop_head:     { label: "WORKSHOP",  color: "#6366f1" },
  mechanics_head:    { label: "MECH HD",   color: "#8b5cf6" },
  cad_head:          { label: "CAD HD",    color: "#f97316" },
  electronics_head:  { label: "ELEC HD",   color: "#06b6d4" },
  procurement_head:  { label: "PROCURE",   color: "#14b8a6" },
  makerspace_head:   { label: "MAKER",     color: "#ef4444" },
};

// ---- Notification type → dot color ----
const NOTIF_COLOR: Record<string, string> = {
  inventory_request_received:   "#f59e0b",
  project_request_received:     "#f59e0b",
  project_invite_received:      "#00e5ff",
  equipment_request_approved:   "#22c55e",
  project_request_approved:     "#22c55e",
  equipment_request_rejected:   "#ef4444",
  project_request_rejected:     "#ef4444",
  mom_published:                "#38bdf8",
};

type NotificationRow = Tables<"notifications">;

// =============================================
// CircuitMark — small SVG logo mark
// =============================================
function CircuitMark({ size = 18, show = true }: { size?: number; show?: boolean }) {
  return (
    <span
      className="relative inline-flex items-center justify-center transition-all duration-300 overflow-hidden"
      style={{
        width: show ? size + 10 : 0,
        height: size + 10,
        opacity: show ? 1 : 0,
        transform: show ? "scale(1) translateX(0)" : "scale(0.6) translateX(-6px)",
        marginRight: show ? 2 : 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/vajrax-logo.png" alt="VajraX" width={size + 10} height={size + 10} className="shrink-0 object-contain"
        style={{ filter: "drop-shadow(0 0 10px rgba(0,229,255,0.45))" }} />
    </span>
  );
}

// =============================================
// NavLinks — center nav with sliding underline
// =============================================
const MEMBER_NAV = [
  { key: "projects",  href: "/projects",  label: "Projects" },
  { key: "inventory", href: "/inventory", label: "Inventory" },
] as const;

function NavLinks({
  activeKey,
  isAuthenticated,
  isFaculty,
}: {
  activeKey: string;
  isAuthenticated: boolean;
  isFaculty: boolean;
}) {
  const refs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ x: 0, w: 0, ready: false });

  const measure = useCallback(() => {
    const el = refs.current[activeKey];
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const er = el.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    setBar({ x: er.left - wr.left, w: er.width, ready: true });
  }, [activeKey]);

  useIsomorphicLayoutEffect(() => { measure(); }, [measure]);

  useEffect(() => {
    const ro = new ResizeObserver(() => measure());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const navLink = (l: { key: string; href: string; label: string }) => {
    const isActive = activeKey === l.key;
    return (
      <Link
        key={l.key}
        href={l.href}
        ref={(el) => { refs.current[l.key] = el; }}
        className="relative h-10 px-3.5 text-[13px] font-medium tracking-tight transition-colors duration-150 flex items-center"
        style={{ color: isActive ? "#f0f4ff" : "#8b9ab0" }}
        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#f0f4ff"; }}
        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#8b9ab0"; }}
      >
        {l.key === "projects" && !isFaculty ? "My Projects" : l.label}
      </Link>
    );
  };

  return (
    <div ref={wrapRef} className="relative flex items-center gap-1">
      {PUBLIC_NAV.filter(l => !isAuthenticated || l.key !== "contact").map(navLink)}

      {isAuthenticated && (
        <>
          {/* Divider */}
          <span className="mx-1 h-4 w-px bg-[rgba(0,229,255,0.18)] shrink-0" />
          {MEMBER_NAV.map(navLink)}
        </>
      )}

      {/* Sliding underline indicator */}
      <span
        aria-hidden="true"
        className="absolute -bottom-px h-[2px] rounded-sm pointer-events-none bg-cyan2"
        style={{
          transform: `translateX(${bar.x}px)`,
          width: bar.w,
          opacity: bar.ready ? 1 : 0,
          boxShadow: "0 0 10px rgba(0,229,255,0.85)",
          transition:
            "transform 320ms cubic-bezier(.5,.05,.2,1), width 320ms cubic-bezier(.5,.05,.2,1), opacity 200ms",
        }}
      />
    </div>
  );
}

// =============================================
// BellButton
// =============================================
function BellButton({
  unread,
  active,
  onClick,
}: {
  unread: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="Notifications"
      className="relative grid place-items-center w-9 h-9 rounded-sm border transition-colors duration-150"
      style={{
        background: active ? "rgba(0,229,255,0.08)" : "transparent",
        borderColor: active ? "rgba(0,229,255,0.55)" : "rgba(0,229,255,0.12)",
        color: active ? "#00e5ff" : "#8b9ab0",
        boxShadow: active ? "0 0 14px -2px rgba(0,229,255,0.45)" : "none",
      }}
    >
      <Bell size={15} />
      {unread > 0 && (
        <span
          className="absolute -top-1 -right-1 grid place-items-center min-w-[16px] h-[16px] px-1 rounded-sm font-mono text-[9.5px] font-semibold tabular-nums"
          style={{
            background: "#f59e0b",
            color: "#0d1117",
            boxShadow: "0 0 0 1.5px #0d1117, 0 0 8px rgba(245,158,11,0.7)",
          }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

// =============================================
// UserChip + UserMenu dropdown
// =============================================
function UserMenu({
  open,
  name,
  role,
  initials,
  profileHref,
  isFaculty,
  onClose,
  onSignOut,
}: {
  open: boolean;
  name: string;
  role: string;
  initials: string;
  profileHref: string;
  isFaculty: boolean;
  onClose: () => void;
  onSignOut: () => void;
}) {
  if (!open) return null;
  const roleInfo = ROLE_DISPLAY[role] ?? ROLE_DISPLAY.member;

  const memberLinks = [
    { href: "/projects",       icon: FolderOpen,    label: isFaculty ? "Projects" : "My Projects" },
    { href: "/inventory",      icon: Boxes,         label: "Inventory" },
    { href: "/my-requests",    icon: ClipboardList, label: "My Requests" },
    { href: "/project-invites",icon: GitPullRequest,label: "Project Invites" },
  ];

  return (
    <div
      className="absolute top-[calc(100%+10px)] right-0 z-[95] w-[260px] bg-elevated/95 backdrop-blur-md border border-edgeStrong rounded-md shadow-2xl corner-ticks"
      style={{ animation: "fadeIn 160ms ease-out" }}
    >
      <span className="ct-tr" /><span className="ct-bl" />

      {/* Profile header */}
      <div className="px-4 py-3.5 border-b border-edge">
        <div className="flex items-center gap-2.5">
          <span
            className="relative grid place-items-center w-9 h-9 rounded-full font-mono text-[11px] shrink-0"
            style={{ background: "rgba(0,229,255,0.10)", border: "1px solid rgba(0,229,255,0.45)", color: "#00e5ff" }}
          >
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
              style={{ background: "#22c55e", boxShadow: "0 0 0 1.5px #111820, 0 0 6px #22c55e" }} />
          </span>
          <div className="min-w-0">
            <div className="text-fg text-[13px] font-medium tracking-tight truncate">{name}</div>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: roleInfo.color }}>
              {roleInfo.label}
            </span>
          </div>
        </div>
        <Link
          href={profileHref}
          onClick={onClose}
          className="mt-2.5 flex items-center gap-1.5 h-8 px-3 w-full rounded-sm border border-edge text-fg2 hover:text-fg hover:border-cyan2/35 transition-colors font-mono text-[10.5px] uppercase tracking-[0.14em]"
        >
          <Settings size={12} /> View Profile
        </Link>
      </div>

      {/* Member workspace links */}
      <div className="py-1.5">
        <div className="px-4 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-fg3">
          // workspace
        </div>
        {memberLinks.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className="flex items-center gap-3 h-10 px-4 text-fg2 hover:text-fg hover:bg-cyan2/[0.05] transition-colors"
          >
            <Icon size={14} className="shrink-0 text-fg3" />
            <span className="text-[13px] tracking-tight">{label}</span>
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <div className="border-t border-edge py-1.5">
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 h-10 px-4 w-full text-fg2 hover:text-danger hover:bg-danger/[0.05] transition-colors"
        >
          <LogOut size={14} className="shrink-0" />
          <span className="text-[13px] tracking-tight">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function UserChip({
  name,
  role,
  initials,
  open,
  onClick,
}: {
  name: string;
  role: string;
  initials: string;
  open: boolean;
  onClick: () => void;
}) {
  const roleInfo = ROLE_DISPLAY[role] ?? ROLE_DISPLAY.member;
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2.5 h-9 pl-1 pr-3 rounded-sm border transition-colors duration-150"
      style={{
        borderColor: open ? "rgba(0,229,255,0.45)" : "rgba(0,229,255,0.12)",
        background: open ? "rgba(0,229,255,0.06)" : "transparent",
      }}
    >
      <span
        className="relative grid place-items-center w-7 h-7 rounded-full font-mono text-[10.5px] tracking-wider shrink-0"
        style={{
          background: "rgba(0,229,255,0.10)",
          border: "1px solid rgba(0,229,255,0.45)",
          color: "#00e5ff",
        }}
      >
        {initials}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
          style={{ background: "#22c55e", boxShadow: "0 0 0 1.5px #0d1117, 0 0 6px #22c55e" }}
        />
      </span>
      <div className="hidden sm:flex flex-col items-start leading-none">
        <span className="text-fg text-[12.5px] font-medium tracking-tight">{name}</span>
        <span
          className="font-mono text-[9px] uppercase tracking-[0.18em] mt-1"
          style={{ color: roleInfo.color }}
        >
          {roleInfo.label}
        </span>
      </div>
      <ChevronDown
        size={12}
        className="text-fg3 ml-0.5 transition-transform duration-200"
        style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
      />
    </button>
  );
}

// =============================================
// NotificationItem
// =============================================
function NotificationItem({
  notification,
  onClick,
}: {
  notification: NotificationRow;
  onClick: () => void;
}) {
  const dotColor = NOTIF_COLOR[notification.type] ?? "#00e5ff";
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3 text-left border-b border-edge last:border-0 transition-colors duration-150"
      style={{ background: notification.is_read ? "transparent" : "rgba(0,229,255,0.025)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.04)"; }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = notification.is_read
          ? "transparent"
          : "rgba(0,229,255,0.025)";
      }}
    >
      <span
        className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: notification.is_read ? "transparent" : dotColor,
          boxShadow: notification.is_read ? "none" : `0 0 0 1.5px ${dotColor}55`,
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-fg text-[13px] leading-snug text-left">{notification.message}</p>
        <p className="font-mono text-[10px] text-fg3 mt-1 tracking-[0.08em]">
          {formatNotificationTime(notification.created_at)}
        </p>
      </div>
    </button>
  );
}

// =============================================
// NotificationDropdown
// =============================================
function NotificationDropdown({
  open,
  notifications,
  unreadCount,
  loading,
  onMarkAll,
  onItemClick,
}: {
  open: boolean;
  notifications: NotificationRow[];
  unreadCount: number;
  loading: boolean;
  onMarkAll: () => void;
  onItemClick: (n: NotificationRow) => void;
}) {
  if (!open) return null;
  return (
    <div
      className="absolute top-[calc(100%+10px)] right-0 z-[95] w-[380px] max-w-[calc(100vw-2rem)] bg-elevated/95 backdrop-blur-md border border-edgeStrong rounded-md shadow-2xl corner-ticks"
      style={{ animation: "fadeIn 160ms ease-out" }}
    >
      <span className="ct-tr" />
      <span className="ct-bl" />
      {/* Header */}
      <div className="px-4 h-11 flex items-center justify-between border-b border-edge">
        <div className="flex items-center gap-2.5">
          <Bell size={13} className="text-cyan2" />
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              className="font-mono text-[10px] text-cyan2 px-1.5 h-4 grid place-items-center rounded-sm"
              style={{
                border: "1px solid rgba(0,229,255,0.45)",
                background: "rgba(0,229,255,0.10)",
              }}
            >
              {unreadCount} NEW
            </span>
          )}
        </div>
        <button
          onClick={onMarkAll}
          disabled={unreadCount === 0}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg2 hover:text-cyan2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          mark all read
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span
              className="w-5 h-5 rounded-full border-t border-cyan2 spin-fast"
              style={{ border: "1px solid rgba(0,229,255,0.25)", borderTopColor: "#00e5ff" }}
            />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 px-6">
            <div className="mx-auto w-11 h-11 grid place-items-center border border-edge rounded-md text-fg3 mb-3 bg-base">
              <BellOff size={18} />
            </div>
            <div className="text-fg font-semibold text-[14px] tracking-tight">
              No notifications yet
            </div>
            <div className="text-fg2 text-[12px] mt-1.5 max-w-[32ch] mx-auto leading-relaxed">
              Project invites and request decisions will appear here.
            </div>
          </div>
        ) : (
          notifications.slice(0, 10).map((n) => (
            <NotificationItem key={n.id} notification={n} onClick={() => onItemClick(n)} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 h-10 flex items-center justify-between border-t border-edge bg-base/40">
        <span className="font-mono text-[10px] text-fg3">// recent activity</span>
        <Link
          href="/notifications"
          className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-cyan2 hover:text-fg flex items-center gap-1.5 transition-colors"
        >
          View all <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}

// =============================================
// MobilePublicDropdown
// =============================================
function MobilePublicDropdown({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [activeBubble, setActiveBubble] = useState<string | null>(null);
  const [renderOpen, setRenderOpen] = useState(open);
  const [showElements, setShowElements] = useState(open);

  useEffect(() => {
    if (open) {
      setRenderOpen(true);
      // Wait for mount, then trigger transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShowElements(true);
        });
      });
    } else {
      setActiveBubble(null);
      setShowElements(false);
      const t = setTimeout(() => setRenderOpen(false), 400);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!renderOpen) return null;

  const items = [
    { key: "gallery",      label: "Gallery",        href: "/gallery",       icon: "/gallery-svgrepo-com.svg" },
    { key: "events",       label: "Events",          href: "/events",        icon: "/calendar-svgrepo-com.svg" },
    { key: "notice-board", label: "Notice",          href: "/notice-board",  icon: "/notice.svg" },
    { key: "innovators",   label: "Our Innovators",  href: "/innovators",    icon: "/users-svgrepo-com.svg" },
    { key: "contact",      label: "Contact",          href: "/contact",       icon: "/contact-svgrepo-com.svg" },
  ];


  return (
    <div className="fixed inset-0 z-[70] md:hidden">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 cursor-pointer transition-opacity duration-300 ${
          showElements ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: "rgba(7,9,15,0.85)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />
      {/* Dropdown Container */}
      <div 
        className="absolute top-[64px] right-4 p-2 flex flex-col items-end gap-3 pointer-events-none"
      >
        {items.map((item, i) => {
          const isActive = activeBubble === item.key;
          const delay = showElements ? i * 75 : (items.length - 1 - i) * 75;
          return (
            <div 
              key={item.key}
              className={`relative flex justify-center items-center font-bold pointer-events-auto transition-all duration-300 ease-out ${
                showElements ? "translate-x-0 opacity-100" : "translate-x-12 opacity-0"
              }`}
              style={{ transitionDelay: `${delay}ms` }}
              onClick={(e) => {
                e.stopPropagation();
                if (isActive) {
                  router.push(item.href);
                  onClose();
                } else {
                  setActiveBubble(item.key);
                }
              }}
            >
              {/* Icon bubble */}
              <div
                className={`shadow-md flex items-center p-3.5 rounded-full cursor-pointer duration-300 transition-all ${
                  isActive 
                    ? "bg-[rgba(0,229,255,0.10)] border border-cyan2/50 gap-2 shadow-[0_0_20px_rgba(0,229,255,0.15)]" 
                    : "bg-[#0d1117] border border-edge gap-0 hover:border-cyan2/30"
                }`}
              >
                <img 
                  src={item.icon} 
                  alt={item.label} 
                  className="w-[22px] h-[22px] object-contain shrink-0"
                  style={{ 
                    filter: isActive 
                      ? "brightness(0) saturate(100%) invert(77%) sepia(87%) saturate(2975%) hue-rotate(137deg) brightness(101%) contrast(106%)" 
                      : "invert(1) opacity(0.7)",
                    transition: "filter 0.3s ease" 
                  }} 
                />
                <span 
                  className={`duration-300 whitespace-nowrap overflow-hidden transition-all ${
                    isActive 
                      ? "text-[14px] text-cyan2 max-w-[150px] opacity-100" 
                      : "text-[0px] max-w-0 opacity-0"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================
// MobileDrawer
// =============================================
function MobileDrawer({
  open,
  onClose,
  isAuthenticated,
  profile,
  user,
  unreadCount,
  isFaculty,
  isModerator,
  isInventoryManager,
  pathname,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  profile: Tables<"profiles"> | null;
  user: { id: string; email?: string } | null;
  unreadCount: number;
  isFaculty: boolean;
  isModerator: boolean;
  isInventoryManager: boolean;
  pathname: string;
  onSignOut: () => void;
}) {
  if (!open) return null;

  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";
  const primaryRole = profile?.roles && profile.roles.length > 0 ? profile.roles[0] : profile?.role ?? "member";
  const roleInfo = ROLE_DISPLAY[primaryRole] ?? ROLE_DISPLAY.member;

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 cursor-pointer"
        style={{ background: "rgba(7,9,15,0.85)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div
        className="absolute right-0 top-0 bottom-0 w-[min(380px,100vw)] bg-surface border-l border-edge flex flex-col"
        style={{ animation: "slideIn 220ms cubic-bezier(.4,0,.2,1)" }}
      >
        {/* Header */}
        <div
          className="h-14 px-4 flex items-center justify-between border-b border-edge shrink-0"
          style={{ background: "rgba(7,9,15,0.6)" }}
        >
          <div className="flex items-center">
            <img 
              src="/White-WordMark-vajrax.png" 
              alt="VajraX"
              className="h-5 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
            />
          </div>
          <div className="flex items-center justify-center relative cursor-pointer w-9 h-9" onClick={onClose}>
            <input
              type="checkbox"
              id="drawer-label-check"
              className="label-check"
              checked={open}
              readOnly
            />
            <label htmlFor="drawer-label-check" className="hamburger-label !m-0 pointer-events-none" style={{ transform: "scale(0.35)", transformOrigin: "center" }}>
              <div className="line1"></div>
              <div className="line2"></div>
              <div className="line3"></div>
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* User card */}
          {isAuthenticated && profile && (
            <div className="m-4 mb-2 border border-edge rounded-md bg-elevated corner-ticks relative p-4">
              <span className="ct-tr" />
              <span className="ct-bl" />
              <div className="flex items-center gap-3">
                <span
                  className="relative grid place-items-center w-11 h-11 rounded-full font-mono text-[13px] shrink-0"
                  style={{
                    background: "rgba(0,229,255,0.10)",
                    border: "1px solid rgba(0,229,255,0.45)",
                    color: "#00e5ff",
                  }}
                >
                  {initials}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                    style={{ background: "#22c55e", boxShadow: "0 0 0 2px #111820, 0 0 8px #22c55e" }}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-fg text-[15px] font-semibold tracking-tight truncate">
                    {profile.display_name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="font-mono text-[9.5px] uppercase tracking-[0.14em] px-1.5 h-[18px] inline-flex items-center border rounded-sm"
                      style={{
                        color: roleInfo.color,
                        borderColor: `${roleInfo.color}70`,
                        background: `${roleInfo.color}18`,
                      }}
                    >
                      {roleInfo.label}
                    </span>
                    <span className="font-mono text-[10px] text-fg3 tracking-[0.08em] truncate">
                      {user?.email}
                    </span>
                  </div>
                </div>
                {user?.id && (
                  <Link
                    href={`/profile/${user.id}`}
                    onClick={onClose}
                    className="grid place-items-center w-8 h-8 border border-edge rounded-sm text-fg2 hover:text-fg transition-colors shrink-0"
                  >
                    <Settings size={14} />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Primary nav */}
          <div className="px-4 pt-2 pb-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg3 px-2 py-2">
              // navigation
            </div>
            {PUBLIC_NAV.map((l, i) => {
              const isActive = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.key}
                  href={l.href}
                  onClick={onClose}
                  className="group flex items-center justify-between h-12 px-3 rounded-sm hover:bg-cyan2/[0.06] border-b border-edge last:border-0 transition-colors"
                  style={{ color: isActive ? "#00e5ff" : "#f0f4ff" }}
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[10.5px] text-fg3 w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[15px] font-medium tracking-tight">{l.label}</span>
                  </span>
                  <ArrowRight
                    size={14}
                    style={{ color: isActive ? "#00e5ff" : "#4a5568" }}
                    className="group-hover:text-cyan2 transition-colors"
                  />
                </Link>
              );
            })}
          </div>

          {/* Authenticated account links */}
          {isAuthenticated && (
            <div className="px-4 pt-1 pb-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg3 px-2 py-2">
                // my account
              </div>
              {[
                { href: "/projects", label: isFaculty ? "Projects" : "My Projects" },
                { href: "/inventory", label: "Inventory" },
                { href: "/my-requests", label: "My Requests" },
                { href: "/project-invites", label: "Project Invites" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={onClose}
                  className="flex items-center h-11 px-3 rounded-sm hover:bg-cyan2/[0.06] text-fg2 hover:text-fg transition-colors"
                >
                  <span className="text-[13.5px] tracking-tight">{l.label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Admin links */}
          {isAuthenticated && (isFaculty || isModerator || isInventoryManager) && (
            <div className="px-4 pt-1 pb-2">
              <div className="flex items-center gap-2 px-2 py-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg3">
                  // admin
                </span>
                <span className="flex-1 h-px bg-edge" />
              </div>
              {(isFaculty || isModerator) && (
                <Link
                  href="/admin/events"
                  onClick={onClose}
                  className="flex items-center gap-3 h-11 px-3 rounded-sm hover:bg-[rgba(251,191,36,0.06)] text-fg2 hover:text-fg transition-colors"
                >
                  <CalendarDays size={14} className="shrink-0" style={{ color: "rgba(251,191,36,0.85)" }} />
                  <span className="text-[13.5px] tracking-tight">Events Management</span>
                </Link>
              )}
              {(isFaculty || isModerator) && (
                <Link
                  href="/admin/members"
                  onClick={onClose}
                  className="flex items-center gap-3 h-11 px-3 rounded-sm hover:bg-[rgba(251,191,36,0.06)] text-fg2 hover:text-fg transition-colors"
                >
                  <Users size={14} className="shrink-0" style={{ color: "rgba(251,191,36,0.85)" }} />
                  <span className="text-[13.5px] tracking-tight">Members Management</span>
                </Link>
              )}
              {(isFaculty || isModerator) && (
                <Link
                  href="/admin/applicants"
                  onClick={onClose}
                  className="flex items-center gap-3 h-11 px-3 rounded-sm hover:bg-[rgba(251,191,36,0.06)] text-fg2 hover:text-fg transition-colors"
                >
                  <Mail size={14} className="shrink-0" style={{ color: "rgba(251,191,36,0.85)" }} />
                  <span className="text-[13.5px] tracking-tight">New Applicants</span>
                </Link>
              )}
              <Link
                href="/admin/requests"
                onClick={onClose}
                className="flex items-center gap-3 h-11 px-3 rounded-sm hover:bg-[rgba(251,191,36,0.06)] text-fg2 hover:text-fg transition-colors"
              >
                <Package size={14} className="shrink-0" style={{ color: "rgba(251,191,36,0.85)" }} />
                <span className="text-[13.5px] tracking-tight">Inventory Management</span>
              </Link>
              {(isFaculty || isModerator) && (
                <Link
                  href="/admin/project-requests"
                  onClick={onClose}
                  className="flex items-center gap-3 h-11 px-3 rounded-sm hover:bg-[rgba(251,191,36,0.06)] text-fg2 hover:text-fg transition-colors"
                >
                  <FolderOpen size={14} className="shrink-0" style={{ color: "rgba(251,191,36,0.85)" }} />
                  <span className="text-[13.5px] tracking-tight">Project Requests</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-edge p-4 shrink-0" style={{ background: "rgba(7,9,15,0.4)" }}>
          {!isAuthenticated ? (
            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-md font-medium text-[14px] transition-colors"
              style={{ background: "#00e5ff", color: "#07090f", border: "1px solid #00e5ff" }}
            >
              Sign in <ArrowRight size={14} />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Link
                  href="/notifications"
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 h-9 rounded-sm border text-[13px] font-medium transition-colors"
                  style={{ borderColor: "rgba(0,229,255,0.55)", color: "#00e5ff" }}
                >
                  <Bell size={13} /> Inbox · {unreadCount}
                </Link>
              )}
              <button
                onClick={onSignOut}
                className="flex items-center gap-2 h-9 px-3 rounded-sm border border-edge text-fg2 hover:text-danger hover:border-danger/55 transition-colors text-[13px]"
              >
                <LogOut size={13} /> Log out
              </button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.18em] text-fg3">
            <span>v0.4.2</span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full led-pulse"
                style={{ background: "#22c55e", color: "#22c55e" }}
              />
              SYSTEMS NOMINAL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Main Navbar export
// =============================================
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const {
    user,
    profile,
    loading,
    isAuthenticated,
    signOut,
    isFaculty,
    isModerator,
    isInventoryManager,
  } = useUser();
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Scroll detection
  useEffect(() => {
    let frameId = 0;
    const update = () => { frameId = 0; setIsScrolled(window.scrollY > 20); };
    const onScroll = () => { if (frameId) return; frameId = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    setNotifLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!error && data) setNotifications(data);
    setNotifLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    const t = setTimeout(() => void fetchNotifications(), 0);
    return () => clearTimeout(t);
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void fetchNotifications()
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [fetchNotifications, supabase, user]);

  // Close notification panel on outside click
  useEffect(() => {
    if (!isNotifOpen) return;
    const onDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isNotifOpen]);

  // Close user menu on outside click
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isUserMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
    setIsMobileOpen(false);
    window.location.href = "/";
  };

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    setNotifications((cur) => cur.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  };

  const handleNotifClick = async (notification: NotificationRow) => {
    setNotifications((cur) =>
      cur.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
    );
    setIsNotifOpen(false);
    await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
    const href = getNotificationHref(notification.type, notification.related_entity_id);
    if (href && href !== "/") router.push(href);
  };

  // Active link key from pathname
  const activeKey = useMemo(() => {
    if (pathname.startsWith("/projects"))  return "projects";
    if (pathname.startsWith("/inventory")) return "inventory";
    if (pathname.startsWith("/gallery"))   return "gallery";
    if (pathname.startsWith("/events"))    return "events";
    if (pathname.startsWith("/innovators"))return "innovators";
    if (pathname.startsWith("/contact"))   return "contact";
    if (pathname.startsWith("/notice-board")) return "notice-board";
    return "";
  }, [pathname]);

  // User initials
  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "??";

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-[80] pointer-events-none"
        style={{ height: 64 }}
      >
        <div
          className="pointer-events-auto mx-auto flex items-center"
          style={{
            height: 56,
            marginTop: isScrolled ? 8 : 4,
            maxWidth: isScrolled ? 1024 : "100%",
            paddingLeft: isScrolled ? 16 : 24,
            paddingRight: isScrolled ? 16 : 24,
            background: isScrolled ? "rgba(13,17,23,0.78)" : "transparent",
            border: isScrolled
              ? "1px solid rgba(0,229,255,0.20)"
              : "1px solid transparent",
            borderRadius: isScrolled ? 999 : 0,
            boxShadow: isScrolled
              ? "0 8px 24px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,229,255,0.04), 0 0 24px -8px rgba(0,229,255,0.25)"
              : "none",
            backdropFilter: isScrolled ? "blur(12px)" : "none",
            WebkitBackdropFilter: isScrolled ? "blur(12px)" : "none",
            transition:
              "max-width 320ms cubic-bezier(.5,.05,.2,1), margin-top 280ms ease, background 240ms ease, border-color 240ms ease, border-radius 240ms ease, box-shadow 240ms ease, padding 240ms ease",
          }}
        >
          {/* Left: Logo */}
          <Link href="/" className="flex items-center min-w-0 shrink-0" aria-label="VajraX home">
            <img 
              src="/White-WordMark-vajrax.png" 
              alt="VajraX"
              className="h-[22px] md:h-6 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
            />
          </Link>

          {/* Center: Desktop nav links */}
          <div className="hidden md:flex flex-1 items-center justify-center">
            <NavLinks activeKey={activeKey} isAuthenticated={isAuthenticated} isFaculty={isFaculty} />
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Desktop right */}
            <div className="hidden md:flex items-center gap-2 relative" ref={notifRef}>
              {loading ? (
                <span className="w-7 h-7 rounded-full bg-surface animate-pulse" />
              ) : isAuthenticated && profile ? (
                <>
                  <BellButton
                    unread={unreadCount}
                    active={isNotifOpen}
                    onClick={() => { setIsNotifOpen((o) => !o); setIsUserMenuOpen(false); }}
                  />
                  <div className="relative" ref={userMenuRef}>
                    <UserChip
                      name={profile.display_name ?? "Member"}
                      role={profile.role ?? "member"}
                      initials={initials}
                      open={isUserMenuOpen}
                      onClick={() => { setIsUserMenuOpen((o) => !o); setIsNotifOpen(false); }}
                    />
                    <UserMenu
                      open={isUserMenuOpen}
                      name={profile.display_name ?? "Member"}
                      role={profile.role ?? "member"}
                      initials={initials}
                      profileHref={user?.id ? `/profile/${user.id}` : "/profile"}
                      isFaculty={isFaculty}
                      onClose={() => setIsUserMenuOpen(false)}
                      onSignOut={handleSignOut}
                    />
                  </div>
                  <NotificationDropdown
                    open={isNotifOpen}
                    notifications={notifications}
                    unreadCount={unreadCount}
                    loading={notifLoading}
                    onMarkAll={markAllRead}
                    onItemClick={handleNotifClick}
                  />
                </>
              ) : !loading ? (
                <>
                  <Link
                    href="/login"
                    className="hidden lg:inline-flex items-center font-mono text-[11px] uppercase tracking-[0.14em] text-fg2 hover:text-fg h-9 px-3 transition-colors"
                  >
                    log&nbsp;in
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 h-7 px-3 font-mono text-[11px] uppercase tracking-[0.14em] rounded-sm border transition-colors duration-150 hover:bg-[#00c7e0]"
                    style={{
                      background: "#00e5ff",
                      color: "#07090f",
                      borderColor: "#00e5ff",
                    }}
                  >
                    Sign in <ArrowRight size={11} />
                  </Link>
                </>
              ) : null}
            </div>

            {/* Mobile hamburger */}
            <div className="md:hidden flex items-center justify-center relative cursor-pointer w-10 h-10">
              <input
                type="checkbox"
                id="label-check"
                className={`label-check ${!isAuthenticated ? "arrow-mode" : ""}`}
                checked={isMobileOpen}
                onChange={(e) => setIsMobileOpen(e.target.checked)}
              />
              <label htmlFor="label-check" className="hamburger-label !m-0 cursor-pointer" style={{ transform: "scale(0.35)", transformOrigin: "center" }}>
                <div className="line1"></div>
                <div className="line2"></div>
                <div className="line3"></div>
              </label>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer / dropdown */}
      {isAuthenticated ? (
        <MobileDrawer
          open={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
          isAuthenticated={isAuthenticated}
          profile={profile}
          user={user}
          unreadCount={unreadCount}
          isFaculty={isFaculty}
          isModerator={isModerator}
          isInventoryManager={isInventoryManager}
          pathname={pathname}
          onSignOut={handleSignOut}
        />
      ) : (
        <MobilePublicDropdown
          open={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
