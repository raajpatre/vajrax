import { NextResponse } from "next/server";
import { requireApplicantReviewer } from "@/lib/server/applicants";

export async function GET() {
    try {
        const auth = await requireApplicantReviewer();

        if ("error" in auth) {
            return auth.error;
        }

        const { adminSupabase } = auth;

        const { data, error } = await adminSupabase
            .from("applicants")
            .select("id, created_at, updated_at, first_name, last_name, email, current_semester, purpose, status, review_note, reviewed_at, reviewed_by")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("[applicants GET] Supabase error:", error);
            return NextResponse.json({ error: error.message || "Failed to load applicants." }, { status: 500 });
        }

        const rows = data ?? [];

        // Separately look up reviewer display names for reviewed applicants
        const reviewerIds = [...new Set(rows.map((r) => r.reviewed_by).filter(Boolean))] as string[];
        const reviewerMap: Record<string, string> = {};

        if (reviewerIds.length > 0) {
            const { data: profiles } = await adminSupabase
                .from("profiles")
                .select("id, display_name")
                .in("id", reviewerIds);

            for (const p of profiles ?? []) {
                reviewerMap[p.id] = p.display_name;
            }
        }

        const sorted = [...rows].sort((left, right) => {
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
                reviewerName: applicant.reviewed_by ? (reviewerMap[applicant.reviewed_by] ?? null) : null,
            })),
        });
    } catch (err) {
        console.error("[applicants GET] Unhandled error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unexpected server error." },
            { status: 500 }
        );
    }
}
