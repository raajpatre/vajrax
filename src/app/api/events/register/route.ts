import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// ── Rate limiter (in-memory, per IP) ─────────────────────────────
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(ip, { count: 1, windowStart: now });
        return true;
    }
    if (record.count >= RATE_LIMIT_MAX) return false;
    record.count++;
    return true;
}

setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap.entries()) {
        if (now - val.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(key);
    }
}, 5 * 60 * 1000);

// ── Input validation schema ───────────────────────────────────────
const TeamMemberSchema = z.object({
    member_name: z.string().min(2).max(100),
    member_email: z.string().email().optional().or(z.literal("")),
    member_phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number").optional().or(z.literal("")),
    member_college: z.string().max(200).optional().or(z.literal("")),
});

const RegistrationSchema = z.object({
    event_id: z.string().uuid(),
    registration_type: z.enum(["individual", "team"]),
    team_name: z.string().min(2).max(100).optional(),
    leader_name: z.string().min(2).max(100),
    leader_email: z.string().email(),
    leader_phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
    leader_college: z.string().min(2).max(200),
    custom_responses: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional().default({}),
    team_members: z.array(TeamMemberSchema).optional().default([]),
    website: z.string().max(0, "Bot detected").optional(),
});

function generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function sanitize(str: string): string {
    return str.replace(/<[^>]*>/g, "").trim();
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get("origin") ?? "";
    const host = request.headers.get("host") ?? "";
    const allowedOrigins = [
        `https://${host}`,
        `http://${host}`,
        "http://localhost:3000",
        "http://localhost:3001",
    ];
    if (!allowedOrigins.some((o) => origin.startsWith(o))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";

    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { error: "Too many registration attempts. Please try again in 10 minutes." },
            { status: 429 }
        );
    }

    let body: unknown;
    try {
        const text = await request.text();
        if (text.length > 50_000) {
            return NextResponse.json({ error: "Request payload too large." }, { status: 413 });
        }
        body = JSON.parse(text);
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = RegistrationSchema.safeParse(body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return NextResponse.json({ error: firstError.message }, { status: 422 });
    }

    const data = parsed.data;

    if (data.website && data.website.length > 0) {
        return NextResponse.json({ success: true, registration_code: "XXXXX" });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id, starts_at, registration_mode, registration_open, registration_deadline, max_registrations, team_size_min, team_size_max, team_size_strict, custom_fields")
        .eq("id", data.event_id)
        .single();

    if (eventError || !event) {
        return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (!event.registration_open && event.registration_mode === "none") {
        return NextResponse.json({ error: "Registration is currently closed for this event." }, { status: 400 });
    }

    if (event.starts_at && new Date(event.starts_at) < new Date()) {
        return NextResponse.json({ error: "This event has already started. Registration is closed." }, { status: 400 });
    }

    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
        return NextResponse.json({ error: "Registration deadline has passed." }, { status: 400 });
    }

    if (event.registration_mode === "none" || event.registration_mode === "external") {
        return NextResponse.json({ error: "This event does not accept online registrations." }, { status: 400 });
    }
    if (event.registration_mode === "individual" && data.registration_type === "team") {
        return NextResponse.json({ error: "This event only accepts individual registrations." }, { status: 400 });
    }
    if (event.registration_mode === "team" && data.registration_type === "individual") {
        return NextResponse.json({ error: "This event only accepts team registrations." }, { status: 400 });
    }

    if (data.registration_type === "team") {
        const memberCount = (data.team_members?.length ?? 0) + 1;
        if (memberCount < event.team_size_min) {
            return NextResponse.json(
                { error: `Team must have at least ${event.team_size_min} members (including leader).` },
                { status: 400 }
            );
        }
        if (event.team_size_strict && memberCount !== event.team_size_max) {
            return NextResponse.json(
                { error: `Team must have exactly ${event.team_size_max} members (including leader).` },
                { status: 400 }
            );
        }
        if (memberCount > event.team_size_max) {
            return NextResponse.json(
                { error: `Team cannot have more than ${event.team_size_max} members.` },
                { status: 400 }
            );
        }
        if (!data.team_name?.trim()) {
            return NextResponse.json({ error: "Team name is required." }, { status: 400 });
        }
    }

    if (event.max_registrations) {
        const { count } = await supabase
            .from("event_registrations")
            .select("*", { count: "exact", head: true })
            .eq("event_id", data.event_id)
            .is("_hp", null);

        if (count !== null && count >= event.max_registrations) {
            return NextResponse.json({ error: "Sorry, registrations are full for this event." }, { status: 400 });
        }
    }

    const { data: existing } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", data.event_id)
        .eq("leader_email", data.leader_email.toLowerCase())
        .maybeSingle();

    if (existing) {
        return NextResponse.json(
            { error: "You have already registered for this event with this email address." },
            { status: 409 }
        );
    }

    let regCode = generateCode();
    for (let i = 0; i < 5; i++) {
        const { data: codeExists } = await supabase
            .from("event_registrations")
            .select("id")
            .eq("registration_code", regCode)
            .maybeSingle();
        if (!codeExists) break;
        regCode = generateCode();
    }

    const { data: registration, error: insertError } = await adminSupabase
        .from("event_registrations")
        .insert({
            event_id: data.event_id,
            registration_type: data.registration_type,
            team_name: data.team_name ? sanitize(data.team_name) : null,
            leader_name: sanitize(data.leader_name),
            leader_email: data.leader_email.toLowerCase().trim(),
            leader_phone: data.leader_phone.trim(),
            leader_college: sanitize(data.leader_college),
            custom_responses: data.custom_responses ?? {},
            registration_code: regCode,
        })
        .select("id")
        .single();

    if (insertError || !registration) {
        console.error("Registration insert error:", insertError);
        return NextResponse.json(
            { error: "Failed to save registration. Please try again." },
            { status: 500 }
        );
    }

    if (data.registration_type === "team" && data.team_members && data.team_members.length > 0) {
        const members = data.team_members.map((m, i) => ({
            registration_id: registration.id,
            member_name: sanitize(m.member_name),
            member_email: m.member_email ? m.member_email.toLowerCase().trim() : null,
            member_phone: m.member_phone?.trim() || null,
            member_college: m.member_college ? sanitize(m.member_college) : null,
            position: i,
        }));

        const { error: membersError } = await adminSupabase.from("event_team_members").insert(members);
        if (membersError) {
            console.error("Team members insert error:", membersError);
        }
    }

    return NextResponse.json({
        success: true,
        registration_code: regCode,
        message: "Registration successful!",
    });
}
