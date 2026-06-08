import PublicLayoutShell from "@/components/ui/PublicLayoutShell";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PublicLayoutShell>{children}</PublicLayoutShell>;
}
