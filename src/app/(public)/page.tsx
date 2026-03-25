import HomePageClient from "@/components/home/HomePageClient";
import { listActiveSponsors } from "@/actions/sponsors";

export default async function HomePage() {
    const sponsorsResult = await listActiveSponsors();

    return (
        <HomePageClient
            sponsors={sponsorsResult.ok ? sponsorsResult.data : []}
        />
    );
}
