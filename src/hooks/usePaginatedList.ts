import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function usePaginatedList<T>(
    items: T[],
    pageSize: number
) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    // Parse the page from URL, defaulting to 1
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

    // Calculate total pages
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    
    // Clamp the current page to a safe range
    const safePage = Math.min(page, totalPages);
    
    // Compute offset and the slice of items for the current page
    const offset = (safePage - 1) * pageSize;
    const pageItems = items.slice(offset, offset + pageSize);

    // Update the URL and scroll back to top
    const setPage = useCallback((p: number) => {
        if (p === page) return;

        const params = new URLSearchParams(searchParams.toString());
        if (p === 1) {
            params.delete("page");
        } else {
            params.set("page", String(p));
        }
        
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        
        // scroll to top of list gracefully
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [router, pathname, searchParams, page]);

    return { pageItems, page: safePage, totalPages, setPage };
}
