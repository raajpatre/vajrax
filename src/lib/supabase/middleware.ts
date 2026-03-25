import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session — important for Server Components
    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    } catch (err) {
        // Network error — don't redirect, just let the page load normally
        // The client-side useUser hook will handle auth state from localStorage
        console.warn("Middleware getUser failed:", err);
        return supabaseResponse;
    }

    // Protected routes — redirect to login if not authenticated
    const protectedPaths = [
        "/feed",
        "/inventory",
        "/lab",
        "/profile",
        "/admin",
        "/project-invites",
        "/my-requests",
    ];
    const isProtected = protectedPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (isProtected && !user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirect", request.nextUrl.pathname);
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from home and auth pages
    if (user && (
        request.nextUrl.pathname === "/" ||
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/signup")
    )) {
        const url = request.nextUrl.clone();
        url.pathname = "/feed";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
