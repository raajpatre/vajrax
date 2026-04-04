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
    { icon: Github, href: "https://github.com/VajraX-NST-BLR", label: "GitHub" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Mail, href: "mailto:vajrax@college.edu", label: "Email" },
];

export default function Footer() {
    return (
        <footer className="relative mt-auto overflow-hidden pt-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.03] via-white/[0.012] to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(0,229,255,0.07),transparent_36%),radial-gradient(circle_at_15%_0%,rgba(0,218,243,0.05),transparent_34%)]" />
            <div className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-12">
                    {/* Brand */}
                    <div className="text-center md:col-span-2 md:text-left">
                        <Link href="/" className="mb-4 inline-flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-[4px] bg-[rgba(0,229,255,0.12)] border border-[rgba(0,229,255,0.24)] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.14)]">
                                <Zap className="w-5 h-5 text-primary-light" />
                            </div>
                            <span className="text-xl font-black tracking-tight">
                                <span className="text-gradient">Vajra</span>
                                <span className="text-foreground">X</span>
                            </span>
                        </Link>
                        <p className="mb-6 max-w-sm text-sm leading-relaxed text-text-secondary md:mx-0 mx-auto">
                            The ultimate power in robotics innovation. Building cutting-edge
                            autonomous systems, one circuit at a time.
                        </p>
                        <div className="flex items-center justify-center gap-3 md:justify-start">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.label}
                                    className="w-10 h-10 rounded-[4px] border border-[rgba(59,73,76,0.22)] bg-[rgba(25,28,34,0.52)] backdrop-blur-sm flex items-center justify-center text-text-muted hover:text-primary-light hover:border-[rgba(0,229,255,0.28)] hover:bg-[rgba(0,229,255,0.08)] transition-all duration-200"
                                >
                                    <social.icon className="w-4 h-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {footerLinks.map((col) => (
                        <div key={col.title} className="text-center md:text-left">
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
                <div className="mt-14 flex flex-col items-center justify-between gap-2 border-t border-[rgba(59,73,76,0.18)] pt-8 text-center sm:flex-row sm:gap-4 sm:text-left">
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
