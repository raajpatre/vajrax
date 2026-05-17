import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VajraX — Robotics Club @ Newton School of Technology - Bengaluru",
  description:
    "The ultimate power in robotics innovation. VajraX is a cutting-edge college robotics club pushing the boundaries of technology.",
  keywords: ["robotics", "college club", "VajraX", "engineering", "technology", "innovation"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-noise`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
