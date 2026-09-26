import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginatorProps {
    page: number;
    totalPages: number;
    onPageChange: (p: number) => void;
}

export function Paginator({ page, totalPages, onPageChange }: PaginatorProps) {
    if (totalPages <= 1) return null;

    // Generate page numbers
    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | string)[] = [1];
        
        if (page > 3) pages.push("...");
        
        const start = Math.max(2, page - 1);
        const end = Math.min(totalPages - 1, page + 1);
        
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        
        if (page < totalPages - 2) pages.push("...");
        
        pages.push(totalPages);
        
        return pages;
    };

    const pages = getPageNumbers();

    return (
        <div className="flex flex-col items-center mt-8 mb-4">
            <div className="flex items-center justify-center gap-1">
                <button
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="flex items-center justify-center w-8 h-8 rounded-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                        color: page === 1 ? "#4a5568" : "#8b9ab0",
                        border: "1px solid",
                        borderColor: page === 1 ? "transparent" : "rgba(0,229,255,0.14)",
                    }}
                    onMouseOver={(e) => {
                        if (page !== 1) {
                            e.currentTarget.style.borderColor = "rgba(0,229,255,0.30)";
                            e.currentTarget.style.color = "#f0f4ff";
                        }
                    }}
                    onMouseOut={(e) => {
                        if (page !== 1) {
                            e.currentTarget.style.borderColor = "rgba(0,229,255,0.14)";
                            e.currentTarget.style.color = "#8b9ab0";
                        }
                    }}
                >
                    <ChevronLeft size={14} />
                </button>

                {pages.map((p, i) => (
                    typeof p === "string" ? (
                        <span key={`ellipsis-${i}`} className="flex items-center justify-center w-8 h-8 font-mono text-[11px] text-[#4a5568]">
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className="flex items-center justify-center w-8 h-8 rounded-sm font-mono text-[11px] tracking-[0.08em] transition-all"
                            style={
                                page === p
                                    ? {
                                          background: "rgba(0,229,255,0.12)",
                                          borderColor: "rgba(0,229,255,0.45)",
                                          color: "#00e5ff",
                                          border: "1px solid",
                                      }
                                    : {
                                          background: "transparent",
                                          borderColor: "rgba(0,229,255,0.14)",
                                          color: "#8b9ab0",
                                          border: "1px solid",
                                      }
                            }
                            onMouseOver={(e) => {
                                if (page !== p) {
                                    e.currentTarget.style.borderColor = "rgba(0,229,255,0.30)";
                                    e.currentTarget.style.color = "#f0f4ff";
                                }
                            }}
                            onMouseOut={(e) => {
                                if (page !== p) {
                                    e.currentTarget.style.borderColor = "rgba(0,229,255,0.14)";
                                    e.currentTarget.style.color = "#8b9ab0";
                                }
                            }}
                        >
                            {p}
                        </button>
                    )
                ))}

                <button
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="flex items-center justify-center w-8 h-8 rounded-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                        color: page === totalPages ? "#4a5568" : "#8b9ab0",
                        border: "1px solid",
                        borderColor: page === totalPages ? "transparent" : "rgba(0,229,255,0.14)",
                    }}
                    onMouseOver={(e) => {
                        if (page !== totalPages) {
                            e.currentTarget.style.borderColor = "rgba(0,229,255,0.30)";
                            e.currentTarget.style.color = "#f0f4ff";
                        }
                    }}
                    onMouseOut={(e) => {
                        if (page !== totalPages) {
                            e.currentTarget.style.borderColor = "rgba(0,229,255,0.14)";
                            e.currentTarget.style.color = "#8b9ab0";
                        }
                    }}
                >
                    <ChevronRight size={14} />
                </button>
            </div>
            <div className="font-mono text-[10px] text-[#4a5568] mt-2 text-center">
                PAGE {page} OF {totalPages}
            </div>
        </div>
    );
}
