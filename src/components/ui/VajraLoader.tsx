"use client";

import dynamic from "next/dynamic";

const DotLottieReact = dynamic(
    () => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
    { ssr: false }
);

interface VajraLoaderProps {
    /** Message shown below the animation */
    message?: string;
    /** Size of the animation container in px (default: 160) */
    size?: number;
    /** Whether to display as a full-page overlay (default: false) */
    fullPage?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * VajraX branded loading indicator powered by the dotLottie chatbot animation.
 * Use in place of generic spinners for all network/fetch loading states.
 */

// Direct import of the animation payload guarantees it works without Worker CORS issues
import animationData from "@/assets/vajra-loader.json";

export default function VajraLoader({
    message,
    size = 160,
    fullPage = false,
    className = "",
}: VajraLoaderProps) {
    const content = (
        <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
            <div style={{ width: size, height: size }}>
                <DotLottieReact
                    data={animationData}
                    loop
                    autoplay
                    style={{ width: size, height: size }}
                />
            </div>
            {message && (
                <p className="text-sm text-text-muted animate-pulse">{message}</p>
            )}
        </div>
    );

    if (fullPage) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                {content}
            </div>
        );
    }

    return content;
}
