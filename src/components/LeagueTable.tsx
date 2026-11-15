"use client";
import Link from "next/link";
import { money } from "@/lib/format";
import { useLeagueConfig } from "@/components/LeagueProvider";
import type { StandingsEntry } from "@/lib/types";
import type { BracketPeriod, PointsEntry } from "@/lib/league";

export default function LeagueTable({ standings, currentGw, points, period }: {
  standings: StandingsEntry[]; currentGw: number; points: PointsEntry[]; period?: BracketPeriod;
}) {
  const { data: config } = useLeagueConfig();
  const latest = standings.filter(row => row.gw === currentGw).sort((a,b) => a.position-b.position);
  const totals = new Map(points.filter(row => row.gw === currentGw).map(row => [row.name, row.points]));
  const previous = new Map(standings.filter(row => row.gw === currentGw-1).map(row => [row.name,row.position]));
  return <section className="section-block panel">
    <div className="section-heading"><div><h2>{period ? `Bracket ${period.number} standings` : "Season standings"}</h2><p>{period ? `${period.label} · ${period.status === "live" ? "In progress · prizes provisional" : period.status === "completed" ? "Complete · awards earned" : "Upcoming"}` : `Cumulative points through gameweek ${currentGw}. Movement is from the previous week.`}</p></div>{!period && <Link className="text-mint text-xs" href="/competition/">View bracket results ↗</Link>}</div>
    {period?.status === "upcoming" ? <div className="empty-state"><strong>Starts in gameweek {period.startGw}</strong><p>All managers start this bracket on zero. Results appear once scores are published.</p></div> : period && !period.available ? <div className="empty-state" role="status"><strong>Bracket scores aren’t available.</strong><p>Reload to retry the published results.</p><button className="text-mint mt-3" onClick={()=>window.location.reload()}>Reload results ↻</button></div> : <div className="table-scroll"><table className="league-table">
      <caption className="sr-only">{period ? `Standings for bracket ${period.number}, ${period.label}` : `Season standings at gameweek ${currentGw}`}</caption>
      <thead><tr><th scope="col">Pos</th><th scope="col">Manager / team</th><th scope="col" className="numeric">Points</th><th scope="col" className="numeric">{period ? period.status === "completed" ? "Award" : "Projected prize" : "Movement"}</th></tr></thead>
      <tbody>{period ? period.teams.map(team => <tr key={team.name}><td><span className={`rank ${team.rank===1 ? "winner" : ""}`}>{team.rank}</span></td><td className="team-name">{team.fullName || team.name}<small>{team.name}</small></td><td className="numeric text-bright">{team.points.toLocaleString()}</td><td className="numeric prize">{team.prize ? `${money(team.prize,config?.currency)}${period.status === "live" ? "*" : ""}` : "—"}</td></tr>) : latest.map(team => {
        const change=(previous.get(team.name) ?? team.position)-team.position;
        const identity=config?.managers?.find(manager=>manager.name===team.name);
        return <tr key={team.name}><td><span className={`rank ${team.position===1 ? "winner" : ""}`}>{team.position}</span></td><td className="team-name">{identity?.fullName ?? team.name}{identity && <small>{identity.teamName}</small>}</td><td className="numeric text-bright">{totals.get(team.name)?.toLocaleString() ?? "—"}</td><td className={`numeric ${change>0 ? "text-mint" : change<0 ? "text-error" : ""}`} aria-label={change>0 ? `Up ${change} ${change===1 ? "place" : "places"}` : change<0 ? `Down ${-change} ${change===-1 ? "place" : "places"}` : "No movement"}>{change>0 ? `↑ ${change}` : change<0 ? `↓ ${-change}` : "—"}</td></tr>;
      })}</tbody>
    </table></div>}
    {!period && <p className="table-note">Overall prizes: {Object.entries(config?.seasonPrizes ?? {}).sort(([a],[b])=>Number(a)-Number(b)).map(([rank,amount])=>`${rank === "1" ? "1st" : rank === "2" ? "2nd" : rank === "3" ? "3rd" : `Place ${rank}`} ${money(amount,config?.currency)}`).join(" · ")}. <Link href="/competition/#winnings">See prize rules →</Link></p>}
  </section>;
}
