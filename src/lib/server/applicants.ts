import "server-only";

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApplicantDisplayName, isApplicantReviewer, normalizeApplicantEmail } from "@/lib/applicants";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ApplicantSubmission = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    currentSemester: number;
    purpose: string;
};

export function validateApplicantSubmission(payload: Partial<ApplicantSubmission>) {
    const firstName = payload.firstName?.trim() ?? "";
    const lastName = payload.lastName?.trim() ?? "";
    const email = normalizeApplicantEmail(payload.email ?? "");
    const password = payload.password ?? "";
    const currentSemester = Number(payload.currentSemester);
    const purpose = payload.purpose?.trim() ?? "";

    if (!firstName || !lastName || !email || !password || !purpose) {
        return { error: "All fields are required." };
    }

    if (!EMAIL_REGEX.test(email)) {
        return { error: "Please enter a valid email address." };
    }

    if (password.length < 6) {
        return { error: "Password must be at least 6 characters long." };
    }

    if (!Number.isInteger(currentSemester) || currentSemester < 1 || currentSemester > 8) {
        return { error: "Current semester must be between 1 and 8." };
    }

    return {
        value: {
            firstName,
            lastName,
            email,
            password,
            currentSemester,
            purpose,
        } satisfies ApplicantSubmission,
    };
}

export async function requireApplicantReviewer() {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return {
            error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, role, display_name")
        .eq("id", user.id)
        .single();

    if (error || !profile || !isApplicantReviewer(profile.role)) {
        return {
            error: NextResponse.json(
                { error: "Only faculty, president, and vice president can review applicants." },
                { status: 403 }
            ),
        };
    }

    return { user, profile, supabase, adminSupabase: createAdminClient() };
}

export function getApplicantName(firstName: string, lastName: string) {
    return getApplicantDisplayName(firstName, lastName);
}
