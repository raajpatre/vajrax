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

        const fetchProfile = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", userId)
                    .single();
                
                if (error) {
                    console.error("Error fetching profile:", error.message);
                    return null;
                }
                return data;
            } catch (err) {
                console.error("fetchProfile exception:", err);
                return null;
            }
        };

        // Get initial session
        const getInitialSession = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!mounted.current) return;

            try {
                if (user) {
                    const profile = await fetchProfile(user.id);
                    if (mounted.current) {
                        setState({ user, profile, loading: false });
                    }
                } else {
                    setState({ user: null, profile: null, loading: false });
                }
            } catch (err) {
                console.error("getInitialSession error:", err);
                if (mounted.current) setState({ user, profile: null, loading: false });
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
                    const profile = await fetchProfile(session.user.id);
                    if (mounted.current) {
                        setState({ user: session.user, profile, loading: false });
                    }
                } else {
                    setState({ user: null, profile: null, loading: false });
                }
            } catch (err) {
                console.error("onAuthStateChange error:", err);
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
    };
}
