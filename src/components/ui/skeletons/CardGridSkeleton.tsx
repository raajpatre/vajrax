export function CardGridSkeleton({ count = 9 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="relative flex flex-col rounded-md overflow-hidden"
                    style={{
                        background: "#0d1117",
                        border: "1px solid rgba(0,229,255,0.08)",
                        height: "280px"
                    }}
                >
                    {/* Image block skeleton */}
                    <div className="h-[160px] w-full skeleton-shimmer shrink-0" />
                    
                    {/* Text lines skeleton */}
                    <div className="p-4 flex flex-col gap-3 flex-1">
                        <div className="h-3 w-3/4 rounded-sm skeleton-shimmer" />
                        <div className="h-2.5 w-1/2 rounded-sm skeleton-shimmer" />
                        <div className="h-2 w-5/6 rounded-sm skeleton-shimmer mt-auto" />
                    </div>
                </div>
            ))}
        </div>
    );
}
