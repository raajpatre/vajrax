import { FlaskConical, ShieldCheck } from "lucide-react";
import LabHistoryTable, { type LabHistoryEntry } from "@/components/lab/LabHistoryTable";
import { LAB_RESOURCES } from "@/lib/lab-resources";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_ROLES = new Set(["faculty", "president"]);

export default async function LabHistoryPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const canViewHistory = !!profile && ALLOWED_ROLES.has(profile.role);

    if (!canViewHistory) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <ShieldCheck className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                <p className="text-text-muted text-sm">
                    Only faculty and the president can access the lab booking history.
                </p>
            </div>
        );
    }

    const { data, error } = await supabase
        .from("resource_bookings")
        .select(
            "id, resource_name, start_time, end_time, created_at, status, booker:profiles!resource_bookings_user_id_fkey(display_name, role)"
        )
        .order("start_time", { ascending: false })
        .limit(200);

    const entries = ((data as LabHistoryEntry[] | null) ?? []).filter(Boolean);

    const resourceOptions = Array.from(
        new Set([
            ...LAB_RESOURCES,
            ...entries.map((entry) => entry.resource_name),
        ])
    );

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Lab Booking History</h1>
                    <p className="text-sm text-text-muted max-w-2xl">
                        Choose a lab resource to inspect its booking table, including who booked it, when, and for how
                        long.
                    </p>
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error.message}
                </div>
            ) : entries.length === 0 ? (
                <div className="glass p-4 md:p-5 md:p-8 md:p-16 text-center">
                    <FlaskConical className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                    <p className="text-text-muted text-sm">
                        Lab reservations will appear here once members start booking equipment.
                    </p>
                </div>
            ) : (
                <LabHistoryTable entries={entries} resources={resourceOptions} />
            )}
        </div>
    );
}
