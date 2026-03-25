import {
    Mail,
    MapPin,
    Github,
    Twitter,
    Instagram,
    Linkedin,
    Globe,
    MessageCircle,
} from "lucide-react";

export const metadata = {
    title: "Contact — VajraX",
    description: "Get in touch with the VajraX Robotics Club.",
};

const contactInfo = [
    {
        icon: Mail,
        label: "Email",
        value: "vajrax@college.edu",
        href: "mailto:vajrax@college.edu",
    },
    {
        icon: MapPin,
        label: "Location",
        value: "Robotics Lab, Engineering Block B, 3rd Floor",
        href: null,
    },
    {
        icon: MessageCircle,
        label: "Club Hours",
        value: "Mon – Fri, 4:00 PM – 8:00 PM",
        href: null,
    },
];

const socialLinks = [
    { icon: Github, label: "GitHub", href: "#", color: "hover:text-white" },
    { icon: Twitter, label: "Twitter", href: "#", color: "hover:text-sky-400" },
    {
        icon: Instagram,
        label: "Instagram",
        href: "#",
        color: "hover:text-pink-400",
    },
    {
        icon: Linkedin,
        label: "LinkedIn",
        href: "#",
        color: "hover:text-blue-400",
    },
    {
        icon: Globe,
        label: "Website",
        href: "#",
        color: "hover:text-emerald-400",
    },
];

export default function ContactPage() {
    return (
        <div className="relative min-h-screen overflow-hidden pb-24 pt-[calc(var(--nav-height)+2.5rem)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(0,242,255,0.1),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(125,114,255,0.12),transparent_30%)]" />

            <div className="relative z-10 mx-auto max-w-4xl px-6">
                <div className="mb-12">
                    <h1 className="section-title mb-3 text-3xl">Contact</h1>
                    <p className="max-w-lg text-text-secondary">
                        Got questions? Want to collaborate? We&apos;d love to hear from you.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Contact Info */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
                            Reach Us
                        </h2>
                        {contactInfo.map((item) => (
                            <div
                                key={item.label}
                                className="glass flex items-start gap-4 p-5 transition-all hover:border-cyan-300/30"
                            >
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                                    <item.icon className="h-5 w-5 text-primary-light" />
                                </div>
                                <div>
                                    <p className="text-xs text-text-muted mb-1">{item.label}</p>
                                    {item.href ? (
                                        <a
                                            href={item.href}
                                            className="text-sm font-medium text-foreground hover:text-primary-light transition-colors"
                                        >
                                            {item.value}
                                        </a>
                                    ) : (
                                        <p className="text-sm font-medium text-foreground">
                                            {item.value}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Social Links */}
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
                            Follow Us
                        </h2>
                        <div className="glass p-6">
                            <div className="grid grid-cols-1 gap-3">
                                {socialLinks.map((social) => (
                                    <a
                                        key={social.label}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-4 p-3 rounded-lg text-text-secondary ${social.color} hover:bg-white/[0.03] transition-all duration-200 group`}
                                    >
                                        <div className="w-9 h-9 rounded-lg border border-border flex items-center justify-center group-hover:border-primary/30 transition-colors">
                                            <social.icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium">{social.label}</span>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Quick CTA */}
                        <div className="glass p-6 mt-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
                            <div className="relative">
                                <h3 className="text-lg font-semibold mb-2">Want to join?</h3>
                                <p className="text-sm text-text-secondary mb-4">
                                    We&apos;re always looking for passionate engineers and builders.
                                </p>
                                <a href="/signup" className="btn-primary text-sm !py-2">
                                    Apply Now
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
