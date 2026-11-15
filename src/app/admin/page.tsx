"use client";
import { money } from "@/lib/format";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLeagueConfig } from "@/components/LeagueProvider";

type Configuration = { league_code: number; brackets: Record<string, string[]>; prizes: Record<string, number>; currency: string; entry_fee: number; season_prizes: Record<string, number> };
type Job = { status: "idle" | "running" | "succeeded" | "failed"; message: string; logs: string[] };
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/admin-api/${path}`, { cache: "no-store", ...options });
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Local admin service is not connected");
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "The admin request failed");
  return body;
}
export default function AdminPage() {
  const { data: metadata } = useLeagueConfig();
  const [config, setConfig] = useState<Configuration | null>(null);
  const [job, setJob] = useState<Job>({ status: "idle", message: "Ready to run", logs: [] });
  const [connection, setConnection] = useState("connecting");
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api<{ config: Configuration }>("config", { signal: controller.signal }), api<Job>("status", { signal: controller.signal })])
      .then(([result, status]) => { setConfig(result.config); setJob(status); setConnection("connected"); })
      .catch(() => { if (!controller.signal.aborted) setConnection("offline"); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (job.status !== "running") return;
    const controller = new AbortController();
    const timer = window.setInterval(() => {
      api<Job>("status", { signal: controller.signal }).then(result => { setJob(result); setError(""); }).catch(() => { if (!controller.signal.aborted) setError("Connection interrupted. The job may still be running. Reconnect before starting another run."); });
    }, 1500);
    return () => { window.clearInterval(timer); controller.abort(); };
  }, [job.status]);
  const busy = submitting || job.status === "running";
  const brackets = config ? Object.values(config.brackets) : [];
  const seasonPrizes = config ? Object.entries(config.season_prizes ?? {}).sort(([a],[b])=>Number(a)-Number(b)) : [];
  const pool = (config?.entry_fee ?? 0) * (metadata?.participantCount ?? 0);
  const allocated = Object.values(config?.season_prizes ?? {}).reduce((a,b)=>a+b,0) + brackets.length*Object.values(config?.prizes ?? {}).reduce((a,b)=>a+b,0);
  const prizes = config ? Object.entries(config.prizes).sort(([a],[b]) => Number(a)-Number(b)) : [];
  function updateBracket(index: number, bound: number, value: string) {
    if (!config) return;
    const updated = brackets.map((range, i) => i === index ? range.map((v,j) => j === bound ? value : v) : range);
    setConfig({ ...config, brackets: Object.fromEntries(updated.map((range,i) => [String(i+1),range])) });
  }
  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (!config || busy) return;
    setSubmitting(true); setError("");
    try { setJob(await api<Job>("run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config, refresh }) })); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not start the pipeline"); }
    finally { setSubmitting(false); }
  }
  return <div className="min-h-screen"><div className="mx-auto max-w-4xl">
    <div className="page-intro"><div><span className="eyebrow">LEAGUE CONTROL ROOM</span><h1>Your league. Your rules.</h1><p>Adjust the competition, then recalculate the scores in one place.</p></div><span className="archive-badge">{connection === "connected" ? "Local admin connected" : connection === "connecting" ? "Connecting…" : "Local admin required"}</span></div>
    {connection === "offline" && <section className="panel section-block"><h2 className="text-bright text-lg mb-3">Start your local admin service</h2><p className="mb-4">The public site can display scores. Configuration changes and Python runs happen through the local admin service.</p><pre className="admin-code">python3 -m venv .venv{"\n"}.venv/bin/pip install -r requirements-pipeline.txt{"\n"}npm run build{"\n"}npm run admin</pre><a className="action-button inline-flex mt-4" href="http://127.0.0.1:8001/admin/">Open local admin ↗</a></section>}
    <section className="panel section-block"><div className="section-heading"><div><h2>Season detected by FPL</h2><p>Derived from the API’s first gameweek deadline.</p></div><strong className="text-mint text-2xl">{metadata?.season?.label ?? "Loading…"}</strong></div><p className="text-xs">Score dataset: {metadata?.datasetSeason?.label ?? "Not available"} · <a className="text-mint" href={metadata?.season?.source ?? "https://draft.premierleague.com/api/bootstrap-static"} target="_blank" rel="noreferrer">View API source ↗</a></p></section>
    {config && <form onSubmit={run}><fieldset disabled={busy} className="admin-fields">
      <section className="panel section-block"><div className="section-heading"><div><h2>League settings</h2><p>Changing leagues requires a fresh API fetch.</p></div></div><div className="admin-form-grid"><label>FPL Draft league ID<input required type="number" min="1" max="1000000000" value={config.league_code || ""} onChange={e => setConfig({ ...config, league_code: Number(e.target.value) })} /></label><label>Prize currency<select value={config.currency} onChange={e => setConfig({ ...config, currency: e.target.value })}>{["USD","GBP","EUR","PKR"].map(c => <option key={c}>{c}</option>)}</select></label></div></section>
      <section className="panel section-block"><div className="section-heading"><div><h2>Entry fee & season winnings</h2><p>Season prizes are separate from the payouts for each bracket.</p></div></div><div className="admin-form-grid mb-5"><label>Entry fee per manager · {config.currency}<input aria-label="Entry fee per manager" required type="number" min="0" max="1000000" step="0.01" value={config.entry_fee ?? 0} onChange={e=>setConfig({...config,entry_fee:Number(e.target.value)})}/></label><div className="text-sm leading-7"><p>{metadata?.participantCount ?? 0} managers · pool {money(pool,config.currency)}</p><p className={Math.abs(pool-allocated)<0.005 ? "text-mint" : "text-error"}>{Math.abs(pool-allocated)<0.005 ? "Fully allocated" : pool>allocated ? `${money(pool-allocated,config.currency)} unallocated` : `${money(allocated-pool,config.currency)} over budget`}</p></div></div><div className="section-heading"><h3 className="text-bright">Overall season payouts</h3><button type="button" className="text-mint text-xs" disabled={seasonPrizes.length>=20} onClick={()=>setConfig({...config,season_prizes:{...config.season_prizes,[String(Math.max(0,...seasonPrizes.map(([rank])=>Number(rank)))+1)]:0}})}>+ Add season prize</button></div><div className="admin-prizes">{seasonPrizes.map(([rank,amount])=><label key={rank}>Season place {rank} · {config.currency}<div className="flex gap-2"><input aria-label={`Season place ${rank} prize`} required type="number" min="0" max="1000000" step="0.01" value={amount} onChange={e=>setConfig({...config,season_prizes:{...config.season_prizes,[rank]:Number(e.target.value)}})}/><button type="button" className="text-error" aria-label={`Remove season prize ${rank}`} onClick={()=>setConfig({...config,season_prizes:Object.fromEntries(seasonPrizes.filter(([r])=>r!==rank))})}>×</button></div></label>)}</div></section>
      <section className="panel section-block"><div className="section-heading"><div><h2>Season brackets</h2><p>Choose ordered, non-overlapping ranges within GW 1–38.</p></div><button type="button" disabled={brackets.length >= 8} className="text-mint text-xs" onClick={() => setConfig({ ...config, brackets: { ...config.brackets, [String(brackets.length+1)]: [String(Math.min(38,Number(brackets.at(-1)?.[1] ?? 0)+1)),"38"] } })}>+ Add bracket</button></div>{brackets.map((range,index) => <div className="admin-bracket-row" key={index}><strong>Bracket {index+1}</strong><label>From GW<input aria-label={`Bracket ${index+1} start gameweek`} type="number" min="1" max="38" required value={range[0]} onChange={e => updateBracket(index,0,e.target.value)} /></label><label>To GW<input aria-label={`Bracket ${index+1} end gameweek`} type="number" min="1" max="38" required value={range[1]} onChange={e => updateBracket(index,1,e.target.value)} /></label><button type="button" className="text-error text-xs" disabled={brackets.length === 1} aria-label={`Remove bracket ${index+1}`} onClick={() => setConfig({ ...config, brackets: Object.fromEntries(brackets.filter((_,i) => i !== index).map((r,i) => [String(i+1),r])) })}>Remove</button></div>)}</section>
      <section className="panel section-block"><div className="section-heading"><div><h2>Bracket winnings</h2><p>The same payout schedule applies to each bracket.</p></div><button className="text-mint text-xs" type="button" disabled={prizes.length >= 20} onClick={() => setConfig({ ...config, prizes: { ...config.prizes, [String(Math.max(0,...prizes.map(([rank])=>Number(rank)))+1)]: 0 } })}>+ Add prize place</button></div><div className="admin-prizes">{prizes.map(([rank,amount]) => <label key={rank}>Place {rank} · {config.currency}<div className="flex gap-2"><input type="number" required min="0" max="1000000" step="0.01" value={amount} onChange={e => setConfig({ ...config, prizes: { ...config.prizes, [rank]: Number(e.target.value) } })} /><button type="button" disabled={prizes.length===1} className="text-error" aria-label={`Remove prize place ${rank}`} onClick={() => setConfig({ ...config, prizes: Object.fromEntries(prizes.filter(([r]) => r !== rank)) })}>×</button></div></label>)}</div></section>
      <section className="panel section-block"><h2 className="text-bright text-lg mb-4">Update scores</h2><label className="admin-checkbox"><input type="checkbox" checked={refresh} onChange={e => setRefresh(e.target.checked)} /><span>Refresh from FPL API<small>Fetch current-season league data. Leave off to recalculate using the cached database.</small></span></label><p className="text-xs my-5">Configuration and published scores change only after a successful run. Refreshing may take a few minutes.</p><button type="submit" className="action-button" disabled={busy}>{busy ? "Pipeline running…" : "Apply configuration & run pipeline"}</button></section>
    </fieldset></form>}
    {error && <p className="text-error mb-4" role="alert">{error}</p>}
    {connection === "connected" && <section className="panel"><div className="section-heading"><h2>Pipeline activity</h2><span className="archive-badge">{job.status}</span></div><p role="status" className={job.status === "failed" ? "text-error" : "text-mint"}>{job.message}</p>{job.status === "succeeded" && <Link href="/" onClick={e => { e.preventDefault(); window.location.href = "/"; }} className="action-button inline-flex mt-4">View updated league ↗</Link>}{job.status === "succeeded" && <a className="text-mint inline-block ml-4 text-xs" href="/competition/">Review bracket awards →</a>}{job.logs.length > 0 && <pre className="admin-code mt-4" aria-label="Pipeline log">{job.logs.join("\n")}</pre>}</section>}
  </div></div>;
}
