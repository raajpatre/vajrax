"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, Zap, LogIn, LogOut, User, Users, LayoutDashboard, Package, FolderOpen, History, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";

const publicLinks = [
    { href: "/", label: "Home" },
    { href: "/projects", label: "Projects" },
    { href: "/gallery", label: "Gallery" },
    { href: "/events", label: "Events" },
    { href: "/innovators", label: "Our Innovators" },
    { href: "/contact", label: "Contact" },
];

const roleLabels: Record<string, { label: string; class: string }> = {
    member: { label: "Member", class: "badge-member" },
    president: { label: "President", class: "badge-president" },
    vice_president: { label: "VP", class: "badge-vp" },
    faculty: { label: "Faculty", class: "badge-faculty" },
};

export default function Navbar() {
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const { user, profile, loading, isAuthenticated, signOut, isFaculty, isModerator } = useUser();

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        setIsMobileOpen(false);
        setShowUserMenu(false);
    }, [pathname]);

    const handleSignOut = async () => {
        await signOut();
        setShowUserMenu(false);
        window.location.href = "/";
    };

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                        ? "glass-strong shadow-lg shadow-black/20"
                        : "bg-transparent"
                    }`}
                style={{ height: "var(--nav-height)" }}
            >
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center group-hover:bg-primary/30 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300">
                            <Zap className="w-5 h-5 text-primary-light" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">
                            <span className="text-gradient">Vajra</span>
                            <span className="text-foreground">X</span>
                        </span>
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-1">
                        {publicLinks.filter(link => !(isAuthenticated && (link.href === "/" || link.href === "/contact"))).map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                                            ? "text-primary-light"
                                            : "text-text-secondary hover:text-foreground hover:bg-white/[0.03]"
                                        }`}
                                >
                                    {link.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="navbar-indicator"
                                            className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}

                        {/* Dashboard link for authenticated users */}
                        {isAuthenticated && (
                            <Link
                                href="/feed"
                                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${pathname.startsWith("/feed")
                                        ? "text-primary-light"
                                        : "text-text-secondary hover:text-foreground hover:bg-white/[0.03]"
                                    }`}
                            >
                                Feed
                                {pathname.startsWith("/feed") && (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                            </Link>
                        )}
                        {isAuthenticated && (
                            <Link
                                href="/inventory"
                                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${pathname.startsWith("/inventory")
                                        ? "text-primary-light"
                                        : "text-text-secondary hover:text-foreground hover:bg-white/[0.03]"
                                    }`}
                            >
                                Inventory
                                {pathname.startsWith("/inventory") && (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                            </Link>
                        )}
                    </div>

                    {/* Auth section + Mobile toggle */}
                    <div className="flex items-center gap-3">
                        {loading ? (
                            <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />
                        ) : isAuthenticated && profile ? (
                            /* Logged in — Avatar + dropdown */
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.03] transition-all"
                                >
                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
                                        {profile.avatar_url ? (
                                            <img
                                                src={profile.avatar_url}
                                                alt={profile.display_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-4 h-4 text-primary-light" />
                                        )}
                                    </div>
                                    <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                                        {profile.display_name}
                                    </span>
                                    {/* Role badge */}
                                    {profile.role && roleLabels[profile.role] && (
                                        <span
                                            className={`badge text-[9px] hidden sm:inline-flex ${roleLabels[profile.role].class
                                                }`}
                                        >
                                            {roleLabels[profile.role].label}
                                        </span>
                                    )}
                                </button>

                                {/* Dropdown */}
                                <AnimatePresence>
                                    {showUserMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 top-full mt-2 w-56 glass-strong p-2 rounded-xl shadow-xl shadow-black/30"
                                        >
                                            <div className="px-3 py-2 border-b border-border mb-1">
                                                <p className="text-sm font-medium truncate">
                                                    {profile.display_name}
                                                </p>
                                                <p className="text-xs text-text-muted truncate">
                                                    {user?.email}
                                                </p>
                                            </div>
                                            <Link
                                                href={`/profile/${user?.id}`}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                            >
                                                <User className="w-4 h-4" />
                                                Profile
                                            </Link>

                                            <Link
                                                href="/inventory"
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                            >
                                                <Package className="w-4 h-4" />
                                                Inventory
                                            </Link>
                                            <Link
                                                href="/project-invites"
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                            >
                                                <Mail className="w-4 h-4" />
                                                Project Invites
                                            </Link>
                                            {(isFaculty || isModerator) && (
                                                <>
                                                    <div className="border-t border-border my-1" />
                                                    <p className="px-3 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Admin</p>
                                                    <Link
                                                        href="/admin/members"
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                    >
                                                        <Users className="w-4 h-4" />
                                                        Manage Members
                                                    </Link>
                                                    <Link
                                                        href="/admin/requests"
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                    >
                                                        <Package className="w-4 h-4" />
                                                        Equipment Requests
                                                    </Link>
                                                    <Link
                                                        href="/admin/project-requests"
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                    >
                                                        <FolderOpen className="w-4 h-4" />
                                                        Project Requests
                                                    </Link>
                                                    <Link
                                                        href="/admin/inventory-history"
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                    >
                                                        <History className="w-4 h-4" />
                                                        Inventory History
                                                    </Link>
                                                </>
                                            )}
                                            <div className="border-t border-border my-1" />
                                            <button
                                                onClick={handleSignOut}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all w-full text-left"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign Out
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            /* Not logged in — Sign In button */
                            <Link href="/login" className="btn-primary text-sm !py-2 !px-5">
                                <LogIn className="w-4 h-4" />
                                <span className="hidden sm:inline">Sign In</span>
                            </Link>
                        )}

                        <button
                            className="md:hidden btn-ghost !p-2"
                            onClick={() => setIsMobileOpen(!isMobileOpen)}
                            aria-label="Toggle menu"
                        >
                            {isMobileOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile menu */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-x-0 top-[var(--nav-height)] z-40 glass-strong p-4 md:hidden"
                    >
                        <div className="flex flex-col gap-1">
                            {publicLinks.filter(link => !(isAuthenticated && (link.href === "/" || link.href === "/contact"))).map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                                ? "text-primary-light bg-primary/10"
                                                : "text-text-secondary hover:text-foreground hover:bg-white/[0.03]"
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                            {isAuthenticated && (
                                <>
                                    <Link
                                        href="/feed"
                                        className="px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                    >
                                        Feed
                                    </Link>
                                    <Link
                                        href="/inventory"
                                        className="px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                    >
                                        Inventory
                                    </Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
