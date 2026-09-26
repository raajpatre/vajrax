import {
  Mail, MapPin, Clock, GithubIcon, TwitterIcon, InstagramIcon, LinkedinIcon,
  ArrowUpRight, Zap, UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GlobePulse } from "@/components/ui/DynamicGlobePulse";

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

// ─── SocialsCard ──────────────────────────────────────────────────────────────

const SocialCardStyles = `
  .social-card {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #0d1117;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid rgba(0, 229, 255, 0.2);
    box-shadow: 0 0 20px -5px rgba(0,229,255,0.05);
    transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  
  .social-card:hover {
    transform: scale(1.02);
    border-color: rgba(0, 229, 255, 0.5);
    box-shadow: 0 0 35px -5px rgba(0,229,255,0.25);
  }

  .cta-card {
    transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
    border: 1px solid rgba(0, 229, 255, 0.45);
    box-shadow: 0 0 0 1px rgba(0,229,255,0.10), 0 0 28px -10px rgba(0,229,255,0.45);
  }
  
  .cta-card:hover {
    transform: scale(1.02);
    border-color: rgba(0, 229, 255, 0.65);
    box-shadow: 0 0 0 1px rgba(0,229,255,0.20), 0 0 45px -10px rgba(0,229,255,0.65);
  }

  .social-card-bg {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle at 100% 0%, rgba(0,229,255,0.15) 0%, transparent 70%);
  }

  .social-logo {
    position: absolute;
    right: 50%;
    bottom: 50%;
    transform: translate(50%, 50%);
    transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
    font-size: 26px;
    font-weight: 700;
    color: #f0f4ff;
    letter-spacing: 2px;
    pointer-events: none;
    z-index: 20;
  }
  
  .social-card:hover .social-logo {
    right: 24px;
    bottom: calc(100% - 34px);
    transform: translate(0, 0);
    letter-spacing: 0px;
    font-size: 18px;
    color: #00e5ff;
  }

  .sc-box {
    position: absolute;
    padding: 16px;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    background: rgba(0, 229, 255, 0.05);
    border-top: 1px solid rgba(0, 229, 255, 0.4);
    border-right: 1px solid rgba(0, 229, 255, 0.2);
    border-radius: 10% 13% 42% 0% / 10% 12% 75% 0%;
    transform-origin: bottom left;
    transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
    cursor: pointer;
    text-decoration: none;
  }

  .sc-box::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    transition: all 0.5s ease-in-out;
    z-index: -1;
  }

  .social-card:hover .sc-box {
    bottom: -1px;
    left: -1px;
  }
  
  .sc-box:hover .sc-icon {
    color: #ffffff;
    filter: drop-shadow(0 0 8px rgba(255,255,255,0.8));
    transform: scale(1.1);
  }

  .sc-icon {
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.4s ease;
  }

  /* Box 1 - GitHub */
  .sc-box1 {
    width: 85%; height: 85%;
    bottom: -85%; left: -85%;
    z-index: 10;
  }
  .sc-box1::before {
    background: radial-gradient(circle at 30% 107%, rgba(0,229,255,0.15) 0%, rgba(0,100,255,0.05) 60%, transparent 90%);
  }
  .social-card:hover .sc-box1::before { opacity: 1; }

  /* Box 2 - Twitter */
  .sc-box2 {
    width: 65%; height: 65%;
    bottom: -65%; left: -65%;
    transition-delay: 0.1s;
    z-index: 11;
  }
  .sc-box2::before {
    background: radial-gradient(circle at 30% 107%, rgba(0,229,255,0.25) 0%, rgba(0,150,255,0.1) 90%);
  }
  .social-card:hover .sc-box2::before { opacity: 1; }

  /* Box 3 - Instagram */
  .sc-box3 {
    width: 45%; height: 45%;
    bottom: -45%; left: -45%;
    transition-delay: 0.2s;
    z-index: 12;
  }
  .sc-box3::before {
    background: radial-gradient(circle at 30% 107%, rgba(0,229,255,0.35) 0%, rgba(0,200,255,0.15) 90%);
  }
  .social-card:hover .sc-box3::before { opacity: 1; }

  /* Box 4 - LinkedIn */
  .sc-box4 {
    width: 25%; height: 25%;
    bottom: -25%; left: -25%;
    transition-delay: 0.3s;
    z-index: 13;
  }
  .sc-box4::before {
    background: radial-gradient(circle at 30% 107%, rgba(0,229,255,0.5) 0%, rgba(0,229,255,0.2) 90%);
  }
  .social-card:hover .sc-box4::before { opacity: 1; }
`;

function SocialsCard() {
  return (
    <div className="social-card">
      <div className="social-card-bg" />
      <div className="social-logo font-sans text-center whitespace-nowrap">Our Socials</div>
      
      <a href="https://github.com/VajraX-NST-BLR" target="_blank" rel="noopener noreferrer" className="sc-box sc-box1">
        <GithubIcon size={22} className="sc-icon" />
      </a>
      <a href="#" target="_blank" rel="noopener noreferrer" className="sc-box sc-box2">
        <TwitterIcon size={22} className="sc-icon" />
      </a>
      <a href="https://www.instagram.com/vajrax.club/" target="_blank" rel="noopener noreferrer" className="sc-box sc-box3">
        <InstagramIcon size={22} className="sc-icon" />
      </a>
      <a href="https://www.linkedin.com/company/vajrax-club/" target="_blank" rel="noopener noreferrer" className="sc-box sc-box4">
        <LinkedinIcon size={22} className="sc-icon" />
      </a>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const labOpen = isLabOpen();

  return (
    <div className="relative min-h-screen overflow-hidden pb-24 pt-[calc(var(--nav-height)+2.5rem)] bg-[#07090f]">
      <style dangerouslySetInnerHTML={{ __html: SocialCardStyles }} />
      <div className="relative z-10 max-w-[1480px] mx-auto w-full px-6 lg:px-12">

        {/* Kicker Removed */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-2">

          {/* LEFT — contact info */}
          <div className="col-span-1 lg:col-span-7">
            <div className="w-full max-w-[600px] mx-auto lg:mx-0 relative">
              <div className="absolute top-0 left-0 z-10 pointer-events-none pr-4">
                <div className="font-mono text-[11px] text-[#00e5ff] uppercase tracking-[0.2em] mb-1.5">HQ Location</div>
                <div className="font-sans font-medium text-[#8b9ab0] text-[15px] leading-relaxed max-w-[400px]">
                  <span className="text-[#f0f4ff]">Building No. P3</span>, Sattva Global City, Mysore Road, Remco Housing Society, Rajarajeshwari Nagar, Bengaluru, India - 560059
                </div>
              </div>

              <a 
                href="https://maps.app.goo.gl/wNZ7tnsyNgo8Sf7Z8" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block relative aspect-square w-full pt-28 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
              >
                <GlobePulse 
                  markers={[
                    { id: "pulse-blr", location: [12.9716, 77.5946], delay: 0 }
                  ]}
                  speed={0.005}
                />
              </a>
            </div>
          </div>

          {/* RIGHT — social + CTA */}
          <div className="col-span-1 lg:col-span-5">
            <div className="w-full max-w-[340px] sm:max-w-sm mx-auto lg:max-w-none lg:mx-0">
              <SocialsCard />

              {/* CTA card */}
              <div
                className="relative mt-7 p-6 lg:p-10 rounded-[20px] bg-[#0d1117] overflow-hidden cta-card min-w-0"
              >
                <div className="relative flex flex-col items-center text-center lg:items-start lg:text-left">
                  <h3 className="font-sans font-extrabold text-[#f0f4ff] text-[20px] sm:text-[22px] lg:text-[24px] tracking-tight leading-tight">
                    Want to join VajraX?
                  </h3>
                  <p className="text-[#8b9ab0] text-[13px] lg:text-[14px] mt-2 lg:mt-3 leading-relaxed max-w-[40ch]">
                    No prior experience required, but the zeal and curiosity for further experience ⚡️
                  </p>
                  <div className="mt-8">
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
    </div>
  );
}
