import type { Metadata } from "next";
import LeagueProvider from "@/components/LeagueProvider";
import AppShell from "@/components/AppShell";
import { BRAND } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://drafty-flame.vercel.app"),
  title: BRAND.name,
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: {
    title: BRAND.name,
    description: BRAND.description,
    siteName: BRAND.name,
    type: "website",
    images: [{ url: "/brand/social-card.png", width: 1200, height: 630, alt: "The Funding Scheme — Football. Friendship. Questionable decisions." }],
  },
  twitter: { card: "summary_large_image", title: BRAND.name, description: BRAND.description, images: ["/brand/social-card.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="font-sans antialiased"><LeagueProvider><AppShell>{children}</AppShell></LeagueProvider></body></html>;
}
