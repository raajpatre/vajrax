"use client";

import { useState } from "react";
import Link from "next/link";
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    Lock,
    Mail,
    PenSquare,
    User,
} from "lucide-react";

type SignupState = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    currentSemester: string;
    purpose: string;
};

const initialState: SignupState = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    currentSemester: "",
    purpose: "",
};

export default function SignupPage() {
    const [form, setForm] = useState<SignupState>(initialState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof SignupState>(key: K, value: SignupState[K]) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const response = await fetch("/api/applicants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                password: form.password,
                currentSemester: Number(form.currentSemester),
                purpose: form.purpose,
            }),
        });

        const data = await response.json().catch(() => ({ error: "Something went wrong." }));

        if (!response.ok) {
            setError(data.error || "Failed to submit application.");
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
        setForm(initialState);
    };

    return (
        <div className="glass-strong p-4 md:p-5 md:p-8">
            <div className="mb-8 text-center">
                <h1 className="mb-2 text-2xl font-bold">Join VajraX</h1>
            </div>

            {success ? (
                <div className="space-y-5 text-center">
                    <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
                    <div>
                        <h2 className="text-xl font-semibold text-emerald-400">Application submitted</h2>
                        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                            Your application is now in the review queue. Once it is approved, you can sign in
                            using the email and password you submitted here.
                        </p>
                    </div>
                    <Link href="/login" className="btn-primary w-full justify-center !py-3">
                        Go to Sign In
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-text-secondary">
                                First Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                                <input
                                    id="firstName"
                                    type="text"
                                    value={form.firstName}
                                    onChange={(event) => updateField("firstName", event.target.value)}
                                    required
                                    placeholder="Aarav"
                                    className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-text-secondary">
                                Last Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                                <input
                                    id="lastName"
                                    type="text"
                                    value={form.lastName}
                                    onChange={(event) => updateField("lastName", event.target.value)}
                                    required
                                    placeholder="Sharma"
                                    className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                            <input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(event) => updateField("email", event.target.value)}
                                required
                                placeholder="you@college.edu"
                                className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                        </div>
                        <p className="mt-1 text-[11px] text-text-muted">This will also be your sign-in email after approval.</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[1.4fr_0.8fr]">
                        <div>
                            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                                <input
                                    id="password"
                                    type="password"
                                    value={form.password}
                                    onChange={(event) => updateField("password", event.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="Min 6 characters"
                                    className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="semester" className="mb-1.5 block text-sm font-medium text-text-secondary">
                                Current Semester
                            </label>
                            <input
                                id="semester"
                                type="number"
                                min={1}
                                max={8}
                                value={form.currentSemester}
                                onChange={(event) => updateField("currentSemester", event.target.value)}
                                required
                                placeholder="4"
                                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="purpose" className="mb-1.5 block text-sm font-medium text-text-secondary">
                            Purpose to Join VajraX
                        </label>
                        <div className="relative">
                            <PenSquare className="absolute left-3 top-3.5 h-4 w-4 text-text-muted" />
                            <textarea
                                id="purpose"
                                value={form.purpose}
                                onChange={(event) => updateField("purpose", event.target.value)}
                                required
                                rows={5}
                                placeholder="Tell us what you want to build, learn, or contribute at VajraX."
                                className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full !py-3 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenSquare className="h-4 w-4" />}
                        {loading ? "Submitting..." : "Submit Application"}
                    </button>
                </form>
            )}

            {!success && (
                <div className="mt-6 border-t border-[rgba(59,73,76,0.18)] pt-5 text-center">
                    <p className="text-sm text-text-muted">
                        Already approved?{" "}
                        <Link href="/login" className="font-semibold text-primary-light transition-colors hover:text-[#c3f5ff]">
                            Sign In
                        </Link>
                    </p>
                </div>
            )}
        </div>
    );
}
