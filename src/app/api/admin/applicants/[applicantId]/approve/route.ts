import { NextResponse } from "next/server";
import { decryptApplicantPassword } from "@/lib/server/applicant-credentials";
import { getApplicantName, requireApplicantReviewer } from "@/lib/server/applicants";

type Params = {
    params: Promise<{ applicantId: string }>;
};

export async function POST(request: Request, { params }: Params) {
    const auth = await requireApplicantReviewer();

    if ("error" in auth) {
        return auth.error;
    }

    const body = await request.json().catch(() => ({}));
    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim() : null;
    const { applicantId } = await params;
    const { adminSupabase, profile } = auth;

    const { data: applicant, error: fetchError } = await adminSupabase
        .from("applicants")
        .select("*")
        .eq("id", applicantId)
        .single();

    if (fetchError || !applicant) {
        return NextResponse.json({ error: "Applicant not found." }, { status: 404 });
    }

    if (applicant.status === "approved") {
        return NextResponse.json({ error: "This applicant has already been approved." }, { status: 409 });
    }

    if (applicant.status !== "pending") {
        return NextResponse.json({ error: "Only pending applicants can be approved." }, { status: 409 });
    }

    const displayName = getApplicantName(applicant.first_name, applicant.last_name);

    const { data: createdUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
        email: applicant.email,
        password: decryptApplicantPassword(applicant.encrypted_password),
        email_confirm: true,
        user_metadata: {
            display_name: displayName,
            full_name: displayName,
        },
    });

    if (createUserError || !createdUser.user) {
        return NextResponse.json(
            { error: createUserError?.message || "Failed to create auth account." },
            { status: 400 }
        );
    }

    const authUserId = createdUser.user.id;
    const { error: profileError } = await adminSupabase.from("profiles").upsert({
        id: authUserId,
        display_name: displayName,
        contact_email: applicant.email,
        current_semester: applicant.current_semester,
        role: "member",
    });

    if (profileError) {
        await adminSupabase.auth.admin.deleteUser(authUserId);
        return NextResponse.json(
            { error: profileError.message || "Failed to create profile." },
            { status: 500 }
        );
    }

    const { error: updateError } = await adminSupabase
        .from("applicants")
        .update({
            status: "approved",
            review_note: reviewNote,
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", applicantId);

    if (updateError) {
        return NextResponse.json(
            { error: updateError.message || "Applicant was approved, but status update failed." },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        applicantId,
        message: `${displayName} has been approved and can now sign in.`,
    });
}
