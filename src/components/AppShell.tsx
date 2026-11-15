"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useLeagueConfig } from "@/components/LeagueProvider";
import { usePathname } from "next/navigation";

const primary = [
  { href: "/", label: "Overview", icon: "◈" },
  { href: "/journey", label: "Season journey", icon: "⌁" },
  { href: "/competition", label: "Brackets & winnings", icon: "◇" },
];
const analysis = [
  { href: "/transfers", label: "Transfers", icon: "⇄" },
  { href: "/bench", label: "Bench decisions", icon: "▥" },
];
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: config } = useLeagueConfig();
  const navigationRef = useRef<HTMLElement>(null);
  const pathname = usePathname().replace(/\/$/, "") || "/";
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    function revealCurrentPage() {
      const navigation = navigationRef.current;
      const link = navigation?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!media.matches || !navigation || !link) return;
      navigation.scrollLeft += link.getBoundingClientRect().left - navigation.getBoundingClientRect().left - (navigation.clientWidth-link.clientWidth)/2;
    }
    revealCurrentPage();
    media.addEventListener("change",revealCurrentPage);
    return () => media.removeEventListener("change",revealCurrentPage);
  },[pathname]);
  const current = [...primary, ...analysis, { href: "/admin", label: "Admin" }].find(link => link.href === pathname);
  const navLink = (link: { href: string; label: string; icon: string }) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className={pathname === link.href ? "nav-link active" : "nav-link"}><span aria-hidden="true">{link.icon}</span>{link.label}</Link>;
  const week = config?.datasetSeason?.currentGameweek;
  const finished = week && (config?.datasetSeason?.lastFinishedGw ?? 0) >= week;
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar">
      <div className="brand-row"><Link href="/" className="brand" aria-label="Drafty overview"><span className="brand-symbol">d.</span>drafty<span className="brand-dot">●</span></Link><Link href="/admin" className="mobile-admin" aria-label="League admin">⚙</Link></div>
      <div className="sidebar-caption">YOUR LEAGUE, IN PERSPECTIVE</div>
      <nav ref={navigationRef} aria-label="Main navigation" className="primary-navigation"><div className="nav-group">{primary.map(navLink)}</div><span className="nav-group-label">DECISION ANALYSIS</span><div className="nav-group">{analysis.map(navLink)}</div></nav>
      <div className="sidebar-note"><span className="eyebrow">THE COMPETITION</span><strong>FPL Draft League</strong><span>{config?.season?.label ?? "Season loading…"} season</span><div className="season-tag">League {config?.leagueCode ?? "…"}</div><Link href="/competition/#winnings">Prize rules & entry fee ↗</Link></div>
      <nav aria-label="League management" className="management-navigation">{navLink({ href: "/admin", label: "League admin", icon: "⚙" })}</nav>
    </aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><Link href="/">Drafty</Link><span className="topbar-divider">/</span><span>{current?.label ?? "League"}</span></div><div className="data-stamp"><span>{week ? `GW ${week} ${finished ? "complete" : "in progress"}` : "Scores loading…"}</span><span className="archive-badge">{config?.datasetSeason?.label ?? config?.season?.label ?? "Season loading…"}</span></div></header>
      <main id="main-content" tabIndex={-1}>{config?.datasetSeason && config.season.startYear !== config.datasetSeason.startYear && <div className="dataset-notice">Current FPL season: {config.season.label}. Displayed scores: {config.datasetSeason.label}. <Link href="/admin">Refresh league data ↗</Link></div>}{children}</main>
      <footer className="app-footer"><span>Scores through GW {week ?? "—"}{config?.updatedAt ? ` · Published ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }).format(new Date(config.updatedAt))}` : ""}</span><a href="https://draft.premierleague.com" target="_blank" rel="noreferrer">FPL Draft data ↗</a></footer>
    </div>
  </div>;
}
