import { useState, useEffect } from "react";

type PageSizeConfig = { desktop: number; mobile: number };

export function usePageSize({ desktop, mobile }: PageSizeConfig): number {
    const [size, setSize] = useState(desktop); // SSR-safe default: desktop

    useEffect(() => {
        const update = () => setSize(window.innerWidth < 768 ? mobile : desktop);
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, [desktop, mobile]);

    return size;
}
