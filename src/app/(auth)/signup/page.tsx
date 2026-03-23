"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    UserPlus,
    Mail,
    Lock,
    User,
    Loader2,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";

export default function SignupPage() {
    const router = useRouter();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            setLoading(false);
            return;
        }

        const supabase = createClient();
        const { error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
    };

    if (success) {
        return (
            <div className="glass-strong p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">Check your email</h2>
                <p className="text-text-secondary text-sm mb-6">
                    We&apos;ve sent a confirmation link to{" "}
                    <span className="text-foreground font-medium">{email}</span>.
                    Click it to activate your account.
                </p>
                <Link href="/login" className="btn-secondary text-sm">
                    Back to Sign In
                </Link>
            </div>
        );
    }

    return (
        <div className="glass-strong p-8">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Join VajraX</h1>
                <p className="text-text-secondary text-sm">
                    Create your account and start building
                </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Full Name */}
                <div>
                    <label
                        htmlFor="fullName"
                        className="block text-sm font-medium text-text-secondary mb-1.5"
                    >
                        Full Name
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            placeholder="Tony Stark"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                    </div>
                </div>

                {/* Email */}
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-text-secondary mb-1.5"
                    >
                        Email
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@college.edu"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                    </div>
                </div>

                {/* Password */}
                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-text-secondary mb-1.5"
                    >
                        Password
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="Minimum 6 characters"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <UserPlus className="w-4 h-4" />
                    )}
                    {loading ? "Creating account..." : "Create Account"}
                </button>
            </form>

            {/* Divider + Link */}
            <div className="mt-6 text-center">
                <p className="text-sm text-text-muted">
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="text-primary-light hover:underline font-medium"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
