"use client";
import { useLeagueConfig } from "@/components/LeagueProvider";
import { useLocationHash } from "@/hooks/useLocationHash";
import { useEffect, useMemo, useState } from "react";
import PageFrame, { NextSteps } from "@/components/PageFrame";
import BenchEfficiency from "@/components/BenchEfficiency";
import { useCsvData } from "@/hooks/useData";
import type { BenchDetail, BenchEntry } from "@/lib/types";
const mapBench=(row:Record<string,string>):BenchEntry=>({name:row.name,benchPts:Number(row.bench_pts)});
const mapDetail=(row:Record<string,string>):BenchDetail=>({name:row.name,playerType:row.player_type,ptsLost:Number(row.pts_lost)});
const positions=[{value:"",label:"All positions"},{value:"GKP",label:"Goalkeepers"},{value:"DEF",label:"Defenders"},{value:"MID",label:"Midfielders"},{value:"FWD",label:"Forwards"}];
export default function BenchPage() {
  const totals=useCsvData("/data/total_bench_pts.csv",mapBench);
  const details=useCsvData("/data/bench_pts.csv",mapDetail);
  const {data:config}=useLeagueConfig();
  const hash=useLocationHash();
  const requestedId=hash.match(/^#manager-(\d+)$/)?.[1];
  const fromTransfer=config?.managers?.find(manager=>String(manager.id)===requestedId)?.name ?? "";
  const [chosenManager,setManager]=useState<string | null>(null);
  const manager=chosenManager ?? fromTransfer;
  useEffect(() => {
    if (!requestedId || !fromTransfer) return;
    const frame=window.requestAnimationFrame(() => document.getElementById(`manager-${requestedId}`)?.scrollIntoView({block:"start"}));
    return () => window.cancelAnimationFrame(frame);
  },[requestedId,fromTransfer]);
  const [position,setPosition]=useState("");
  const managers=useMemo(()=>[...new Set([...(totals.data ?? []).map(row=>row.name),...(details.data ?? []).map(row=>row.name)])].sort(),[totals.data,details.data]);
  const filtered=useMemo(()=>(details.data ?? []).filter(row=>(!manager || row.name===manager) && (!position || row.playerType===position)).sort((a,b)=>Math.abs(b.ptsLost)-Math.abs(a.ptsLost)),[details.data,manager,position]);
  return <PageFrame eyebrow="DECISION ANALYSIS" title="Bench decisions" description="Compare potential points lost to lineup choices, then see which positions cost the most.">
    <section className="section-block">{totals.loading ? <p className="panel" role="status">Loading bench comparisons…</p> : totals.error ? <p className="panel" role="alert">Bench comparisons couldn’t load. Reload to retry.</p> : totals.data?.length ? <BenchEfficiency data={totals.data} showLink={false}/> : <div className="panel empty-state"><strong>No bench losses recorded.</strong><p>Comparisons appear once lineup data is available.</p></div>}</section>
    <section id={requestedId ? `manager-${requestedId}` : "breakdown"} className="panel section-block"><div className="section-heading"><div><h2>Where were the points lost?</h2><p>Filter this breakdown by manager and position. Higher numbers mean more potential points missed.</p></div></div>
      <div className="analysis-filters"><label>Manager<select aria-label="Bench breakdown manager" value={manager} onChange={event=>setManager(event.target.value)}><option value="">All managers</option>{managers.map(name=><option key={name}>{name}</option>)}</select></label><label>Position<select aria-label="Bench breakdown position" value={position} onChange={event=>setPosition(event.target.value)}>{positions.map(row=><option key={row.value} value={row.value}>{row.label}</option>)}</select></label>{(manager || position) && <button className="text-mint text-xs" onClick={()=>{setManager("");setPosition("");}}>Clear filters</button>}</div>
      {details.loading ? <p role="status" className="empty-state">Loading position breakdown…</p> : details.error ? <div className="empty-state" role="alert"><strong>The breakdown couldn’t load.</strong><button className="text-mint mt-3" onClick={()=>window.location.reload()}>Reload breakdown ↻</button></div> : !filtered.length ? <div className="empty-state"><strong>No losses match this selection.</strong><p>Try a different manager or position.</p></div> : <><div className="table-scroll"><table className="league-table"><caption className="sr-only">Potential bench points lost by manager and position</caption><thead><tr><th scope="col">Manager</th><th scope="col">Position</th><th scope="col" className="numeric">Points missed</th></tr></thead><tbody>{filtered.map(row=><tr key={`${row.name}-${row.playerType}`}><td className="team-name">{row.name}</td><td>{positions.find(pos=>pos.value===row.playerType)?.label ?? row.playerType}</td><td className="numeric text-error">{Math.abs(row.ptsLost)}</td></tr>)}</tbody></table></div><p className="table-note" role="status">{filtered.length} position {filtered.length===1 ? "result" : "results"} · {filtered.reduce((sum,row)=>sum+Math.abs(row.ptsLost),0)} potential points missed in this selection.</p></>}
    </section>
    <details className="panel competition-notes"><summary>What does this measure?</summary><div><p>The pipeline compares a higher-scoring substitute with the lowest-scoring starter in the same position, and sums the potential gains.</p><p>This is a hindsight comparison. It doesn’t simulate every legal formation or change official FPL scores. Lower totals mean fewer potential points missed.</p></div></details>
    <NextSteps links={[{href:"/transfers/",label:"Compare transfer decisions",description:"See which arrivals gained or lost points."},{href:"/",label:"Return to league standings",description:"Check the overall positions and latest movement."}]}/>
  </PageFrame>;
}
