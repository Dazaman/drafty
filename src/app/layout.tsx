import type { Metadata } from "next";
import LeagueProvider from "@/components/LeagueProvider";
import AppShell from "@/components/AppShell";
import "./globals.css";



export const metadata: Metadata = {
  title: "Drafty — FPL Draft League",
  description: "FPL Draft League analytics dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <LeagueProvider><AppShell>{children}</AppShell></LeagueProvider>
      </body>
    </html>
  );
}
