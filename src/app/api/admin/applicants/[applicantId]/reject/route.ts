import { NextResponse } from "next/server";
import { requireApplicantReviewer } from "@/lib/server/applicants";

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
        .select("id, status")
        .eq("id", applicantId)
        .single();

    if (fetchError || !applicant) {
        return NextResponse.json({ error: "Applicant not found." }, { status: 404 });
    }

    if (applicant.status === "approved") {
        return NextResponse.json({ error: "Approved applicants cannot be rejected." }, { status: 409 });
    }

    const { error: updateError } = await adminSupabase
        .from("applicants")
        .update({
            status: "rejected",
            review_note: reviewNote,
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", applicantId);

    if (updateError) {
        return NextResponse.json({ error: "Failed to reject applicant." }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        applicantId,
        message: "Applicant has been rejected.",
    });
}
