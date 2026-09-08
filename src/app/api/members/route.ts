import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/members — returns all active member profiles for the attendee picker
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role")
        .order("display_name", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data ?? []);
}
