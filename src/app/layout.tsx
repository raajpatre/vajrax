import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from '@vercel/analytics/react';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VajraX — Robotics Club @ Newton School of Technology - Bengaluru",
  description:
    "The ultimate power in robotics innovation. VajraX is a cutting-edge college robotics club pushing the boundaries of technology.",
  keywords: ["robotics", "college club", "VajraX", "engineering", "technology", "innovation"],
  authors: [{ name: "VajraX Robotics Collective" }],
  publisher: "VajraX Robotics Collective",
  alternates: {
    canonical: "https://www.vajrax.club",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
  openGraph: {
    title: "VajraX — Robotics Club @ Newton School of Technology - Bengaluru",
    description: "Design. Break. Build.",
    url: "https://www.vajrax.club",
    type: "website",
    locale: "en_US",
    siteName: "VajraX",
    images: [
      {
        url: "", // TODO: Add 1200x630 OG image URL here
        width: 1200,
        height: 630,
        alt: "VajraX Robotics Club",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VajraX — Robotics Club @ Newton School of Technology - Bengaluru",
    description: "Design. Break. Build.",
    images: [""], // TODO: Add Twitter image URL here
    creator: "", // TODO: Add Twitter creator handle here
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
