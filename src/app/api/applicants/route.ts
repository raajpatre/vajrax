import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptApplicantPassword } from "@/lib/server/applicant-credentials";
import { validateApplicantSubmission } from "@/lib/server/applicants";

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = validateApplicantSubmission(body ?? {});

    if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { value } = parsed;

    const { data: existingApplicants, error: applicantLookupError } = await adminSupabase
        .from("applicants")
        .select("id, status")
        .eq("email", value.email);

    if (applicantLookupError) {
        return NextResponse.json({ error: "Unable to submit application right now." }, { status: 500 });
    }

    if (existingApplicants?.some((applicant) => applicant.status === "pending")) {
        return NextResponse.json(
            { error: "An application with this email is already pending review." },
            { status: 409 }
        );
    }

    if (existingApplicants?.some((applicant) => applicant.status === "approved")) {
        return NextResponse.json(
            { error: "This email is already associated with an approved applicant." },
            { status: 409 }
        );
    }

    const { data: existingProfiles, error: profileLookupError } = await adminSupabase
        .from("profiles")
        .select("id")
        .eq("contact_email", value.email)
        .limit(1);

    if (profileLookupError) {
        return NextResponse.json({ error: "Unable to submit application right now." }, { status: 500 });
    }

    if ((existingProfiles ?? []).length > 0) {
        return NextResponse.json(
            { error: "This email is already associated with an existing member." },
            { status: 409 }
        );
    }

    const { error: insertError } = await adminSupabase.from("applicants").insert({
        first_name: value.firstName,
        last_name: value.lastName,
        email: value.email,
        encrypted_password: encryptApplicantPassword(value.password),
        current_semester: value.currentSemester,
        purpose: value.purpose,
        status: "pending",
    });

    if (insertError) {
        return NextResponse.json(
            { error: insertError.message || "Failed to submit application." },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        message: "Your application has been submitted for review.",
    });
}
