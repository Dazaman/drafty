import type { AppConfig } from "@/lib/types";
import { money } from "@/lib/format";
export default function PrizePool({ config }: { config: AppConfig }) {
  const season = Object.entries(config.seasonPrizes ?? {}).sort(([a],[b]) => Number(a)-Number(b));
  const bracket = Object.entries(config.prizes).sort(([a],[b]) => Number(a)-Number(b));
  const pool = (config.entryFee ?? 0) * (config.participantCount ?? 0);
  const seasonTotal = season.reduce((sum,[,amount])=>sum+amount,0);
  const bracketTotal = bracket.reduce((sum,[,amount])=>sum+amount,0)*config.brackets.length;
  if (!pool && !season.length) return null;
  return <section className="panel section-block"><div className="section-heading"><div><span className="eyebrow">THE PRIZE POT</span><h2 className="mt-2">{money(pool,config.currency)} to play for.</h2><p>{config.participantCount} managers × {money(config.entryFee,config.currency)} entry fee. Overall-season prizes are decided at season end.</p></div><span className="archive-badge">{Math.abs(pool-seasonTotal-bracketTotal)<0.005 ? "Fully allocated" : pool > seasonTotal+bracketTotal ? `${money(pool-seasonTotal-bracketTotal,config.currency)} unallocated` : `${money(seasonTotal+bracketTotal-pool,config.currency)} over budget`}</span></div><div className="admin-form-grid"><div><h3 className="text-bright text-sm mb-3">Overall season · {money(seasonTotal,config.currency)}</h3>{season.map(([rank,amount])=><div key={rank} className="flex justify-between py-2 text-sm border-b border-white/5"><span>{rank === "1" ? "Winner" : rank === "2" ? "Second" : rank === "3" ? "Third" : `Place ${rank}`}</span><strong className="text-mint font-medium">{money(amount,config.currency)}</strong></div>)}</div><div><h3 className="text-bright text-sm mb-3">Each bracket · {config.brackets.length} brackets · {money(bracketTotal,config.currency)} total</h3>{bracket.map(([rank,amount])=><div key={rank} className="flex justify-between py-2 text-sm border-b border-white/5"><span>{rank === "1" ? "Bracket winner" : rank === "2" ? "Second" : `Place ${rank}`}</span><strong className="text-mint font-medium">{money(amount,config.currency)}</strong></div>)}</div></div></section>;
}
