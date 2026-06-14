"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  GithubIcon,
  TwitterIcon,
  InstagramIcon,
  Mail,
  FolderGit2,
  Image as ImageIcon,
  CalendarRange,
  Info,
  MessageSquare,
  UserPlus,
  ArrowUpRight,
  Package,
  ClipboardList,
  GitPullRequest,
} from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";

// ---- CircuitMark (same SVG as Navbar) ----
function CircuitMark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size + 10, height: size + 10 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/vajrax-logo.png" alt="VajraX" width={size + 10} height={size + 10} className="shrink-0 object-contain"
        style={{ filter: "drop-shadow(0 0 10px rgba(0,229,255,0.45))" }} />
    </span>
  );
}

// ---- Column heading with trailing rule ----
function FooterCol({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-fg3 leading-none whitespace-nowrap">
          {heading}
        </span>
        <span className="flex-1 h-px bg-edge" />
      </div>
      {children}
    </div>
  );
}

// ---- Footer nav link ----
function FLink({
  href,
  external,
  icon: Icon,
  children,
}: {
  href: string;
  external?: boolean;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  const className =
    "group inline-flex items-center gap-1.5 text-[13.5px] text-fg2 hover:text-cyan2 transition-colors duration-150 tracking-tight";

  const inner = (
    <>
      {Icon && <Icon size={12} className="text-fg3 shrink-0" />}
      <span className="group-hover:[text-shadow:0_0_8px_rgba(0,229,255,0.7)] transition-[text-shadow] duration-200">
        {children}
      </span>
      {external && (
        <ArrowUpRight
          size={11}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        />
      )}
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

// ---- Social icon button ----
function SocialButton({
  icon: Icon,
  href,
  label,
}: {
  icon: LucideIcon;
  href: string;
  label: string;
}) {
  const isExternal = href.startsWith("http");
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="group relative grid place-items-center w-10 h-10 rounded-sm border border-edge text-fg2 hover:text-cyan2 hover:border-cyan2/50 transition-colors duration-150"
    >
      <Icon size={18} />
      <span
        className="absolute inset-0 pointer-events-none rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ boxShadow: "0 0 14px -3px rgba(0,229,255,0.55) inset" }}
      />
    </a>
  );
}


// ---- Live UTC clock (isolated so hydration stays clean) ----
function FooterClock() {
  const [time, setTime] = useState("00:00:00");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", { hour12: false, timeZone: "UTC" })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-fg2 tabular-nums">{time} UTC</span>;
}

// =============================================
// Footer
// =============================================
export default function Footer() {
  const { isAuthenticated, isFaculty } = useUser();
  return (
    <footer className="relative bg-base" style={{ borderTop: "1px solid rgba(0,229,255,0.08)" }}>
      {/* Top cyan trace gradient */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.4) 50%, transparent 100%)",
        }}
      />

      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 py-14">
        {/* 12-col grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          {/* COL 1 — Brand */}
          <div className="md:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <CircuitMark size={22} />
              <span className="font-sans font-extrabold text-fg text-[22px] tracking-tight leading-none">
                Vajra<span style={{ color: "#00e5ff" }}>X</span>
              </span>
            </Link>

            <p className="text-fg2 text-[13.5px] mt-4 leading-relaxed max-w-[42ch]">
              A workshop console for student robotics clubs — inventory, projects, scrimmage prep,
              and the people building it all.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <SocialButton icon={GithubIcon}    label="GitHub"    href="https://github.com/VajraX-NST-BLR" />
              <SocialButton icon={TwitterIcon}   label="Twitter"   href="#" />
              <SocialButton icon={InstagramIcon} label="Instagram" href="#" />
              <SocialButton icon={Mail}          label="Email"     href="mailto:vajrax@college.edu" />
            </div>

          </div>

          {/* COL 2 — Platform */}
          <div className="md:col-span-3">
            <FooterCol heading="Platform">
              <ul className="space-y-2.5">
                <li><FLink href="/projects"   icon={FolderGit2}>{isFaculty ? "Projects" : "My Projects"}</FLink></li>
                {isAuthenticated && <li><FLink href="/inventory"    icon={Package}>Inventory</FLink></li>}
                <li><FLink href="/gallery"    icon={ImageIcon}>Gallery</FLink></li>
                <li><FLink href="/events"     icon={CalendarRange}>Events</FLink></li>
                <li><FLink href="/innovators" icon={UserPlus}>Innovators</FLink></li>
              </ul>
            </FooterCol>
          </div>

          {/* COL 3 — Club */}
          <div className="md:col-span-3">
            <FooterCol heading="Club">
              <ul className="space-y-2.5">
                <li><FLink href="/#about"  icon={Info}>About</FLink></li>
                <li><FLink href="/contact" icon={MessageSquare}>Contact</FLink></li>
                {isAuthenticated ? (
                  <>
                    <li><FLink href="/my-requests"     icon={ClipboardList}>My Requests</FLink></li>
                    <li><FLink href="/project-invites" icon={GitPullRequest}>Project Invites</FLink></li>
                  </>
                ) : (
                  <li><FLink href="/signup" icon={UserPlus} external>Join Us</FLink></li>
                )}
              </ul>
            </FooterCol>
          </div>

          {/* COL 4 — Legal / misc */}
          <div className="md:col-span-2">
            <FooterCol heading="Legal">
              <ul className="space-y-2.5">
                <li><FLink href="/privacy" icon={Info}>Privacy</FLink></li>
                <li><FLink href="/terms"   icon={Info}>Terms</FLink></li>
              </ul>
            </FooterCol>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-edge">
        <div className="max-w-[1480px] mx-auto px-6 lg:px-10 h-14 flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg3">
            <span>© 2026 VajraX Robotics Collective</span>
            <span>·</span>
            <span className="text-fg2">All rights reserved</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg3">
            <span className="hidden md:inline">UPTIME 99.86%</span>
            <span className="hidden md:inline">·</span>
            <FooterClock />
            <span>·</span>
            <span className="hidden sm:inline">
              Built by{" "}
              <a
                href="https://raajpatre.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan2 hover:underline underline-offset-2 transition-colors"
              >
                Raaj Patre
              </a>{" "}
              &amp; the{" "}
              <Link href="/" className="text-fg hover:text-cyan2 transition-colors">
                VajraX collective
              </Link>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
