"use client";

import { useUser } from "@/lib/hooks/useUser";
import Link from "next/link";
import {
    ShieldCheck,
    Users,
    Package,
    ClipboardList,
    Newspaper,
    History,
    Loader2,
    ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboard() {
    const { isModerator, isFaculty, loading, role } = useUser();
    const canViewLabHistory = role === "faculty" || role === "president";

    const adminLinks = [
        {
            href: "/admin/members",
            label: "Member Management",
            desc: "View all members, change roles",
            icon: <Users className="w-5 h-5" />,
            color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
        },
        {
            href: "/admin/inventory",
            label: "Inventory Management",
            desc: "Add, edit, or remove equipment",
            icon: <Package className="w-5 h-5" />,
            color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        },
        {
            href: "/admin/requests",
            label: "Equipment Requests",
            desc: "Approve or reject pending requests",
            icon: <ClipboardList className="w-5 h-5" />,
            color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
        },
        {
            href: "/admin/posts",
            label: "Post Moderation",
            desc: "Review and moderate feed posts",
            icon: <Newspaper className="w-5 h-5" />,
            color: "text-violet-400 bg-violet-400/10 border-violet-400/20",
        },
        ...(canViewLabHistory
            ? [
                {
                    href: "/admin/lab-history",
                    label: "Lab Booking History",
                    desc: "Review which equipment was booked by whom",
                    icon: <History className="w-5 h-5" />,
                    color: "text-sky-300 bg-sky-400/10 border-sky-400/20",
                },
            ]
            : []),
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
            </div>
        );
    }

    if (!isModerator && !isFaculty) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <ShieldCheck className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                <p className="text-text-muted text-sm">
                    Only club leadership and faculty can access the admin panel.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Admin Panel</h1>
                    <p className="text-sm text-text-muted">
                        Manage your club from one place
                    </p>
                </div>
            </div>

            {/* Links */}
            <div className="grid gap-3">
                {adminLinks.map((link, i) => (
                    <motion.div
                        key={link.href}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <Link
                            href={link.href}
                            className="glass p-5 flex items-center gap-4 group hover:border-primary/30 transition-all"
                        >
                            <div
                                className={`w-10 h-10 rounded-xl border flex items-center justify-center ${link.color}`}
                            >
                                {link.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-sm group-hover:text-primary-light transition-colors">
                                    {link.label}
                                </h3>
                                <p className="text-xs text-text-muted">{link.desc}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary-light transition-colors" />
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
