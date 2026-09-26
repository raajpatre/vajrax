export function ListRowSkeleton({ count = 8, tall = false }: { count?: number; tall?: boolean }) {
    return (
        <div className="flex flex-col gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="relative flex items-center rounded-md overflow-hidden"
                    style={{
                        background: "#0d1117",
                        border: "1px solid rgba(0,229,255,0.08)",
                        height: tall ? "80px" : "72px"
                    }}
                >
                    {/* Left accent bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] skeleton-shimmer opacity-50" />
                    
                    <div className="w-full flex flex-col gap-3 pl-5 pr-4">
                        <div className="flex items-center justify-between">
                            <div className="h-3 w-1/3 rounded-sm skeleton-shimmer" />
                            <div className="h-4 w-16 rounded-sm skeleton-shimmer" />
                        </div>
                        <div className="h-2.5 w-1/2 rounded-sm skeleton-shimmer" />
                    </div>
                </div>
            ))}
        </div>
    );
}
