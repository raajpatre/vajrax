"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogIn, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/feed";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        router.push(redirectTo);
        router.refresh();
    };

    return (
        <div className="glass-strong p-8">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
                <p className="text-text-secondary text-sm">
                    Sign in to your VajraX account
                </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

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
                            placeholder="••••••••"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <LogIn className="w-4 h-4" />
                    )}
                    {loading ? "Signing in..." : "Sign In"}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-text-muted">
                    Need an account? Contact your faculty advisor to get registered.
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="glass-strong p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-light" />
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
