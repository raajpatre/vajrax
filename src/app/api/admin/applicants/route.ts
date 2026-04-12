import { NextResponse } from "next/server";
import { requireApplicantReviewer } from "@/lib/server/applicants";

export async function GET() {
    const auth = await requireApplicantReviewer();

    if ("error" in auth) {
        return auth.error;
    }

    const { adminSupabase } = auth;
    const { data, error } = await adminSupabase
        .from("applicants")
        .select("*, reviewer:profiles!applicants_reviewed_by_fkey(display_name)")
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: "Failed to load applicants." }, { status: 500 });
    }

    const sorted = [...(data ?? [])].sort((left, right) => {
        if (left.status === right.status) {
            return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        }

        if (left.status === "pending") return -1;
        if (right.status === "pending") return 1;
        if (left.status === "rejected") return -1;
        if (right.status === "rejected") return 1;
        return 0;
    });

    return NextResponse.json({
        applicants: sorted.map((applicant) => ({
            ...applicant,
            reviewerName: Array.isArray(applicant.reviewer)
                ? applicant.reviewer[0]?.display_name ?? null
                : applicant.reviewer?.display_name ?? null,
        })),
    });
}
