export function TallCardSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="flex flex-col gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="relative rounded-md overflow-hidden"
                    style={{
                        background: "#0d1117",
                        border: "1px solid rgba(0,229,255,0.08)",
                        minHeight: "200px"
                    }}
                >
                    <div className="p-5 flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="h-4 w-1/3 rounded-sm skeleton-shimmer" />
                            <div className="h-5 w-20 rounded-sm skeleton-shimmer" />
                        </div>
                        
                        {/* Info lines */}
                        <div className="flex gap-4">
                            <div className="h-2.5 w-24 rounded-sm skeleton-shimmer" />
                            <div className="h-2.5 w-24 rounded-sm skeleton-shimmer" />
                        </div>
                        
                        {/* Blockquote / Content block */}
                        <div className="pl-4 mt-2" style={{ borderLeft: "2px solid rgba(0,229,255,0.2)" }}>
                            <div className="h-2 w-16 rounded-sm skeleton-shimmer mb-3" />
                            <div className="h-3 w-full rounded-sm skeleton-shimmer mb-2" />
                            <div className="h-3 w-4/5 rounded-sm skeleton-shimmer" />
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex gap-2 mt-2">
                            <div className="h-9 w-24 rounded-sm skeleton-shimmer" />
                            <div className="h-9 w-24 rounded-sm skeleton-shimmer" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
