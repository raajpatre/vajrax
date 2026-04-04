"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/login");
    }, [router]);

    return (
        <div className="glass-strong p-4 md:p-5 md:p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-light mb-3" />
            <p className="text-sm text-text-muted">Redirecting to login...</p>
        </div>
    );
}
