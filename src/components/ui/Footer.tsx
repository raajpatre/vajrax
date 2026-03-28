import Link from "next/link";
import { Zap, Github, Twitter, Mail, ExternalLink } from "lucide-react";

const footerLinks = [
    {
        title: "Platform",
        links: [
            { label: "Projects", href: "/projects" },
            { label: "Gallery", href: "/gallery" },
            { label: "Events", href: "/events" },
            { label: "Lab", href: "/lab" },
        ],
    },
    {
        title: "Club",
        links: [
            { label: "About Us", href: "/#about" },
            { label: "Contact", href: "/contact" },
            { label: "Join Us", href: "/signup" },
        ],
    },
];

const socialLinks = [
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Mail, href: "mailto:vajrax@college.edu", label: "Email" },
];

export default function Footer() {
    return (
        <footer className="relative mt-auto overflow-hidden pt-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.03] via-white/[0.012] to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(93,240,221,0.08),transparent_36%),radial-gradient(circle_at_15%_0%,rgba(125,114,255,0.12),transparent_34%)]" />
            <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link href="/" className="flex items-center gap-2.5 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 border border-white/20 flex items-center justify-center shadow-[0_0_20px_rgba(114,120,255,0.2)]">
                                <Zap className="w-5 h-5 text-primary-light" />
                            </div>
                            <span className="text-xl font-black tracking-tight">
                                <span className="text-gradient">Vajra</span>
                                <span className="text-foreground">X</span>
                            </span>
                        </Link>
                        <p className="text-text-secondary text-sm leading-relaxed max-w-sm mb-6">
                            The ultimate power in robotics innovation. Building cutting-edge
                            autonomous systems, one circuit at a time.
                        </p>
                        <div className="flex items-center gap-3">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    aria-label={social.label}
                                    className="w-10 h-10 rounded-xl border border-border/90 bg-[#0b1b30]/45 backdrop-blur-sm flex items-center justify-center text-text-muted hover:text-primary-light hover:border-cyan-300/40 hover:bg-cyan-400/10 transition-all duration-200"
                                >
                                    <social.icon className="w-4 h-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {footerLinks.map((col) => (
                        <div key={col.title}>
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
                                {col.title}
                            </h3>
                            <ul className="space-y-3">
                                {col.links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-text-secondary hover:text-[#d4eaff] transition-colors duration-200 flex items-center gap-1 group"
                                        >
                                            {link.label}
                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="mt-16 pt-8 border-t border-cyan-200/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-text-muted">
                        &copy; {new Date().getFullYear()} VajraX Robotics Club. All rights reserved.
                    </p>
                    <p className="text-xs text-text-muted">
                        Built with ⚡️ for VajraX by Raaj Patre
                    </p>
                </div>
            </div>
        </footer>
    );
}
