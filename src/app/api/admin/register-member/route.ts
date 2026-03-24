import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    // Verify the caller is faculty/president
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role
    const { data: profile } = await serverSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || !["faculty", "president"].includes(profile.role)) {
        return NextResponse.json(
            { error: "Only faculty and presidents can register members" },
            { status: 403 }
        );
    }

    const { email, password, displayName } = await request.json();

    if (!email || !password || !displayName) {
        return NextResponse.json(
            { error: "Email, password, and display name are required" },
            { status: 400 }
        );
    }

    if (password.length < 6) {
        return NextResponse.json(
            { error: "Password must be at least 6 characters" },
            { status: 400 }
        );
    }

    // Use admin client with service role to create user without email verification
    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm, no verification email
        user_metadata: {
            full_name: displayName,
        },
    });

    if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    return NextResponse.json({
        success: true,
        userId: newUser.user.id,
        message: `Member "${displayName}" has been registered successfully.`,
    });
}
