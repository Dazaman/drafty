"use client";
import Link from "next/link";
import PageFrame, { DataState } from "@/components/PageFrame";
import LeagueTable from "@/components/LeagueTable";
import StandingsTimeline from "@/components/StandingsTimeline";
import TransferSpotlight from "@/components/TransferSpotlight";
import { useLeagueData } from "@/hooks/useLeagueData";
import { useJsonData } from "@/hooks/useData";
import type { JourneyFacts } from "@/lib/journey";
import { money } from "@/lib/format";

export default function Dashboard() {
  const league=useLeagueData();
  const facts=useJsonData<JourneyFacts>("/data/journey.json");
  const { config,standings,points,periods,currentGw }=league;
  const pool=(config?.entryFee ?? 0)*(config?.participantCount ?? 0);
  const unavailable=league.loading || Boolean(league.error) || !standings.length || !config;
  return <PageFrame className="overview-page" eyebrow="YOUR LEAGUE, UNFOLDING" title="The race. The rewards. The decisions." description="Watch the story, then catch up on where everyone stands.">
    <DataState loading={league.loading} error={league.error} empty={!standings.length}/>
    {!unavailable && config && <>
      <StandingsTimeline compact autoPlay facts={facts.data} factsLoading={facts.loading} data={standings} points={points} brackets={config.brackets} season={config.datasetSeason?.label ?? config.season.label}/>
      {league.pointsError && <p role="status" className="text-sm mb-4">Points totals couldn’t load. League positions are still available.</p>}
      <div className="overview-competition">
        <LeagueTable standings={standings} currentGw={currentGw} points={points}/>
        <section className="panel compact-brackets section-block"><div className="section-heading"><div><span className="eyebrow">FOUR CHAPTERS · ONE SEASON</span><h2>Brackets & rewards</h2></div><Link href="/competition/" className="text-xs text-mint">All results ↗</Link></div>
          <div className="compact-pool"><div><span>Season prize pool</span><strong>{money(pool,config.currency)}</strong></div><small>{config.participantCount} managers<br/>{money(config.entryFee,config.currency)} per entry</small></div>
          {league.bracketsError ? <p className="text-sm py-4" role="status">Bracket results couldn’t load. <Link href="/competition/">Try the results page →</Link></p> : <div className="bracket-digest">{periods.map(period=><Link key={period.number} href={`/competition/#bracket-${period.number}`}><span className="bracket-number">0{period.number}</span><div><strong>Bracket {period.number} <small>{period.label}</small></strong><p>{league.bracketsLoading ? "Loading results…" : period.status==="upcoming" ? `Opens GW ${period.startGw} · a fresh start` : !period.available ? "Results unavailable" : `${period.teams[0]?.fullName || period.teams[0]?.name || "Awaiting scores"}${period.teams[0] ? ` · ${period.teams[0].points} pts` : ""}`}</p></div><span className={`period-status ${period.status}`}>{period.status==="completed" ? "Complete" : period.status==="live" ? "In play" : "Up next"}</span></Link>)}</div>}
          <Link href="/competition/#winnings" className="compact-prize-note">Each bracket: {money(config.prizes["1"] ?? 0,config.currency)} winner · {money(config.prizes["2"] ?? 0,config.currency)} second <span>Prize rules ↗</span></Link>
        </section>
      </div>
      <TransferSpotlight/>
      <Link href="/bench/" className="bench-prompt"><span aria-hidden="true">▥</span><div><strong>Another story on the bench</strong><p>See which lineup decisions left points behind.</p></div><span aria-hidden="true">↗</span></Link>
    </>}
  </PageFrame>;
}
