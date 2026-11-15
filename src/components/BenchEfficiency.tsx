import Link from "next/link";
import type { BenchEntry } from "@/lib/types";
export default function BenchEfficiency({ data, showLink = true }: { data: BenchEntry[]; showLink?: boolean }) {
  const sorted = [...data].sort((a,b) => Math.abs(b.benchPts)-Math.abs(a.benchPts));
  const max = Math.max(1,...sorted.map(d => Math.abs(d.benchPts)));
  return <div className="panel"><div className="section-heading"><div><h2>The points that got away</h2><p>Potential points lost to bench decisions. Lower is better.</p></div>{showLink && <Link href="/bench" className="text-mint text-xs">Explore bench decisions ↗</Link>}</div><div role="list" aria-label="Bench points lost by manager">{sorted.map(d => <div className="bench-row" role="listitem" key={d.name}><span className="text-bright">{d.name}</span><div className="bench-track"><div className="bench-fill" style={{width: `${Math.abs(d.benchPts)/max*100}%`}} /></div><span className="text-right tabular-nums">{Math.round(Math.abs(d.benchPts))}</span></div>)}</div></div>;
}
