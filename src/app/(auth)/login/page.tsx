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

function AuthLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-end justify-between mb-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b9ab0]">
        <span className="text-[#00e5ff]/70">$</span> {children}
      </span>
      {hint && <span className="font-mono text-[9.5px] text-[#4a5568] tracking-[0.06em]">{hint}</span>}
    </div>
  );
}

function FieldWrap({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}

const inputCls =
  "focus-cyan w-full h-10 bg-[#0d1117] text-[13.5px] text-[#f0f4ff] placeholder:text-[#4a5568] border border-[rgba(0,229,255,0.12)] rounded-md transition-shadow";

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
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2.5">
            <CircuitMark />
            <span className="font-sans font-extrabold text-[#f0f4ff] text-[19px] tracking-tight leading-none">
              Vajra<span className="text-[#00e5ff]">X</span>
            </span>
          </div>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.20em] text-[#4a5568]">ACCESS / LOGIN</span>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-6">
          <h1 className="font-sans font-extrabold text-[#f0f4ff] text-[26px] tracking-tight leading-none">Sign In</h1>
          <p className="text-[#8b9ab0] text-[13px] mt-2">Welcome back.</p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {/* Email */}
            <div>
              <AuthLabel hint="REQUIRED">Email</AuthLabel>
              <FieldWrap>
                <span className="absolute inset-y-0 left-0 grid place-items-center w-10 text-[#8b9ab0] pointer-events-none border-r border-[rgba(0,229,255,0.12)]">
                  <Mail size={14} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="kavya@vajrax.io"
                  className={`${inputCls} pl-12 pr-3`}
                />
              </FieldWrap>
            </div>

            {/* Password */}
            <div>
              <AuthLabel hint="REQUIRED">Password</AuthLabel>
              <FieldWrap>
                <span className="absolute inset-y-0 left-0 grid place-items-center w-10 text-[#8b9ab0] pointer-events-none border-r border-[rgba(0,229,255,0.12)]">
                  <Lock size={14} />
                </span>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className={`${inputCls} pl-12 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute inset-y-0 right-0 grid place-items-center w-10 text-[#8b9ab0] hover:text-[#00e5ff] transition-colors"
                  aria-label="toggle password visibility"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </FieldWrap>
              <div className="flex justify-end mt-1.5">
                <span
                  className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-[#4a5568] cursor-help"
                  title="Password reset is not yet available"
                >
                  Forgot credentials?
                </span>
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-md border"
                style={{ borderColor: "rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.08)" }}
              >
                <AlertCircle size={15} className="text-[#ef4444] shrink-0 mt-px" />
                <div className="text-[12.5px] text-[#ef4444] leading-snug">{error}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-sm font-mono text-[12px] uppercase tracking-[0.14em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00c7e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Authenticating</>
              ) : (
                <>Sign In <ArrowRight size={13} /></>
              )}
            </button>
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
      <LoginForm />
    </Suspense>
  );
}
