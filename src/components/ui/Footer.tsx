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
  Linkedin,
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
  brandClass,
}: {
  icon: LucideIcon;
  href: string;
  label: string;
  brandClass: string;
}) {
  const isExternal = href.startsWith("http");
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={`socialContainer ${brandClass} w-11 h-11 rounded-sm border border-edge text-fg2 hover:text-white transition-all duration-300 group`}
    >
      <Icon size={18} className="socialSvg" />
    </a>
  );
}



// =============================================
// Footer
// =============================================
export default function Footer() {
  const { isAuthenticated, isFaculty } = useUser();
  return (
    <footer className="relative z-20 bg-base" style={{ borderTop: "1px solid rgba(0,229,255,0.08)" }}>
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
            <Link href="/" className="inline-flex items-center shrink-0">
              <img 
                src="/White-WordMark-vajrax.png" 
                alt="VajraX"
                className="h-8 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
              />
            </Link>

            <div className="mt-4 font-mono text-[12px] uppercase tracking-[0.18em] text-[#00e5ff]">
              Design. Build. Dominate.
            </div>

            <p className="text-fg2 text-[13.5px] mt-2.5 leading-relaxed max-w-[42ch]">
              That’s not just a tagline, it’s our anthem, our definition.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <SocialButton icon={GithubIcon}    label="GitHub"    href="https://github.com/VajraX-NST-BLR" brandClass="containerGithub" />
              <SocialButton icon={TwitterIcon}   label="Twitter"   href="#" /* TODO: Replace with real Twitter URL */ brandClass="containerTwitter" />
              <SocialButton icon={InstagramIcon} label="Instagram" href="https://www.instagram.com/vajraxclub/" brandClass="containerInstagram" />
              <SocialButton icon={Linkedin}      label="LinkedIn"  href="https://www.linkedin.com/company/vajrax-club/" brandClass="containerLinkedin" />
              <SocialButton icon={Mail}          label="Email"     href="mailto:vajrax2025@gmail.com" brandClass="containerEmail" />
            </div>

          </div>

          {/* Footer Nav Links */}
          <div className="md:col-span-8 grid grid-cols-3 gap-6 md:gap-8">
            {/* COL 2 — Platform */}
            <div>
              <FooterCol heading="Platform">
                <ul className="space-y-2.5">
                  {isAuthenticated && <li><FLink href="/projects"   icon={FolderGit2}>{isFaculty ? "Projects" : "My Projects"}</FLink></li>}
                  {isAuthenticated && <li><FLink href="/inventory"    icon={Package}>Inventory</FLink></li>}
                  <li><FLink href="/gallery"    icon={ImageIcon}>Gallery</FLink></li>
                  <li><FLink href="/events"     icon={CalendarRange}>Events</FLink></li>
                  <li><FLink href="/innovators" icon={UserPlus}>Innovators</FLink></li>
                </ul>
              </FooterCol>
            </div>

            {/* COL 3 — Club */}
            <div>
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
            <div>
              <FooterCol heading="Legal">
                <ul className="space-y-2.5">
                  <li><FLink href="/privacy" icon={Info}>Privacy</FLink></li>
                  <li><FLink href="/terms"   icon={Info}>Terms</FLink></li>
                </ul>
              </FooterCol>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
