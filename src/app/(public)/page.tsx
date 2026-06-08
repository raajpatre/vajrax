import HomePageClient from "@/components/home/HomePageClient";
import { listActiveSponsors } from "@/actions/sponsors";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600; // revalidate homepage data at most once per hour

// VajraX was founded December 2025.
const FOUNDING_DATE = new Date(Date.UTC(2025, 11, 1));

function yearsSinceFounding(now = new Date()): number {
    let years = now.getUTCFullYear() - FOUNDING_DATE.getUTCFullYear();
    const beforeAnniversary =
        now.getUTCMonth() < FOUNDING_DATE.getUTCMonth() ||
        (now.getUTCMonth() === FOUNDING_DATE.getUTCMonth() &&
            now.getUTCDate() < FOUNDING_DATE.getUTCDate());
    if (beforeAnniversary) years -= 1;
    return Math.max(0, years);
}

export default async function HomePage() {
    const supabase = await createClient();

    const [sponsorsResult, membersResult, awardsResult] = await Promise.all([
        listActiveSponsors(),
        // Current members in the club (excludes the seeded admin account).
        supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .neq("display_name", "Dr. Admin"),
        // Awards = gallery items tagged "Achievement".
        supabase
            .from("gallery_items")
            .select("id", { count: "exact", head: true })
            .ilike("tag", "achievement"),
    ]);

    return (
        <HomePageClient
            sponsors={sponsorsResult.ok ? sponsorsResult.data : []}
            stats={{
                members: membersResult.count ?? 0,
                awards: awardsResult.count ?? 0,
                years: yearsSinceFounding(),
            }}
        />
    );
}
