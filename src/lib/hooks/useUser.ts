"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/types/database";
import type { User } from "@supabase/supabase-js";

type Profile = Tables<"profiles">;

interface UserState {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
}

export function useUser() {
    const [state, setState] = useState<UserState>({
        user: null,
        profile: null,
        loading: true,
    });

    // Stable supabase client reference
    const supabase = useMemo(() => createClient(), []);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;

        const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
            return await Promise.race([
                promise,
                new Promise<T>((_, reject) =>
                    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
                ),
            ]);
        };

        const fetchProfile = async (userId: string) => {
            try {
                const result = await withTimeout(
                    (async () =>
                        supabase
                            .from("profiles")
                            .select("*")
                            .eq("id", userId)
                            .single())(),
                    10000
                );
                const { data, error } = result;
                
                if (error) {
                    if (error.message?.includes("Lock broken")) {
                        // Harmless error from concurrent Supabase auth storage lock acquisitions
                        return null;
                    }
                    console.error("Error fetching profile:", error.message);
                    return null;
                }
                return data;
            } catch (err: any) {
                if (err?.message?.includes("Lock broken")) return null;
                console.error("fetchProfile exception:", err);
                return null;
            }
        };

        // Get initial session — use getSession (reads local storage, never fails on network)
        // then optionally validate with getUser (network call)
        const getInitialSession = async () => {
            try {
                // Step 1: Read session from local storage (instant, reliable)
                const {
                    data: { session },
                } = await withTimeout(supabase.auth.getSession(), 3000);

                if (!mounted.current) return;

                if (session?.user) {
                    // We have a local session — trust it immediately and hydrate profile in background.
                    setState({ user: session.user, profile: null, loading: false });

                    fetchProfile(session.user.id).then((profile) => {
                        if (!mounted.current) return;
                        setState((current) => ({
                            user: current.user ?? session.user,
                            profile,
                            loading: false,
                        }));
                    });

                    // Step 2: Validate with getUser in background (don't block UI)
                    // If this fails (network issue), we keep the session-based state
                    supabase.auth.getUser().then(({ data, error }) => {
                        if (!mounted.current) return;
                        if (error) {
                            if (error.message?.includes("Lock broken")) return;
                            // Network error or token expired — don't sign out,
                            // the onAuthStateChange listener will handle real sign-outs
                            console.warn("Background getUser check failed:", error.message);
                            return;
                        }
                        if (!data.user) {
                            // Token was truly invalid server-side
                            setState({ user: null, profile: null, loading: false });
                        }
                    }).catch(() => {
                        // Network completely down — keep existing session
                    });
                } else {
                    setState({ user: null, profile: null, loading: false });
                }
            } catch (err: any) {
                if (!err?.message?.includes("Lock broken")) {
                    console.error("getInitialSession exception:", err);
                }
                if (mounted.current) setState({ user: null, profile: null, loading: false });
            }
        };

        getInitialSession();

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted.current) return;

            try {
                if (session?.user) {
                    setState({ user: session.user, profile: null, loading: false });

                    fetchProfile(session.user.id).then((profile) => {
                        if (!mounted.current) return;
                        setState((current) => ({
                            user: current.user ?? session.user,
                            profile,
                            loading: false,
                        }));
                    });
                } else {
                    setState({ user: null, profile: null, loading: false });
                }
            } catch (err: any) {
                if (!err?.message?.includes("Lock broken")) {
                    console.error("onAuthStateChange error:", err);
                }
                if (mounted.current) setState({ user: session?.user || null, profile: null, loading: false });
            }
        });

        return () => {
            mounted.current = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setState({ user: null, profile: null, loading: false });
    };

    return {
        ...state,
        signOut,
        isAuthenticated: !!state.user,
        role: state.profile?.role ?? null,
        isFaculty: state.profile?.role === "faculty",
        isModerator:
            state.profile?.role === "president" ||
            state.profile?.role === "vice_president",
        isInventoryManager: state.profile?.role === "inventory_manager",
    };
}
