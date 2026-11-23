"use client";
import Link from "next/link";
import PageFrame, { DataState } from "@/components/PageFrame";
import LeagueTable from "@/components/LeagueTable";
import StandingsTimeline from "@/components/StandingsTimeline";
import TransferSpotlight from "@/components/TransferSpotlight";
import { useLeagueData } from "@/hooks/useLeagueData";
import { useJsonData } from "@/hooks/useData";
import type { JourneyFacts } from "@/lib/journey";
import { BRAND } from "@/lib/brand";
import { JOURNEY_COLORS } from "@/lib/journey";
import { money } from "@/lib/format";

export default function Dashboard() {
  const league=useLeagueData();
  const facts=useJsonData<JourneyFacts>("/data/journey.json");
  const { config,standings,points,periods,currentGw }=league;
  const pool=(config?.entryFee ?? 0)*(config?.participantCount ?? 0);
  const unavailable=league.loading || Boolean(league.error) || !standings.length || !config;
  return <PageFrame className="overview-page" eyebrow={config?.leagueName ?? BRAND.name} title="Another week. Same suspects." description={config ? `${config.participantCount} managers. ${config.season.totalGameweeks} gameweeks. Every decision up for discussion.` : "Football. Friendship. Questionable decisions."} action={config?.managers?.length ? <a className="members-strip" href="#league-table"><span>THE USUAL SUSPECTS</span><div>{config.managers.map(manager=><span role="img" aria-label={`${manager.fullName} · ${manager.teamName}`} title={`${manager.fullName} · ${manager.teamName}`} key={manager.id} style={{color:JOURNEY_COLORS[[...new Set(standings.map(row=>row.name))].indexOf(manager.name)%JOURNEY_COLORS.length]}}>{manager.fullName.split(" ").map(word=>word[0]).slice(0,2).join("")}</span>)}</div></a> : undefined}>
    <DataState loading={league.loading} error={league.error} empty={!standings.length}/>
    {!unavailable && config && <>
      <StandingsTimeline compact autoPlay facts={facts.data} factsLoading={facts.loading} data={standings} points={points} brackets={config.brackets} season={config.datasetSeason?.label ?? config.season.label}/>
      {league.pointsError && <p role="status" className="text-sm mb-4">Points totals couldn’t load. League positions are still available.</p>}
      <div id="league-table" className="overview-competition">
        <LeagueTable standings={standings} currentGw={currentGw} points={points}/>
        <section className="panel compact-brackets section-block"><div className="section-heading"><div><span className="eyebrow">FOUR CHAPTERS · ONE SEASON</span><h2>Brackets & rewards</h2></div><Link href="/competition/" className="text-xs text-mint">All results ↗</Link></div>
          <div className="compact-pool"><div><span>Season prize pool</span><strong>{money(pool,config.currency)}</strong></div><small>{config.participantCount} managers<br/>{money(config.entryFee,config.currency)} per entry</small></div>
          {league.bracketsError ? <p className="text-sm py-4" role="status">Bracket results couldn’t load. <Link href="/competition/">Try the results page →</Link></p> : <div className="bracket-digest">{periods.map(period=><Link key={period.number} href={`/competition/#bracket-${period.number}`}><span className="bracket-number">0{period.number}</span><div><strong>Bracket {period.number} <small>{period.label}</small></strong>{league.bracketsLoading ? <p>Loading results…</p> : period.status==="upcoming" ? <p>Opens GW {period.startGw} · a fresh start</p> : !period.available ? <p>Results unavailable</p> : !period.teams.length ? <p>Awaiting scores</p> : <ol className="bracket-podium">{period.teams.slice(0,2).map((team,index)=><li key={team.name}><span className="bracket-podium-label">{period.status==="completed" ? index===0 ? "Winner" : "Runner-up" : index===0 ? "Leading" : "Second"}</span><span className="bracket-podium-name">{team.fullName || team.name}</span><span className="bracket-podium-points">{team.points} pts</span></li>)}</ol>}</div><span className={`period-status ${period.status}`}>{period.status==="completed" ? "Complete" : period.status==="live" ? "In play" : "Up next"}</span></Link>)}</div>}
          <Link href="/competition/#winnings" className="compact-prize-note">Each bracket: {money(config.prizes["1"] ?? 0,config.currency)} winner · {money(config.prizes["2"] ?? 0,config.currency)} second <span>Prize rules ↗</span></Link>
        </section>
      </div>
      <TransferSpotlight/>
      <Link href="/bench/" className="bench-prompt"><span aria-hidden="true">▥</span><div><strong>The points you’ll hear about on Monday</strong><p>See which lineup decisions left points behind.</p></div><span aria-hidden="true">↗</span></Link>
    </>}
  </PageFrame>;
}
