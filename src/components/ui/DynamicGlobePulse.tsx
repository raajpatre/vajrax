"use client";

import dynamic from "next/dynamic";

export const GlobePulse = dynamic(
    () => import("@/components/ui/cobe-globe-pulse").then((mod) => mod.GlobePulse),
    { ssr: false }
);
