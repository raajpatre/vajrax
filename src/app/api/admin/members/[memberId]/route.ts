import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
    params: Promise<{ memberId: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
    const serverSupabase = await createServerClient();
    const {
        data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actorProfile, error: actorError } = await serverSupabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

    if (actorError || !actorProfile || !["faculty", "president", "vice_president"].includes(actorProfile.role)) {
        return NextResponse.json(
            { error: "Only faculty and club leadership can delete members." },
            { status: 403 }
        );
    }

    const { memberId } = await params;

    if (memberId === actorProfile.id) {
        return NextResponse.json(
            { error: "You cannot delete your own account from member management." },
            { status: 400 }
        );
    }

    const adminSupabase = createAdminClient();

    const { data: memberProfile, error: memberError } = await adminSupabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", memberId)
        .single();

    if (memberError || !memberProfile) {
        return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    const { error: profileDeleteError } = await adminSupabase
        .from("profiles")
        .delete()
        .eq("id", memberId);

    if (profileDeleteError) {
        return NextResponse.json(
            {
                error:
                    profileDeleteError.message ||
                    "Failed to delete the member profile. Remove related records first if required.",
            },
            { status: 400 }
        );
    }

    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(memberId);

    if (authDeleteError) {
        return NextResponse.json(
            {
                error:
                    authDeleteError.message ||
                    "Member profile was removed, but auth deletion failed.",
            },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        memberId,
        message: `${memberProfile.display_name} was deleted successfully.`,
    });
}
