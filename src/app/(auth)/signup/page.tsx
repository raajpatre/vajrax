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

const inputCls =
  "focus-cyan w-full h-10 bg-[#0d1117] text-[13.5px] text-[#f0f4ff] placeholder:text-[#4a5568] border border-[rgba(0,229,255,0.12)] rounded-md transition-shadow";

// ─── Types ────────────────────────────────────────────────────────────────────

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

          <div className="flex items-center justify-between px-6 pt-6">
            <div className="flex items-center gap-2.5">
              <CircuitMark />
              <span className="font-sans font-extrabold text-[#f0f4ff] text-[19px] tracking-tight leading-none">
                Vajra<span className="text-[#00e5ff]">X</span>
              </span>
            </div>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.20em] text-[#4a5568]">APPLY / SUBMITTED</span>
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
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2.5">
            <CircuitMark />
            <span className="font-sans font-extrabold text-[#f0f4ff] text-[19px] tracking-tight leading-none">
              Vajra<span className="text-[#00e5ff]">X</span>
            </span>
          </div>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.20em] text-[#4a5568]">APPLY / SIGNUP</span>
        </div>

        {/* Body */}
        <div className="px-7 pt-5 pb-6">
          <h1 className="font-sans font-extrabold text-[#f0f4ff] text-[26px] tracking-tight leading-none">Join VajraX</h1>
          <p className="text-[#8b9ab0] text-[13px] mt-2">Applications are reviewed by faculty.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <AuthLabel>First name</AuthLabel>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  required
                  placeholder="Kavya"
                  className={`${inputCls} px-3`}
                />
              </div>
              <div>
                <AuthLabel>Last name</AuthLabel>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  required
                  placeholder="Ramanathan"
                  className={`${inputCls} px-3`}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <AuthLabel hint="REQUIRED">Email</AuthLabel>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 grid place-items-center w-10 text-[#8b9ab0] pointer-events-none border-r border-[rgba(0,229,255,0.12)]">
                  <Mail size={14} />
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                  placeholder="kavya@nst.edu"
                  className={`${inputCls} pl-12 pr-3`}
                />
              </div>
              <div className="font-mono text-[10px] text-[#4a5568] mt-1.5 tracking-[0.06em] flex items-center gap-1.5">
                <span className="text-[#00e5ff]/70 text-[9px]">ℹ</span>
                This will be your sign-in email after approval
              </div>
            </div>

            {/* Password + Semester row */}
            <div className="grid gap-3" style={{ gridTemplateColumns: "1.4fr 0.6fr" }}>
              <div>
                <AuthLabel hint="MIN 6 CHARS">Password</AuthLabel>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 grid place-items-center w-10 text-[#8b9ab0] pointer-events-none border-r border-[rgba(0,229,255,0.12)]">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    required
                    minLength={6}
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
                </div>
              </div>
              <div>
                <AuthLabel>Semester</AuthLabel>
                <div className="relative">
                  <select
                    value={form.currentSemester}
                    onChange={(e) => set("currentSemester", e.target.value)}
                    required
                    className={`${inputCls} appearance-none px-3 pr-9 cursor-pointer`}
                  >
                    {["1","2","3","4","5","6","7","8"].map((s) => (
                      <option key={s} value={s} className="bg-[#0d1117]">Sem {s}</option>
                    ))}
                  </select>
                  <span className="absolute inset-y-0 right-0 grid place-items-center w-9 text-[#8b9ab0] pointer-events-none">
                    <ChevronDown size={14} />
                  </span>
                </div>
              </div>
            </div>

            {/* Purpose */}
            <div>
              <AuthLabel hint="WHAT DRIVES YOU">Purpose</AuthLabel>
              <textarea
                rows={4}
                value={form.purpose}
                onChange={(e) => set("purpose", e.target.value)}
                required
                placeholder="Tell us what you want to build, learn, or contribute at VajraX."
                className="focus-cyan w-full bg-[#0d1117] text-[13.5px] text-[#f0f4ff] placeholder:text-[#4a5568] border border-[rgba(0,229,255,0.12)] rounded-md transition-shadow px-3 py-2.5 resize-none leading-relaxed"
              />
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
                <><Loader2 size={14} className="animate-spin" /> Submitting application</>
              ) : (
                <>Submit Application <ArrowRight size={13} /></>
              )}
            </button>
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
