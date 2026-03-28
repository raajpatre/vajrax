"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, Zap, LogIn, LogOut, User, Users, Package, FolderOpen, History, Mail, FlaskConical } from "lucide-react";
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
    website_manager: { label: "Website Manager", class: "badge-website-manager" },
    printing_head: { label: "3D Printing Head", class: "badge-printing-head" },
    inventory_manager: { label: "Inventory Manager", class: "badge-member" },
};

export default function Navbar() {
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { user, profile, loading, isAuthenticated, signOut, isFaculty, isModerator } = useUser();
    const canViewLabHistory = profile?.role === "faculty" || profile?.role === "president";

    useEffect(() => {
        let frameId = 0;

        const updateScrollState = () => {
            frameId = 0;
            setIsScrolled(window.scrollY > 20);
        };

        const handleScroll = () => {
            if (frameId) return;
            frameId = window.requestAnimationFrame(updateScrollState);
        };

        updateScrollState();
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (frameId) window.cancelAnimationFrame(frameId);
        };
    }, []);

    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    const handleSignOut = async () => {
        await signOut();
        setIsMobileOpen(false);
        window.location.href = "/";
    };

    return (
        <>
            <nav
                className="fixed top-0 left-0 right-0 z-[80] pointer-events-none"
                style={{ height: "var(--nav-height)" }}
            >
                <div
                    className={`pointer-events-auto mx-auto flex h-full w-full items-center px-6 transition-[max-width,margin-top,background-color,border-color,box-shadow,border-radius] duration-300 ease-out ${isScrolled
                        ? "mt-2 max-w-5xl rounded-[22px] glass-strong border-cyan-200/20 shadow-[0_24px_62px_rgba(0,0,0,0.5)]"
                        : "mt-0 max-w-none border-b border-cyan-200/15 bg-[linear-gradient(180deg,rgba(8,22,40,0.74),rgba(6,16,30,0.58))] backdrop-blur-2xl"
                        }`}
                    style={{
                        transform: "translateZ(0)",
                        backfaceVisibility: "hidden",
                        willChange: "max-width, margin-top, border-radius",
                    }}
                >
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,rgba(123,97,255,0),rgba(123,97,255,0.72),rgba(76,201,240,0.72),rgba(31,232,216,0.35),rgba(31,232,216,0))] animate-[aurora-shift_7s_linear_infinite]" />
                    <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/35 via-secondary/25 to-accent/20 border border-white/24 flex items-center justify-center group-hover:shadow-[0_0_28px_rgba(76,201,240,0.32)] transition-all duration-300">
                            <Zap className="w-5 h-5 text-primary-light" />
                        </div>
                        <span className="text-xl font-black tracking-tight">
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
                                            ? "text-white bg-[linear-gradient(130deg,rgba(123,97,255,0.24),rgba(76,201,240,0.2))] border border-cyan-200/34 shadow-[0_0_0_1px_rgba(123,97,255,0.24),0_0_26px_rgba(76,201,240,0.2)]"
                                            : "text-text-secondary hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                                        }`}
                                >
                                    {link.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="navbar-indicator"
                                            className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
                                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}

                        {isAuthenticated && (
                            <Link
                                href="/inventory"
                                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${pathname.startsWith("/inventory")
                                        ? "text-white bg-[linear-gradient(130deg,rgba(123,97,255,0.24),rgba(76,201,240,0.2))] border border-cyan-200/34 shadow-[0_0_0_1px_rgba(123,97,255,0.24),0_0_26px_rgba(76,201,240,0.2)]"
                                        : "text-text-secondary hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                                    }`}
                            >
                                Inventory
                                {pathname.startsWith("/inventory") && (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                            </Link>
                        )}
                        {isAuthenticated && (
                            <Link
                                href="/lab"
                                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 ${pathname.startsWith("/lab")
                                        ? "text-cyan-100 bg-[linear-gradient(130deg,rgba(15,112,132,0.42),rgba(76,201,240,0.2))] border border-cyan-300/35 shadow-[0_0_0_1px_rgba(86,237,255,0.3),0_0_24px_rgba(0,234,255,0.24)]"
                                        : "text-text-secondary hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                                    }`}
                            >
                                <FlaskConical className="w-3.5 h-3.5 opacity-80" />
                                Lab
                                <span className="ml-1 rounded-full border border-cyan-300/50 bg-cyan-300/14 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.08em] text-cyan-100">
                                    BETA
                                </span>
                                {pathname.startsWith("/lab") && (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-accent"
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
                            /* Logged in user chip */
                            <div className="flex items-center gap-1">
                                <div className="group flex max-w-[min(38vw,15rem)] items-center gap-2.5 rounded-full border border-cyan-200/14 bg-[linear-gradient(140deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all hover:border-cyan-200/28 hover:bg-white/[0.06]">
                                    <div className="h-8 w-8 shrink-0 rounded-full border border-primary/30 bg-primary/20 flex items-center justify-center overflow-hidden">
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
                                    <div className="hidden min-w-0 sm:flex flex-col items-start justify-center gap-1">
                                        <span className="max-w-[7.25rem] truncate text-sm font-medium leading-none text-foreground">
                                            {profile.display_name}
                                        </span>
                                        {profile.role && roleLabels[profile.role] && (
                                            <span
                                                className={`badge shrink-0 whitespace-nowrap px-2 py-0.5 text-[9px] leading-none ${roleLabels[profile.role].class
                                                    }`}
                                            >
                                                {roleLabels[profile.role].label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Not logged in — Sign In button */
                            <Link href="/login" className="btn-primary text-sm !py-2 !px-5">
                                <LogIn className="w-4 h-4" />
                                <span className="hidden sm:inline">Sign In</span>
                            </Link>
                        )}

                        {!isAuthenticated && (
                            <button
                                className="md:hidden btn-ghost !p-2"
                                onClick={() => setIsMobileOpen(!isMobileOpen)}
                                aria-label={isMobileOpen ? "Close menu" : "Toggle menu"}
                            >
                                {isMobileOpen ? (
                                    <X className="w-5 h-5" />
                                ) : (
                                    <Menu className="w-5 h-5" />
                                )}
                            </button>
                        )}
                        {isAuthenticated && !isScrolled && (
                            <button
                                className="btn-ghost !p-2"
                                onClick={() => setIsMobileOpen(!isMobileOpen)}
                                aria-label={isMobileOpen ? "Close menu" : "Toggle menu"}
                            >
                                {isMobileOpen ? (
                                    <X className="w-5 h-5" />
                                ) : (
                                    <Menu className="w-5 h-5" />
                                )}
                            </button>
                        )}
                    </div>
                </div>
                </div>
                {isAuthenticated && isScrolled && (
                    <button
                        className="pointer-events-auto absolute right-6 top-[calc(50%+4px)] hidden -translate-y-1/2 rounded-xl border border-cyan-200/14 bg-[linear-gradient(140deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-2.5 text-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all hover:border-cyan-200/28 hover:bg-white/[0.06] hover:text-foreground md:inline-flex"
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                        aria-label={isMobileOpen ? "Close menu" : "Toggle menu"}
                    >
                        {isMobileOpen ? (
                            <X className="w-5 h-5" />
                        ) : (
                            <Menu className="w-5 h-5" />
                        )}
                    </button>
                )}
            </nav>

            {/* Navigation menu */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.button
                            type="button"
                            aria-label="Close mobile menu"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.16 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="fixed inset-0 z-[85] bg-[radial-gradient(circle_at_top,rgba(8,20,34,0.24),rgba(3,8,18,0.62))] backdrop-blur-[2px]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className={`fixed top-[calc(var(--nav-height)+max(env(safe-area-inset-top),0px)+8px)] z-[90] overflow-y-auto rounded-2xl border border-cyan-200/30 bg-[linear-gradient(165deg,rgba(11,24,42,0.9),rgba(8,17,34,0.82))] p-4 shadow-[0_22px_62px_rgba(0,0,0,0.55),0_0_0_1px_rgba(123,97,255,0.16),0_0_38px_rgba(76,201,240,0.18)] backdrop-blur-2xl ${isAuthenticated ? "right-3 w-[min(24rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-var(--nav-height)-max(env(safe-area-inset-top),0px)-16px)]" : "right-3 left-3 max-h-[calc(100dvh-var(--nav-height)-max(env(safe-area-inset-top),0px)-16px)] md:hidden"}`}
                        >
                            <div className="flex flex-col gap-1">
                                {isAuthenticated && profile && (
                                    <>
                                        <div className="mb-2 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                            <div className="h-10 w-10 shrink-0 rounded-full border border-primary/30 bg-primary/20 flex items-center justify-center overflow-hidden">
                                                {profile.avatar_url ? (
                                                    <img
                                                        src={profile.avatar_url}
                                                        alt={profile.display_name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="w-5 h-5 text-primary-light" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-foreground">{profile.display_name}</p>
                                                <p className="truncate text-xs text-text-muted">{user?.email}</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/profile/${user?.id}`}
                                            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                        >
                                            <User className="w-4 h-4" />
                                            Profile
                                        </Link>
                                    </>
                                )}
                                {publicLinks.filter(link => !(isAuthenticated && (link.href === "/" || link.href === "/contact"))).map((link) => {
                                    const isActive = pathname === link.href;
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                                    ? "text-white bg-white/[0.08] border border-white/18"
                                                    : "text-text-secondary hover:text-foreground hover:bg-white/[0.04]"
                                                }`}
                                        >
                                            {link.label}
                                        </Link>
                                    );
                                })}
                                {isAuthenticated && (
                                    <>
                                        <Link
                                            href="/inventory"
                                            className="px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                        >
                                            Inventory
                                        </Link>
                                        <Link
                                            href="/lab"
                                            className="px-4 py-3 rounded-lg text-sm font-medium text-cyan-300/90 hover:text-cyan-200 hover:bg-cyan-500/10 transition-all flex items-center gap-2"
                                        >
                                            <FlaskConical className="w-4 h-4" />
                                            Lab
                                            <span className="rounded-full border border-cyan-300/50 bg-cyan-300/14 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.08em] text-cyan-100">
                                                BETA
                                            </span>
                                        </Link>
                                        <Link
                                            href="/project-invites"
                                            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                        >
                                            <Mail className="w-4 h-4" />
                                            Project Invites
                                        </Link>
                                        {(isFaculty || isModerator) && (
                                            <>
                                                <div className="my-2 border-t border-border" />
                                                <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Admin</p>
                                                <Link
                                                    href="/admin/members"
                                                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                >
                                                    <Users className="w-4 h-4" />
                                                    Manage Members
                                                </Link>
                                                <Link
                                                    href="/admin/requests"
                                                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                >
                                                    <Package className="w-4 h-4" />
                                                    Equipment Requests
                                                </Link>
                                                <Link
                                                    href="/admin/project-requests"
                                                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                >
                                                    <FolderOpen className="w-4 h-4" />
                                                    Project Requests
                                                </Link>
                                                <Link
                                                    href="/admin/inventory-history"
                                                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                >
                                                    <History className="w-4 h-4" />
                                                    Inventory History
                                                </Link>
                                                {canViewLabHistory && (
                                                    <Link
                                                        href="/admin/lab-history"
                                                        className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground hover:bg-white/[0.03] transition-all"
                                                    >
                                                        <FlaskConical className="w-4 h-4" />
                                                        Lab History
                                                    </Link>
                                                )}
                                            </>
                                        )}
                                        <div className="my-2 border-t border-border" />
                                        <button
                                            onClick={handleSignOut}
                                            className="flex w-full items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all text-left"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign Out
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
