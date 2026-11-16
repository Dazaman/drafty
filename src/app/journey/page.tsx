"use client";
import PageFrame, { DataState, NextSteps } from "@/components/PageFrame";
import StandingsTimeline from "@/components/StandingsTimeline";
import { useJsonData } from "@/hooks/useData";
import type { JourneyFacts } from "@/lib/journey";
import { useLeagueData } from "@/hooks/useLeagueData";

export default function JourneyPage() {
  const league=useLeagueData();
  const facts=useJsonData<JourneyFacts>("/data/journey.json");
  return <PageFrame eyebrow="HOW WE GOT HERE" title="The season journey" description="Follow the title race through every week, every climb, and every change of leader.">
    <DataState loading={league.loading} error={league.error} empty={!league.standings.length}/>
    {!league.loading && !league.error && league.standings.length>0 && league.config && <>
      {league.pointsError && <p className="text-sm mb-4" role="status">Points totals are unavailable. The position journey is still ready to explore.</p>}
      <StandingsTimeline facts={facts.data} factsLoading={facts.loading} data={league.standings} points={league.points} brackets={league.config.brackets} season={league.config.datasetSeason?.label ?? league.config.season.label}/>
      <NextSteps links={[{href:"/",label:"Back to the standings",description:"See the latest league positions."},{href:"/competition/",label:"Explore bracket results",description:"See what each part of the journey earned."}]}/>
    </>}
  </PageFrame>;
}
