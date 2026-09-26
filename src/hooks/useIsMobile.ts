import { useState, useEffect } from "react";

export function useIsMobile(breakpoint = 768): boolean {
    const [isMobile, setIsMobile] = useState(false); // false = desktop as SSR default
    
    useEffect(() => {
        const update = () => setIsMobile(window.innerWidth < breakpoint);
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, [breakpoint]);
    
    return isMobile;
}
