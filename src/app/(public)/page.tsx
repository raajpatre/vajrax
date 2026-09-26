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

    const [sponsorsResult, membersResult, awardsResult, galleryResult] = await Promise.all([
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
        // Fetch latest 30 gallery items to pick random photos from
        supabase
            .from("gallery_items")
            .select("title, media_url, cover_image_url")
            .limit(30)
            .order("created_at", { ascending: false }),
    ]);

    // Shuffle and pick 7 photos for the spiral
    const galleryItems = galleryResult.data || [];
    const validGallery = galleryItems.filter((item) => (item.cover_image_url || item.media_url) != null);
    const shuffledGallery = validGallery.sort(() => 0.5 - Math.random()).slice(0, 7);

    return (
        <HomePageClient
            sponsors={sponsorsResult.ok ? sponsorsResult.data : []}
            stats={{
                members: membersResult.count ?? 0,
                awards: awardsResult.count ?? 0,
                years: yearsSinceFounding(),
            }}
            spiralImages={shuffledGallery.map((item) => ({
                src: (item.cover_image_url || item.media_url) as string,
                alt: item.title,
            }))}
        />
    );
}
