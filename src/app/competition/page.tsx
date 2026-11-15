"use client";
import { useLocationHash } from "@/hooks/useLocationHash";
import PageFrame, { DataState, NextSteps } from "@/components/PageFrame";
import LeagueTable from "@/components/LeagueTable";
import PrizePool from "@/components/PrizePool";
import { useLeagueData } from "@/hooks/useLeagueData";
import { bracketAwards, featuredBracket } from "@/lib/league";
import { money } from "@/lib/format";

export default function CompetitionPage() {
  const league=useLeagueData();
  const hash=useLocationHash();
  const requested=Number(hash.match(/^#bracket-(\d+)$/)?.[1]);
  const selected=league.periods.find(period=>period.number===requested) ?? featuredBracket(league.periods);
  const awards=bracketAwards(league.periods);
  const earned=awards.reduce((sum,row)=>sum+row.amount,0);
  return <PageFrame eyebrow="THE COMPETITION" title="Brackets & winnings" description="Each stage starts fresh. Follow the results, earned awards, and prize rules.">
    <DataState loading={league.loading} error={league.error}/>
    {!league.loading && !league.error && league.config && <>
      <nav className="page-contents" aria-label="On this page"><a href="#brackets">Bracket results ↓</a><a href="#awards">Earned awards ↓</a><a href="#winnings">Prize rules ↓</a></nav>
      <section id="brackets" className="section-block"><div className="section-heading"><div><h2>The bracket calendar</h2><p>Each bracket starts fresh. Select a stage to see its results.</p></div></div><nav className="bracket-calendar" aria-label="Select bracket">{league.periods.map(period=><a id={`bracket-${period.number}`} key={period.number} href={`#bracket-${period.number}`} aria-current={selected?.number===period.number ? "true" : undefined}><span className={`period-status ${period.status}`}>{period.status==="completed" ? "Complete" : period.status==="live" ? "In progress" : "Upcoming"}</span><strong>Bracket {period.number}</strong><span>{period.label}</span><small>{period.status==="completed" ? period.teams[0]?.fullName || "Results available" : period.status==="live" ? `Through GW ${league.currentGw}` : `Starts GW ${period.startGw}`}</small></a>)}</nav></section>
      {league.bracketsLoading ? <DataState loading/> : selected && <LeagueTable standings={league.standings} points={league.points} currentGw={league.currentGw} period={selected}/>}
      <section id="awards" className="panel section-block"><div className="section-heading"><div><h2>Earned bracket awards</h2><p>Completed brackets only. Live prizes and overall-season prizes aren’t included.</p></div><span className="archive-badge">{league.bracketsLoading ? "Loading awards…" : league.bracketsError ? "Awards unavailable" : `${money(earned,league.config.currency)} awarded`}</span></div>
        {league.bracketsLoading ? <p role="status">Loading earned awards…</p> : league.bracketsError ? <p role="status">Bracket awards couldn’t load. Reload to retry.</p> : !awards.length ? <div className="empty-state"><strong>No bracket awards yet.</strong><p>Winners appear here once the first bracket is complete.</p></div> : <div className="table-scroll"><table className="league-table"><caption className="sr-only">Earned awards across completed brackets</caption><thead><tr><th scope="col">Manager / team</th><th scope="col" className="numeric">Prize finishes</th><th scope="col" className="numeric">Earned</th></tr></thead><tbody>{awards.map(row=><tr key={row.name}><td className="team-name">{row.fullName}<small>{row.name}</small></td><td className="numeric">{row.wins}</td><td className="numeric prize">{money(row.amount,league.config!.currency)}</td></tr>)}</tbody></table></div>}
        <p className="table-note">Awards are calculated results; this isn’t a record of payments collected or sent.</p>
      </section>
      <div id="winnings"><PrizePool config={league.config}/></div>
      <details className="panel competition-notes"><summary>How results and prizes work</summary><div><p>Bracket points are the sum of gameweek scores within that range. Overall season standings use cumulative points across the season.</p><p>Bracket prizes become earned awards after the bracket’s final gameweek is marked finished by FPL. Overall-season prizes are decided at season end.</p><p>Equal season scores share a position. Bracket payouts currently follow the existing ordered-results rule; no split-prize policy has been configured.</p><p>Bench and transfer analysis describe decision outcomes and do not change official scores.</p></div></details>
      <NextSteps links={[{href:"/",label:"Return to the title race",description:"Compare overall points and weekly movement."},{href:"/journey/",label:"Replay how it unfolded",description:"Follow the managers through each stage."}]}/>
    </>}
  </PageFrame>;
}
