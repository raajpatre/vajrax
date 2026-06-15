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

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const PROFILE_ERROR_CACHE_TTL_MS = 15 * 1000;
const USER_VALIDATION_TTL_MS = 5 * 60 * 1000;

const profileCache = new Map<string, { profile: Profile | null; expiresAt: number }>();
const profileRequests = new Map<string, Promise<Profile | null>>();
let userValidationCache: { userId: string; user: User | null; expiresAt: number } | null = null;
let userValidationRequest: { userId: string; promise: Promise<User | null> } | null = null;

const isLockBrokenError = (err: unknown) =>
    err instanceof Error && err.message.includes("Lock broken");

const getErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : String(err);

const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number): Promise<T> => {
    return await Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
        ),
    ]);
};

export function useUser() {
    const [state, setState] = useState<UserState>({
        user: null,
        profile: null,
        loading: true,
    });

    // Stable supabase client reference
    const supabase = useMemo(() => createClient(), []);
    const mounted = useRef(true);
    const stateRef = useRef(state);

    const setUserState = (next: UserState | ((current: UserState) => UserState)) => {
        const resolved = typeof next === "function" ? next(stateRef.current) : next;
        stateRef.current = resolved;
        setState(resolved);
    };

    useEffect(() => {
        mounted.current = true;

        const fetchProfile = async (userId: string) => {
            const cached = profileCache.get(userId);
            if (cached && cached.expiresAt > Date.now()) return cached.profile;

            const inFlight = profileRequests.get(userId);
            if (inFlight) return inFlight;

            const request = (async () => {
                try {
                    const result = await withTimeout(
                        supabase
                            .from("profiles")
                            .select("*")
                            .eq("id", userId)
                            .single(),
                        10000
                    );
                    const { data, error } = result;

                    if (error) {
                        if (error.message?.includes("Lock broken")) {
                            return null;
                        }
                        console.error("Error fetching profile:", error.message);
                        profileCache.set(userId, {
                            profile: null,
                            expiresAt: Date.now() + PROFILE_ERROR_CACHE_TTL_MS,
                        });
                        return null;
                    }

                    profileCache.set(userId, {
                        profile: data,
                        expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
                    });
                    return data;
                } catch (err: unknown) {
                    if (isLockBrokenError(err)) return null;
                    console.error("fetchProfile exception:", err);
                    profileCache.set(userId, {
                        profile: null,
                        expiresAt: Date.now() + PROFILE_ERROR_CACHE_TTL_MS,
                    });
                    return null;
                } finally {
                    profileRequests.delete(userId);
                }
            })();

            profileRequests.set(userId, request);
            return request;
        };

        const hydrateUser = (user: User) => {
            const cached = profileCache.get(user.id);
            const cachedProfile = cached && cached.expiresAt > Date.now() ? cached.profile : null;

            setUserState((current) => ({
                user,
                profile: cachedProfile ?? (current.user?.id === user.id ? current.profile : null),
                loading: false,
            }));

            if (cached && cached.expiresAt > Date.now()) return;

            fetchProfile(user.id).then((profile) => {
                if (!mounted.current) return;
                setUserState((current) => {
                    if (current.user?.id !== user.id) return current;
                    return {
                        user: current.user ?? user,
                        profile,
                        loading: false,
                    };
                });
            });
        };

        const validateSessionUser = async (user: User) => {
            const cached = userValidationCache;
            if (cached && cached.userId === user.id && cached.expiresAt > Date.now()) {
                return cached.user;
            }
            if (userValidationRequest?.userId === user.id) {
                return userValidationRequest.promise;
            }

            const promise = supabase.auth
                .getUser()
                .then(({ data, error }) => {
                    if (error) {
                        if (error.message?.includes("Lock broken")) return user;
                        console.warn("Background getUser check failed:", error.message);
                        return user;
                    }
                    return data.user;
                })
                .catch(() => user)
                .then((validatedUser) => {
                    userValidationCache = {
                        userId: user.id,
                        user: validatedUser,
                        expiresAt: Date.now() + USER_VALIDATION_TTL_MS,
                    };
                    return validatedUser;
                })
                .finally(() => {
                    userValidationRequest = null;
                });

            userValidationRequest = { userId: user.id, promise };
            return promise;
        };

        const clearUser = () => {
            setUserState({ user: null, profile: null, loading: false });
        };

        const handleUserValidation = (user: User) => {
            try {
                validateSessionUser(user).then((validatedUser) => {
                    if (!mounted.current) return;
                    if (!validatedUser) clearUser();
                });
            } catch (err: unknown) {
                if (!isLockBrokenError(err)) {
                    console.warn("Background getUser check failed:", getErrorMessage(err));
                }
            }
        };

        // Get initial session — use getSession (reads local storage, never fails on network)
        // then validate with getUser at most once per cache window.
        const getInitialSession = async () => {
            try {
                // Step 1: Read session from local storage (instant, reliable)
                const {
                    data: { session },
                } = await withTimeout(supabase.auth.getSession(), 3000);

                if (!mounted.current) return;

                if (session?.user) {
                    // We have a local session — trust it immediately and hydrate profile in background.
                    hydrateUser(session.user);
                    handleUserValidation(session.user);
                } else {
                    clearUser();
                }
            } catch (err: unknown) {
                if (!isLockBrokenError(err)) {
                    console.error("getInitialSession exception:", err);
                }
                if (mounted.current) clearUser();
            }
        };

        getInitialSession();

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted.current) return;

            try {
                if (session?.user) {
                    const current = stateRef.current;
                    const cached = profileCache.get(session.user.id);
                    const hasFreshProfile = cached && cached.expiresAt > Date.now();
                    const isSameUser = current.user?.id === session.user.id;
                    const isRefocusNoise =
                        isSameUser &&
                        hasFreshProfile &&
                        (event === "SIGNED_IN" ||
                            event === "TOKEN_REFRESHED" ||
                            event === "INITIAL_SESSION");

                    if (isRefocusNoise) {
                        setUserState({
                            user: session.user,
                            profile: cached.profile ?? current.profile,
                            loading: false,
                        });
                        return;
                    }

                    hydrateUser(session.user);
                } else {
                    clearUser();
                }
            } catch (err: unknown) {
                if (!isLockBrokenError(err)) {
                    console.error("onAuthStateChange error:", err);
                }
                if (mounted.current) {
                    setUserState({ user: session?.user || null, profile: null, loading: false });
                }
            }
        });

        return () => {
            mounted.current = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    const signOut = async () => {
        await supabase.auth.signOut();
        userValidationCache = null;
        setUserState({ user: null, profile: null, loading: false });
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
