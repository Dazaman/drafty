"use client";
import Link from "next/link";
import PageFrame, { DataState } from "@/components/PageFrame";
import LeagueTable from "@/components/LeagueTable";
import { useLeagueData } from "@/hooks/useLeagueData";
import { featuredBracket } from "@/lib/league";
import { weekStory } from "@/lib/journey";
import { money } from "@/lib/format";

export default function Dashboard() {
  const league=useLeagueData();
  const { config,standings,points,periods,currentGw }=league;
  const latest=standings.filter(row=>row.gw===currentGw).sort((a,b)=>a.position-b.position);
  const leaders=latest.filter(row=>row.position===1);
  const leaderPoints=points.find(row=>row.name===leaders[0]?.name && row.gw===currentGw)?.points;
  const secondPoints=points.find(row=>row.name===latest.find(team=>team.position>1)?.name && row.gw===currentGw)?.points;
  const bracket=featuredBracket(periods);
  const completed=periods.filter(period=>period.status==="completed");
  const pool=(config?.entryFee ?? 0)*(config?.participantCount ?? 0);
  const unavailable=league.loading || Boolean(league.error) || !standings.length || !config;
  return <PageFrame eyebrow="THE LEAGUE AT A GLANCE" title="League overview" description="Where everyone stands, what changed, and what comes next.">
    <DataState loading={league.loading} error={league.error} empty={!standings.length}/>
    {!unavailable && config && <>
      <div className="stats-grid">
        <div className="stat"><span className="stat-label">{leaders.length>1 ? "Joint leaders" : "Leading the season"}</span><strong>{leaders.map(team=>team.name).join(" & ") || "—"}</strong><small>{leaderPoints !== undefined ? `${leaderPoints.toLocaleString()} pts${leaders.length===1 && secondPoints!==undefined ? ` · ${leaderPoints-secondPoints} ahead` : ""}` : "Points unavailable"}</small></div>
        <Link className="stat stat-link" href={`/competition/#bracket-${bracket?.number ?? 1}`}><span className="stat-label">{bracket?.status==="completed" ? "Latest bracket" : "Current bracket"}</span><strong>Bracket {bracket?.number ?? "—"} <span aria-hidden="true">↗</span></strong><small>{bracket?.label} · {bracket?.status==="completed" ? "Complete · view awards" : bracket?.status==="live" ? "In progress" : "Upcoming"}</small></Link>
        <Link className="stat stat-link" href="/competition/#winnings"><span className="stat-label">Season prize pool</span><strong>{money(pool,config.currency)} <span aria-hidden="true">↗</span></strong><small>{config.participantCount} managers · {completed.length}/{periods.length} brackets complete</small></Link>
      </div>
      {league.pointsError && <p role="status" className="text-sm mb-4">Points totals couldn’t load. League positions are still available.</p>}
      <LeagueTable standings={standings} currentGw={currentGw} points={points}/>
      <section className="overview-story panel section-block"><div><span className="eyebrow">THE LATEST CHAPTER · GW {currentGw}</span><h2>{weekStory(standings,currentGw,Math.min(...standings.map(row=>row.gw)))}</h2><p>See how the table reached this point, week by week.</p><Link className="action-button inline-flex mt-5" href="/journey/">Replay the season →</Link></div><div className="story-motif" aria-hidden="true"><span>01</span><svg viewBox="0 0 250 100"><path d="M0 85 L40 65 L80 75 L120 35 L160 45 L200 10 L250 20" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M0 40 L40 50 L80 20 L120 60 L160 70 L200 50 L250 85" fill="none" stroke="currentColor" strokeWidth="2" opacity=".25"/></svg><span>{String(currentGw).padStart(2,"0")}</span></div></section>
      <section className="decision-preview"><div className="section-heading"><div><h2>Look behind the points</h2><p>Explore the decisions and competition behind the table.</p></div></div><div className="explore-grid"><Link href="/transfers/" className="explore-card"><span className="eyebrow">TRANSFERS</span><h3>Did the deal pay off? <span>↗</span></h3><p>Review this week’s moves and the season’s biggest gains and losses.</p></Link><Link href="/bench/" className="explore-card"><span className="eyebrow">BENCH DECISIONS</span><h3>What stayed on the bench? <span>↗</span></h3><p>Compare potential points lost and find the positions that cost most.</p></Link></div></section>
    </>}
  </PageFrame>;
}
