"use client";
import { useMemo, useState } from "react";
import PageFrame, { NextSteps } from "@/components/PageFrame";
import { useLeagueConfig } from "@/components/LeagueProvider";
import { useCsvData } from "@/hooks/useData";
import type { Transfer } from "@/lib/types";
import { mapStandings } from "@/lib/league";

function mapTransfer(row: Record<string,string>): Transfer {
  return { team:row.team, waiverOrFree:row.waiver_or_free, waiverGw:Number(row.waiver_gw),
    nextGw:row.next_gw ? Number(row.next_gw) : NaN, playerIn:row.player_in, playerOut:row.player_out,
    playerInPts:row.player_in_pts ? Number(row.player_in_pts) : NaN,
    playerOutPts:row.player_out_pts ? Number(row.player_out_pts) : NaN,
    netPts:row.net_pts ? Number(row.net_pts) : NaN };
}
const isWaiver=(type:string)=>["w","waiver"].includes(type.toLowerCase());
function NetPoints({value}:{value:number}) {
  return Number.isFinite(value) ? <span className={value>0 ? "text-mint" : value<0 ? "text-error" : "text-bright"}>{value>0 ? "+" : ""}{value}</span> : <span className="pending-label">Pending</span>;
}
function Highlights({title,rows}:{title:string;rows:Transfer[]}) {
  const [expanded,setExpanded]=useState(false);
  const visible=expanded ? rows : rows.slice(0,3);
  return <div className="panel"><h3 className="text-bright text-base mb-3">{title}</h3>{!rows.length && <p className="text-sm">No scored transfers yet.</p>}{visible.map((row,index)=><div className="transfer-highlight" key={`${row.team}-${row.playerIn}-${row.waiverGw}-${index}`}><div><strong><span className="text-mint">IN</span> {row.playerIn}</strong><span><span className="text-muted">OUT</span> {row.playerOut}</span><small>{row.team} · moved GW {row.waiverGw} · scored GW {row.nextGw}</small></div><b><NetPoints value={row.netPts}/> <small>pts</small></b></div>)}{rows.length>3 && <button className="text-mint text-xs mt-4" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded ? "Show fewer" : `Show all ${rows.length}`}</button>}</div>;
}
export default function TransfersPage() {
  const {data:config}=useLeagueConfig();
  const {data:standings,loading:standingsLoading,error:standingsError}=useCsvData("/data/standings_ts.csv",mapStandings);
  const currentGw=Math.max(1,...(standings ?? []).map(row=>row.gw));
  const [chosenGw,setChosenGw]=useState<number | null>(null);
  const [team,setTeam]=useState("");
  const [kind,setKind]=useState("all");
  const gw=chosenGw ?? currentGw;
  const weekly=useCsvData(`/data/blunders_${gw}.csv`,mapTransfer);
  const best=useCsvData("/data/top_df.csv",mapTransfer);
  const worst=useCsvData("/data/bottom_df.csv",mapTransfer);
  const teams=useMemo(()=>[...new Set([...(config?.managers ?? []).map(manager=>manager.teamName),...(weekly.data ?? []).map(row=>row.team),...(best.data ?? []).map(row=>row.team),...(worst.data ?? []).map(row=>row.team)])].sort(),[config,weekly.data,best.data,worst.data]);
  const filtered=useMemo(()=>(weekly.data ?? []).filter(row=>(!team || row.team===team) && (kind==="all" || isWaiver(row.waiverOrFree)===(kind==="waiver"))).sort((a,b)=>(Number.isFinite(b.netPts)?b.netPts:-Infinity)-(Number.isFinite(a.netPts)?a.netPts:-Infinity)),[weekly.data,team,kind]);
  const relatedManager=config?.managers?.find(manager=>manager.teamName===team);
  const pending=filtered.filter(row=>!Number.isFinite(row.netPts)).length;
  return <PageFrame eyebrow="DECISION ANALYSIS" title="Transfers" description="Who came in, who went out, and whether the swap paid off.">
    <section className="panel section-block"><div className="section-heading"><div><h2>Moves by gameweek</h2><p>Start with the latest moves, or go back to compare a scored week.</p></div></div>
      <div className="analysis-filters"><label>Transfer week<div className="week-switcher"><button aria-label="Previous transfer week" disabled={gw<=1} onClick={()=>setChosenGw(gw-1)}>←</button><select aria-label="Transfer gameweek" value={gw} onChange={event=>setChosenGw(Number(event.target.value))}>{Array.from({length:currentGw},(_,index)=>index+1).reverse().map(week=><option key={week} value={week}>GW {week}{week===currentGw ? " · latest" : ""}</option>)}</select><button aria-label="Next transfer week" disabled={gw>=currentGw} onClick={()=>setChosenGw(gw+1)}>→</button></div></label><label>Team<select aria-label="Filter transfers by team" value={team} onChange={event=>setTeam(event.target.value)}><option value="">All teams</option>{teams.map(name=><option key={name}>{name}</option>)}</select></label><label>Move type<select aria-label="Transfer type" value={kind} onChange={event=>setKind(event.target.value)}><option value="all">All moves</option><option value="waiver">Waivers</option><option value="free">Free agents</option></select></label>{(team || kind!=="all") && <button className="text-mint text-xs" onClick={()=>{setTeam("");setKind("all");}}>Clear filters</button>}</div>
      <p className="analysis-explainer">Moved in GW {gw} → measured using GW {gw+1} points. Net points = player in minus player out.{pending>0 && ` ${pending} ${pending===1 ? "move is" : "moves are"} waiting for scores.`}</p>
      {(weekly.loading || standingsLoading) ? <p className="empty-state" role="status">Loading gameweek moves…</p> : weekly.error || standingsError ? <div className="empty-state" role="alert"><strong>Transfer data couldn’t load.</strong><p>Reload to retry this gameweek.</p><button className="text-mint mt-3" onClick={()=>window.location.reload()}>Reload transfers ↻</button></div> : !filtered.length ? <div className="empty-state"><strong>{team || kind!=="all" ? "No moves match these filters." : "No moves recorded for this gameweek."}</strong><p>{team || kind!=="all" ? "Try another team or clear the filters." : "Choose a different week to explore earlier transfers."}</p></div> : <>
        <div className="table-scroll"><table className="league-table transfer-table"><caption className="sr-only">Transfers made in gameweek {gw}, evaluated in gameweek {gw+1}</caption><thead><tr><th scope="col">Team</th><th scope="col">Type</th><th scope="col">Player in</th><th scope="col" className="numeric">Pts</th><th scope="col">Player out</th><th scope="col" className="numeric">Pts</th><th scope="col" className="numeric">Net</th></tr></thead><tbody>{filtered.map((row,index)=><tr key={`${row.team}-${row.playerIn}-${index}`}><td className="team-name">{row.team}</td><td><span className="move-type">{isWaiver(row.waiverOrFree) ? "Waiver" : "Free"}</span></td><td className="text-bright">{row.playerIn}</td><td className="numeric">{Number.isFinite(row.playerInPts) ? row.playerInPts : "—"}</td><td>{row.playerOut}</td><td className="numeric">{Number.isFinite(row.playerOutPts) ? row.playerOutPts : "—"}</td><td className="numeric"><NetPoints value={row.netPts}/></td></tr>)}</tbody></table></div><p className="table-note">{filtered.length} {filtered.length===1 ? "move" : "moves"} shown. Pending moves have no next-gameweek score yet.</p>
      </>}
    </section>
    <section className="section-block"><div className="section-heading"><div><h2>The season’s biggest swings</h2><p>Best and worst scored moves across all teams, ranked by next-week net points.</p></div></div>{best.loading || worst.loading ? <p role="status">Loading highlights…</p> : best.error || worst.error ? <p role="status">Some season highlights couldn’t load. Weekly moves remain available above.</p> : <div className="explore-grid"><Highlights title="Biggest gains" rows={[...(best.data ?? [])].sort((a,b)=>b.netPts-a.netPts)}/><Highlights title="Costliest moves" rows={[...(worst.data ?? [])].sort((a,b)=>a.netPts-b.netPts)}/></div>}</section>
    <NextSteps links={[{href:relatedManager ? `/bench/#manager-${relatedManager.id}` : "/bench/",label:relatedManager ? `Review ${relatedManager.name}’s lineup decisions` : "Review lineup decisions",description:relatedManager ? "Open this manager’s position breakdown." : "Compare points left on the bench."},{href:"/journey/",label:"See the season’s turning points",description:"Put these decisions in the context of the race."}]}/>
  </PageFrame>;
}
