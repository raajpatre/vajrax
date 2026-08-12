import {
  Mail, MapPin, Clock, GithubIcon, TwitterIcon, InstagramIcon, LinkedinIcon,
  ArrowUpRight, Zap, UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata = {
  title: "Contact — VajraX",
  description: "Get in touch with the VajraX Robotics Club.",
};

// Lab is open Mon–Fri, 06:00–21:00
function isLabOpen(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0=Sun … 6=Sat
  const mins = now.getHours() * 60 + now.getMinutes();
  return day >= 1 && day <= 5 && mins >= 6 * 60 && mins < 21 * 60;
}

// ─── InfoCard ─────────────────────────────────────────────────────────────────

function InfoCard({
  icon: Icon, label, href, children,
}: {
  icon: LucideIcon; label: string; href?: string; children: React.ReactNode;
}) {
  const inner = (
    <>
      <span
        className="shrink-0 grid place-items-center w-11 h-11 rounded-sm border border-[rgba(0,229,255,0.18)] bg-[#07090f]/60 text-[#00e5ff]"
        style={{ boxShadow: "0 0 14px -4px rgba(0,229,255,0.4)" }}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#4a5568] leading-none">{label}</div>
        <div className="mt-1.5 text-[#f0f4ff] text-[14.5px] tracking-tight leading-snug">{children}</div>
      </div>
      {href && (
        <ArrowUpRight size={13} className="text-[#4a5568] group-hover:text-[#00e5ff] transition-colors shrink-0" />
      )}
    </>
  );

  const cls =
    "group relative flex items-center gap-4 p-4 bg-[#0d1117] rounded-md border border-[rgba(0,229,255,0.12)] corner-ticks transition-colors hover:border-[rgba(0,229,255,0.35)]";

  return href ? (
    <a href={href} className={cls}>
      <span className="ct-tr" /><span className="ct-bl" />
      {inner}
    </a>
  ) : (
    <div className={cls}>
      <span className="ct-tr" /><span className="ct-bl" />
      {inner}
    </div>
  );
}

// ─── SocialRow ────────────────────────────────────────────────────────────────

function SocialRow({
  icon: Icon, name, handle, href = "#",
}: {
  icon: LucideIcon; name: string; handle?: string; href?: string;
}) {
  return (
    <a
      href={href}
      target={href !== "#" ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="group relative flex items-center gap-3 h-12 pl-3 pr-4 border-b border-[rgba(0,229,255,0.12)] last:border-0 transition-colors"
    >
      <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-sm bg-transparent group-hover:bg-[#00e5ff] transition-all duration-150 group-hover:shadow-[0_0_8px_rgba(0,229,255,0.85)]" />

      <span className="grid place-items-center w-8 h-8 rounded-sm border border-[rgba(0,229,255,0.12)] text-[#8b9ab0] group-hover:text-[#00e5ff] group-hover:border-[rgba(0,229,255,0.45)] transition-colors shrink-0">
        <Icon size={14} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="font-sans font-semibold text-[13.5px] tracking-tight text-[#f0f4ff] group-hover:text-[#00e5ff] transition-colors">
          {name}
        </div>
        {handle && (
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4a5568] mt-0.5 truncate">{handle}</div>
        )}
      </div>

      <ArrowUpRight
        size={13}
        className="text-[#8b9ab0] group-hover:text-[#00e5ff] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-150 shrink-0"
      />
    </a>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const labOpen = isLabOpen();

  return (
    <div className="relative min-h-screen overflow-hidden pb-24 pt-[calc(var(--nav-height)+2.5rem)] bg-[#07090f]">
      <div className="relative z-10 max-w-[1480px] mx-auto w-full px-6 lg:px-12">

        {/* Kicker */}
        <div className="flex items-center gap-2 mb-3">
          <span className="h-px w-8 bg-[#00e5ff]/60" />
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#00e5ff]">// VAJRAX / CONTACT</span>
        </div>

        <div className="grid grid-cols-12 gap-10 mt-2">

          {/* LEFT — contact info */}
          <div className="col-span-12 lg:col-span-7">
            <div className="mb-7">
              <h1 className="font-sans font-extrabold tracking-tight text-[#f0f4ff] leading-none" style={{ fontSize: "clamp(28px, 5vw, 44px)" }}>Contact</h1>
              <p className="text-[#8b9ab0] text-[14px] mt-3 max-w-[58ch] leading-relaxed">
                Mail us, find us, or just drop by during lab hours. Most replies under 24 hours.
              </p>
            </div>

            <div className="space-y-3">
              <InfoCard icon={Mail} label="EMAIL" href="mailto:vajrax2025@gmail.com">
                <span className="font-mono text-[14px] text-[#f0f4ff]">vajrax2025@gmail.com</span>
              </InfoCard>

              <InfoCard icon={MapPin} label="LOCATION">
                <span className="font-sans font-medium">MakerSpace Lab, Basement P3 Block</span>
                <span className="text-[#8b9ab0] block mt-1">Newton School of Technology</span>
                <span className="font-mono text-[11.5px] text-[#4a5568] block mt-1 tracking-[0.06em]">
                  Bengaluru · Karnataka · India
                </span>
              </InfoCard>

              <InfoCard icon={Clock} label="LAB HOURS">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[12.5px] mt-0.5">
                  <span className="text-[#8b9ab0]">MON — FRI</span>
                  <span className="text-[#f0f4ff] tabular-nums">06:00 — 21:00</span>
                  <span className="text-[#8b9ab0]">WEEKENDS</span>
                  <span className="text-[#4a5568] italic">closed</span>
                </div>
              </InfoCard>
            </div>

            {/* status row */}
            <div className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.18em]">
              <span className="inline-flex items-center gap-2">
                {labOpen ? (
                  <>
                    <span
                      className="w-[7px] h-[7px] rounded-full bg-[#22c55e] animate-pulse"
                      style={{ boxShadow: "0 0 5px #22c55e" }}
                    />
                    <span className="text-[#22c55e]">LAB OPEN</span>
                  </>
                ) : (
                  <>
                    <span
                      className="w-[7px] h-[7px] rounded-full bg-[#ef4444] animate-pulse"
                      style={{ boxShadow: "0 0 5px #ef4444" }}
                    />
                    <span className="text-[#ef4444]">LAB CLOSED</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* RIGHT — social + CTA */}
          <div className="col-span-12 lg:col-span-5">
            <div className="mb-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#00e5ff] mb-2">// SOCIAL</div>
              <h2 className="font-sans font-bold text-[#f0f4ff] text-[26px] tracking-tight leading-none">Connect</h2>
              <p className="text-[#8b9ab0] text-[13px] mt-2 max-w-[40ch] leading-relaxed">
                Follow the build logs, behind-the-scenes, and shop-floor moments.
              </p>
            </div>

            <div className="bg-[#0d1117] border border-[rgba(0,229,255,0.12)] rounded-md overflow-hidden corner-ticks relative">
              <span className="ct-tr" /><span className="ct-bl" />
              <SocialRow icon={GithubIcon}    name="GitHub"    handle="VajraX-NST-BLR"   href="https://github.com/VajraX-NST-BLR" />
              <SocialRow icon={TwitterIcon}   name="Twitter"   handle="@vajrax"           href="#" />
              <SocialRow icon={InstagramIcon} name="Instagram" handle="@vajrax.workshop"  href="#" />
              <SocialRow icon={LinkedinIcon}  name="LinkedIn"  handle="VajraX Collective" href="#" />
            </div>

            {/* divider */}
            <div className="my-7 relative flex items-center gap-4">
              <span className="h-px flex-1 bg-[rgba(0,229,255,0.12)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#4a5568]">// JOIN</span>
              <span className="h-px flex-1 bg-[rgba(0,229,255,0.12)]" />
            </div>

            {/* CTA card */}
            <div
              className="relative p-5 rounded-md bg-[#0d1117] corner-ticks overflow-hidden"
              style={{
                border: "1px solid rgba(0,229,255,0.45)",
                boxShadow: "0 0 0 1px rgba(0,229,255,0.10), 0 0 28px -10px rgba(0,229,255,0.45)",
              }}
            >
              <span className="ct-tr" /><span className="ct-bl" />
              <div
                className="absolute -inset-x-8 -top-20 h-40 pointer-events-none"
                style={{ background: "radial-gradient(40% 60% at 50% 100%, rgba(0,229,255,0.18) 0%, transparent 70%)" }}
              />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-[#00e5ff]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#00e5ff]">
                    2027 COHORT · APPLICATIONS OPEN
                  </span>
                </div>
                <h3 className="font-sans font-extrabold text-[#f0f4ff] text-[22px] tracking-tight leading-tight">
                  Want to join VajraX?
                </h3>
                <p className="text-[#8b9ab0] text-[13px] mt-2 leading-relaxed max-w-[40ch]">
                  Twice-yearly recruitment across all six sub-teams. No prior robotics experience required.
                </p>
                <div className="mt-5">
                  <a
                    href="/signup"
                    className="inline-flex items-center gap-2 h-9 px-5 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00e5ff]/90 transition-colors"
                  >
                    <UserPlus size={13} />
                    Apply Now
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
