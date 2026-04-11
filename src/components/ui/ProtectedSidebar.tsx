"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Package,
    ClipboardList,
    FlaskConical,
    Mail,
    FolderOpen,
    Users,
    LayoutDashboard,
    History,
    FileText,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/lib/hooks/useUser";

type SidebarLink = {
    href: string;
    label: string;
    icon: LucideIcon;
    section?: string;
    adminOnly?: boolean;
    facultyOnly?: boolean;
    inventoryOnly?: boolean;
};

const links: SidebarLink[] = [
    // Core
    { href: "/inventory", label: "Inventory", icon: Package, section: "CORE" },
    { href: "/lab", label: "Lab Booking", icon: FlaskConical, section: "CORE" },
    { href: "/my-requests", label: "My Requests", icon: ClipboardList, section: "CORE" },
    { href: "/project-invites", label: "Project Invites", icon: Mail, section: "CORE" },
    { href: "/projects/request", label: "Request Project", icon: FolderOpen, section: "CORE" },
    // Admin
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "ADMIN", adminOnly: true },
    { href: "/admin/members", label: "Members", icon: Users, section: "ADMIN", adminOnly: true },
    { href: "/admin/requests", label: "Equipment Requests", icon: Package, section: "ADMIN", inventoryOnly: true },
    { href: "/admin/inventory", label: "Manage Inventory", icon: Package, section: "ADMIN", inventoryOnly: true },
    { href: "/admin/inventory-history", label: "Inventory History", icon: History, section: "ADMIN", inventoryOnly: true },
    { href: "/admin/project-requests", label: "Project Proposals", icon: FileText, section: "ADMIN", adminOnly: true },
    { href: "/admin/lab-history", label: "Lab History", icon: FlaskConical, section: "ADMIN", facultyOnly: true },
];

export default function ProtectedSidebar() {
    const pathname = usePathname();
    const { isFaculty, isModerator, isInventoryManager } = useUser();
    const [collapsed, setCollapsed] = useState(false);

    const canAdmin = isFaculty || isModerator;
    const canInventory = isFaculty || isModerator || isInventoryManager;
    const canLabHistory = isFaculty || isModerator;

    const visibleLinks = links.filter((link) => {
        if (link.adminOnly && !canAdmin) return false;
        if (link.inventoryOnly && !canInventory) return false;
        if (link.facultyOnly && !canLabHistory) return false;
        return true;
    });

    const sections = Array.from(new Set(visibleLinks.map((l) => l.section)));

    return (
        <aside
            className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen z-40 border-r border-[rgba(59,73,76,0.15)] bg-[#0b0e14] transition-all duration-300 ${
                collapsed ? "w-[68px]" : "w-[260px]"
            }`}
        >
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[rgba(59,73,76,0.12)]">
                <Image
                    src="/vajrax-logo.png"
                    alt="VajraX logo"
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 object-contain"
                />
                {!collapsed && (
                    <Image
                        src="/vajrax-wordmark.png"
                        alt="VajraX"
                        width={156}
                        height={36}
                        className="h-5 w-auto object-contain"
                    />
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-2">
                {sections.map((section) => (
                    <div key={section} className="mb-2">
                        {!collapsed && (
                            <p className="sidebar-section-label">{section}</p>
                        )}
                        {visibleLinks
                            .filter((l) => l.section === section)
                            .map((link) => {
                                const isActive =
                                    pathname === link.href ||
                                    (link.href !== "/admin" && pathname.startsWith(link.href));
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`sidebar-link ${isActive ? "active" : ""} ${
                                            collapsed ? "justify-center !px-0" : ""
                                        }`}
                                        title={collapsed ? link.label : undefined}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        {!collapsed && <span>{link.label}</span>}
                                    </Link>
                                );
                            })}
                    </div>
                ))}
            </nav>

            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center justify-center gap-2 border-t border-[rgba(59,73,76,0.12)] py-3 text-text-muted hover:text-foreground transition-colors"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {collapsed ? (
                    <ChevronRight className="w-4 h-4" />
                ) : (
                    <>
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-xs">Collapse</span>
                    </>
                )}
            </button>
        </aside>
    );
}
