"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Loader2, CheckCircle2, ChevronDown, LogIn } from "lucide-react";

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

// ─── Types ────────────────────────────────────────────────────────────────────

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

type SignupState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  currentSemester: string;
  purpose: string;
};

const initialState: SignupState = {
  firstName: "", lastName: "", email: "", password: "", currentSemester: "3", purpose: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: D3ButtonStyles }} />
      <SignupForm />
    </>
  );
}

function SignupForm() {
  const [form,          setForm]         = useState<SignupState>(initialState);
  const [showPw,        setShowPw]       = useState(false);
  const [loading,       setLoading]      = useState(false);
  const [error,         setError]        = useState<string | null>(null);
  const [success,       setSuccess]      = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [submittedEmail,setSubmittedEmail]= useState("");

  const set = <K extends keyof SignupState>(k: K, v: SignupState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/applicants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName:       form.firstName,
        lastName:        form.lastName,
        email:           form.email,
        password:        form.password,
        currentSemester: Number(form.currentSemester),
        purpose:         form.purpose,
      }),
    });

    const data = await res.json().catch(() => ({ error: "Something went wrong." }));

    if (!res.ok) {
      setError(data.error || "Failed to submit application.");
      setLoading(false);
      return;
    }

    setSubmittedName(form.firstName);
    setSubmittedEmail(form.email);
    setSuccess(true);
    setLoading(false);
    setForm(initialState);
  };

  // ── Success state ──────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div
          className="relative w-full bg-[#111820]/90 backdrop-blur-md rounded-md corner-ticks"
          style={{
            border: "1px solid rgba(0,229,255,0.28)",
            boxShadow: "0 0 0 1px rgba(0,229,255,0.06), 0 24px 60px -24px rgba(0,0,0,0.8), 0 0 40px -16px rgba(0,229,255,0.35)",
          }}
        >
          <span className="ct-tr" /><span className="ct-bl" />
          <div className="absolute inset-x-0 top-0 h-px pointer-events-none rounded-t-md"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.6), transparent)" }} />

          <div className="flex items-center justify-center px-6 pt-8 pb-2">
            <img 
              src="/White-WordMark-vajrax.png" 
              alt="VajraX"
              className="h-[36px] w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
            />
          </div>

          <div className="px-8 py-12 text-center">
            <div
              className="mx-auto w-16 h-16 grid place-items-center rounded-full mb-5"
              style={{
                border: "1px solid rgba(34,197,94,0.5)",
                background: "rgba(34,197,94,0.08)",
                boxShadow: "0 0 28px -6px rgba(34,197,94,0.6)",
              }}
            >
              <CheckCircle2 size={30} className="text-[#22c55e]" />
            </div>
            <h2 className="font-sans font-extrabold text-[#f0f4ff] text-[24px] tracking-tight">
              Application Submitted
            </h2>
            <p className="text-[#8b9ab0] text-[13.5px] mt-2.5 max-w-[44ch] mx-auto leading-relaxed">
              Thanks, <span className="text-[#f0f4ff]">{submittedName || "applicant"}</span>. Your application is in the review queue — faculty review on a rolling basis, usually within{" "}
              <span className="text-[#f0f4ff]">2 weeks</span>. We&apos;ll email{" "}
              <span className="font-mono text-[#00e5ff]"> {submittedEmail || "you"}</span> when there&apos;s a decision.
            </p>

            <div
              className="mt-6 inline-flex items-center gap-2 px-3 h-8 border border-[rgba(0,229,255,0.12)] rounded-sm font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#8b9ab0]"
              style={{ background: "rgba(13,17,23,0.6)" }}
            >
              <span className="w-[7px] h-[7px] rounded-full bg-[#f59e0b] animate-pulse shrink-0"
                style={{ boxShadow: "0 0 6px rgba(245,158,11,0.7)" }} />
              Review Pending
            </div>

            <div className="mt-7">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 h-9 px-5 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#8b9ab0] border border-[rgba(0,229,255,0.18)] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.45)] transition-colors"
              >
                <LogIn size={13} />
                Go to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        className="relative w-full bg-[#111820]/90 backdrop-blur-md rounded-md corner-ticks"
        style={{
          border: "1px solid rgba(0,229,255,0.28)",
          boxShadow: "0 0 0 1px rgba(0,229,255,0.06), 0 24px 60px -24px rgba(0,0,0,0.8), 0 0 40px -16px rgba(0,229,255,0.35)",
        }}
      >
        <span className="ct-tr" /><span className="ct-bl" />
        <div className="absolute inset-x-0 top-0 h-px pointer-events-none rounded-t-md"
          style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.6), transparent)" }} />

        {/* Header */}
        <div className="flex items-center justify-center px-6 pt-8 pb-3">
          <h1 className="flex items-center gap-3 font-sans font-extrabold text-[#f0f4ff] text-[26px] tracking-tight leading-none">
            Join
            <img 
              src="/White-WordMark-vajrax.png" 
              alt="VajraX"
              className="h-[28px] w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.15)] mt-1"
            />
          </h1>
        </div>

        {/* Body */}
        <div className="px-7 pt-6 pb-6">

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  required
                  placeholder=" "
                  className="peer w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] px-4 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors"
                />
                <label className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-2 peer-focus:bg-[#111820] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-valid:top-0 peer-valid:-translate-y-1/2 peer-valid:scale-[0.85] peer-valid:-translate-x-2 peer-valid:bg-[#111820] peer-valid:px-2 peer-valid:text-[#00e5ff]">
                  First name
                </label>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  required
                  placeholder=" "
                  className="peer w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] px-4 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors"
                />
                <label className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-2 peer-focus:bg-[#111820] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-valid:top-0 peer-valid:-translate-y-1/2 peer-valid:scale-[0.85] peer-valid:-translate-x-2 peer-valid:bg-[#111820] peer-valid:px-2 peer-valid:text-[#00e5ff]">
                  Last name
                </label>
              </div>
            </div>

            {/* Email */}
            <div>
              <div className="relative group">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
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
              <div className="font-mono text-[10px] text-[#4a5568] mt-1.5 tracking-[0.06em] flex items-center gap-1.5">
                <span className="text-[#00e5ff]/70 text-[9px]">ℹ</span>
                This will be your sign-in email after approval
              </div>
            </div>

            {/* Password + Semester row */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "1.4fr 0.6fr" }}>
              <div className="relative group">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                  minLength={6}
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
              <div className="relative group">
                <select
                  value={form.currentSemester}
                  onChange={(e) => set("currentSemester", e.target.value)}
                  required
                  className="peer w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] pl-4 pr-9 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  {["1","2","3","4","5","6","7","8"].map((s) => (
                    <option key={s} value={s} className="bg-[#0d1117]">Sem {s}</option>
                  ))}
                </select>
                <span className="absolute inset-y-0 right-0 grid place-items-center w-9 text-[#8b9ab0] pointer-events-none">
                  <ChevronDown size={14} />
                </span>
                <label className="absolute left-4 top-0 -translate-y-1/2 text-[#8b9ab0] text-[14px] scale-[0.85] -translate-x-2 bg-[#111820] px-2 text-[#00e5ff] pointer-events-none transition-all duration-200">
                  Semester
                </label>
              </div>
            </div>

            {/* Purpose */}
            <div className="relative group">
              <textarea
                rows={4}
                value={form.purpose}
                onChange={(e) => set("purpose", e.target.value)}
                required
                placeholder=" "
                className="peer w-full bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] px-4 py-3 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors resize-none leading-relaxed"
              />
              <label className="absolute left-4 top-3 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-2 peer-focus:bg-[#111820] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-valid:top-0 peer-valid:-translate-y-1/2 peer-valid:scale-[0.85] peer-valid:-translate-x-2 peer-valid:bg-[#111820] peer-valid:px-2 peer-valid:text-[#00e5ff]">
                Purpose
              </label>
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

            <div className="d3wrapper">
              <div className="d3cover" />
              <button
                type="submit"
                disabled={loading}
                className="d3btn font-mono"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Submitting application</>
                ) : (
                  <>Submit Application <ArrowRight size={13} /></>
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 pt-5 border-t border-[rgba(0,229,255,0.12)] text-center">
            <span className="text-[#8b9ab0] text-[12.5px]">Already approved? </span>
            <Link
              href="/login"
              className="text-[#00e5ff] text-[12.5px] font-medium hover:underline underline-offset-2 inline-flex items-center gap-1"
            >
              Sign In <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
