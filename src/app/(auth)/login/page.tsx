"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, AlertCircle, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

// ─── Shared UI ────────────────────────────────────────────────────────────────

function CircuitMark() {
  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: 30, height: 30 }}>
      <svg width={30} height={30} viewBox="0 0 28 28" fill="none">
        <rect x="3.5" y="3.5" width="21" height="21" stroke="rgba(0,229,255,0.55)" strokeWidth="1" />
        <path d="M0 14 H7 M21 14 H28 M14 0 V7 M14 21 V28" stroke="rgba(0,229,255,0.6)" strokeWidth="1" />
        <circle cx="7"  cy="14" r="1.5" fill="#00e5ff" />
        <circle cx="21" cy="14" r="1.5" fill="#00e5ff" />
        <circle cx="14" cy="7"  r="1.5" fill="#00e5ff" />
        <circle cx="14" cy="21" r="1.5" fill="#00e5ff" />
        <rect x="10" y="10" width="8" height="8" fill="rgba(0,229,255,0.18)" stroke="#00e5ff" strokeWidth="1.2" />
        <circle cx="14" cy="14" r="1.6" fill="#00e5ff" />
      </svg>
      <span className="absolute inset-1 rounded-sm pointer-events-none" style={{ boxShadow: "0 0 16px -4px rgba(0,229,255,0.7)" }} />
    </span>
  );
}

const D3ButtonStyles = `
  .d3wrapper {
    position: relative;
    transform-style: preserve-3d;
    perspective: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 64px;
    margin-top: 2rem;
  }
  .d3cover {
    background-color: #07090f;
    height: 64px;
    width: 100%;
    border-radius: 10px;
    transform: rotateX(13deg);
    position: absolute;
    z-index: 1;
    box-shadow: 0px 1px 1px 1px rgba(0,229,255,0.4);
    border: 1px solid rgba(0,229,255,0.15);
  }
  .d3btn {
    cursor: pointer;
    border: none;
    border-bottom: 2px solid rgba(255,255,255,0.6);
    background-color: #00e5ff;
    box-shadow: 0px 4px 0px 0.2px rgba(0,180,200,1);
    height: 56px;
    width: calc(100% - 10px);
    border-radius: 8px;
    transform: rotateX(13deg);
    z-index: 2;
    position: absolute;
    transition: 80ms;
    color: #07090f;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .d3btn:hover:not(:disabled) {
    background-color: #00d0e6;
  }
  .d3btn:active:not(:disabled) {
    box-shadow: 0px 4px 0px 0.2px rgba(0,0,0,0);
    transform: rotateX(13deg) translateY(4.5px);
    transition: 80ms;
  }
  .d3btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const redirectTo  = searchParams.get("redirect") || "/inventory";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card */}
      <div
        className="relative w-full bg-[#111820]/90 backdrop-blur-md rounded-md corner-ticks"
        style={{
          border: "1px solid rgba(0,229,255,0.28)",
          boxShadow: "0 0 0 1px rgba(0,229,255,0.06), 0 24px 60px -24px rgba(0,0,0,0.8), 0 0 40px -16px rgba(0,229,255,0.35)",
        }}
      >
        <span className="ct-tr" /><span className="ct-bl" />
        {/* top accent line */}
        <div
          className="absolute inset-x-0 top-0 h-px pointer-events-none rounded-t-md"
          style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.6), transparent)" }}
        />

        {/* Header */}
        <div className="flex items-center justify-center px-6 pt-8 pb-3">
          <h1 className="flex items-center gap-3 font-sans font-extrabold text-[#f0f4ff] text-[26px] tracking-tight leading-none">
            Sign In to
            <img 
              src="/White-WordMark-vajrax.png" 
              alt="VajraX"
              className="h-[28px] w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.15)] mt-1"
            />
          </h1>
        </div>

        {/* Body */}
        <div className="px-6 pt-6 pb-6">

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder=" "
                className="peer w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] pl-11 pr-3 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors"
              />
              <span className="absolute left-0 top-0 bottom-0 grid place-items-center w-11 text-[#8b9ab0] pointer-events-none peer-focus:text-[#00e5ff] transition-colors">
                <Mail size={15} />
              </span>
              <label className="absolute left-11 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-6 peer-focus:bg-[#111820] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-valid:top-0 peer-valid:-translate-y-1/2 peer-valid:scale-[0.85] peer-valid:-translate-x-6 peer-valid:bg-[#111820] peer-valid:px-2 peer-valid:text-[#00e5ff]">
                Email Address
              </label>
            </div>

            {/* Password */}
            <div className="relative group">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder=" "
                className="peer w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] pl-11 pr-10 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors"
              />
              <span className="absolute left-0 top-0 bottom-0 grid place-items-center w-11 text-[#8b9ab0] pointer-events-none peer-focus:text-[#00e5ff] transition-colors">
                <Lock size={15} />
              </span>
              <label className="absolute left-11 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-6 peer-focus:bg-[#111820] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-valid:top-0 peer-valid:-translate-y-1/2 peer-valid:scale-[0.85] peer-valid:-translate-x-6 peer-valid:bg-[#111820] peer-valid:px-2 peer-valid:text-[#00e5ff]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-0 top-0 bottom-0 grid place-items-center w-11 text-[#8b9ab0] hover:text-[#00e5ff] transition-colors"
                aria-label="toggle password visibility"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && (
              <div
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-md border mt-3"
                style={{ borderColor: "rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.08)" }}
              >
                <AlertCircle size={15} className="text-[#ef4444] shrink-0 mt-px" />
                <div className="text-[12.5px] text-[#ef4444] leading-snug">{error}</div>
              </div>
            )}

            <div className="d3wrapper">
              <div className="d3cover" />
              <button
                type="submit"
                disabled={loading}
                className="d3btn font-mono"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Authenticating</>
                ) : (
                  <>Sign In <ArrowRight size={13} /></>
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 pt-5 border-t border-[rgba(0,229,255,0.12)] text-center">
            <span className="text-[#8b9ab0] text-[12.5px]">Don&apos;t have an account? </span>
            <Link
              href="/signup"
              className="text-[#00e5ff] text-[12.5px] font-medium hover:underline underline-offset-2 inline-flex items-center gap-1"
            >
              Apply Now <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-[#00e5ff]" />
        </div>
      }
    >
      <style dangerouslySetInnerHTML={{ __html: D3ButtonStyles }} />
      <LoginForm />
    </Suspense>
  );
}
