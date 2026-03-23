import Link from "next/link";
import { Zap, Github, Twitter, Mail, ExternalLink } from "lucide-react";

const footerLinks = [
    {
        title: "Platform",
        links: [
            { label: "Projects", href: "/projects" },
            { label: "Gallery", href: "/gallery" },
            { label: "Events", href: "/events" },
            { label: "Social Feed", href: "/feed" },
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
        <footer className="relative border-t border-border mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link href="/" className="flex items-center gap-2.5 mb-4">
                            <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-primary-light" />
                            </div>
                            <span className="text-xl font-bold tracking-tight">
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
                                    className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-primary-light hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
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
                                            className="text-sm text-text-secondary hover:text-primary-light transition-colors duration-200 flex items-center gap-1 group"
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
                <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-text-muted">
                        &copy; {new Date().getFullYear()} VajraX Robotics Club. All rights reserved.
                    </p>
                    <p className="text-xs text-text-muted">
                        Built with ⚡ by the VajraX Engineering Team
                    </p>
                </div>
            </div>
        </footer>
    );
}
