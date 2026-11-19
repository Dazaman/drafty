import Link from "next/link";
import type { ReactNode } from "react";

export default function PageFrame({ eyebrow, title, description, children, action, className="" }: {
  eyebrow: string; title: string; description: string; children: ReactNode; action?: ReactNode; className?: string;
}) {
  return <div className={`min-h-screen ${className}`}><div className="mx-auto max-w-4xl">
    <div className="page-intro"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
    {children}
  </div></div>;
}

export function DataState({ loading, error, empty = false }: { loading: boolean; error?: string | null; empty?: boolean }) {
  if (loading) return <div className="panel section-block" role="status"><p className="text-bright">Loading the league…</p><p className="text-sm mt-2">Getting the latest published scores.</p></div>;
  if (error) return <div className="panel section-block" role="alert"><h2 className="text-bright text-lg">The league data couldn’t load.</h2><p className="mt-2">Reload to try the latest published data again.</p><button className="action-button mt-4" onClick={() => window.location.reload()}>Reload data ↻</button></div>;
  if (empty) return <div className="panel section-block"><h2 className="text-bright text-lg">The season hasn’t started here yet.</h2><p className="mt-2">Standings will appear after the first scores are published.</p><Link className="text-mint inline-block mt-4" href="/competition/">See brackets & prize rules →</Link></div>;
  return null;
}

export function NextSteps({ links }: { links: { href: string; label: string; description: string }[] }) {
  return <nav className="next-steps" aria-label="Continue exploring">{links.map(link => <Link key={link.href} href={link.href}><span>{link.label} <span aria-hidden="true">↗</span></span><small>{link.description}</small></Link>)}</nav>;
}
