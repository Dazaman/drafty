"use client";

import { useMemo } from "react";
import { useCsvData, useJsonData } from "@/hooks/useData";
import type { AppConfig, BracketTeam, StandingsEntry, Transfer, BenchEntry } from "@/lib/types";
import Header from "@/components/Header";
import BracketCard from "@/components/BracketCard";
import StandingsTimeline from "@/components/StandingsTimeline";
import TransferHighlights from "@/components/TransferHighlights";
import BenchEfficiency from "@/components/BenchEfficiency";

function mapBracketRow(row: Record<string, string>): { teamName: string; fullName: string; points: number } {
  return {
    teamName: row["team_name"] ?? "",
    fullName: row["full_name"] ?? "",
    points: parseFloat(row["points"] ?? "0"),
  };
}

function mapStandingsRow(row: Record<string, string>): StandingsEntry {
  return {
    name: row["name"] ?? "",
    gw: parseInt(row["gw"] ?? "0"),
    position: parseInt(row["pos"] ?? "0"),
  };
}

function mapTransferRow(row: Record<string, string>): Transfer {
  return {
    team: row["team"] ?? "",
    waiverOrFree: row["waiver_or_free"] ?? "",
    waiverGw: parseInt(row["waiver_gw"] ?? "0"),
    nextGw: parseFloat(row["next_gw"] ?? "0"),
    playerIn: row["player_in"] ?? "",
    playerInPts: parseFloat(row["player_in_pts"] ?? "0"),
    playerOut: row["player_out"] ?? "",
    playerOutPts: parseFloat(row["player_out_pts"] ?? "0"),
    netPts: parseFloat(row["net_pts"] ?? "0"),
  };
}

function mapBenchRow(row: Record<string, string>): BenchEntry {
  return {
    name: row["name"] ?? "",
    benchPts: parseFloat(row["bench_pts"] ?? "0"),
  };
}

function DataUnavailable({ label }: { label: string }) {
  return (
    <div className="bg-ocean-surface rounded-lg p-3.5 border border-mint/10 text-muted/50 text-sm text-center">
      {label} — Data unavailable
    </div>
  );
}

export default function Dashboard() {
  const { data: config } = useJsonData<AppConfig>("/data/config.json");
  const { data: bracket1 } = useCsvData("/data/results_1.csv", mapBracketRow);
  const { data: bracket2 } = useCsvData("/data/results_2.csv", mapBracketRow);
  const { data: bracket3 } = useCsvData("/data/results_3.csv", mapBracketRow);
  const { data: standings } = useCsvData("/data/standings_ts.csv", mapStandingsRow);
  const { data: bestTransfers } = useCsvData("/data/top_df.csv", mapTransferRow);
  const { data: worstTransfers } = useCsvData("/data/bottom_df.csv", mapTransferRow);
  const { data: benchData } = useCsvData("/data/total_bench_pts.csv", mapBenchRow);

  const currentGw = useMemo(() => {
    if (!standings) return 0;
    return Math.max(...standings.map((s) => s.gw));
  }, [standings]);

  const bracketResults = useMemo(() => {
    if (!config) return [];
    const allBrackets = [bracket1, bracket2, bracket3];
    const prizes = config.prizes;

    return config.brackets.map((bc, i) => {
      const raw = allBrackets[i];
      let status: "completed" | "live" | "upcoming" = "upcoming";
      if (currentGw > bc.endGw) status = "completed";
      else if (currentGw >= bc.startGw) status = "live";

      const sorted = raw
        ? [...raw].sort((a, b) => b.points - a.points)
        : [];

      const teams: BracketTeam[] = sorted.map((t, rank) => ({
        name: t.teamName,
        fullName: t.fullName,
        points: Math.round(t.points),
        rank: rank + 1,
        prize: prizes[String(rank + 1)] ?? 0,
      }));

      return { label: bc.label, status, teams };
    });
  }, [config, bracket1, bracket2, bracket3, currentGw]);

  const earnings = useMemo(() => {
    const map = new Map<string, number>();
    bracketResults.forEach((br) => {
      if (br.status !== "completed") return;
      br.teams.forEach((t) => {
        if (t.prize > 0) {
          map.set(t.name, (map.get(t.name) ?? 0) + t.prize);
        }
      });
    });
    return Array.from(map.entries()).map(([name, amount]) => ({ name, amount }));
  }, [bracketResults]);

  const loading = !config || !standings;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-mint text-sm animate-pulse">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Header currentGw={currentGw} earnings={earnings} />

        {/* Bracket Cards */}
        <section className="mb-6">
          <h2 className="text-mint text-[10px] font-semibold uppercase tracking-[2px] mb-2.5">
            Season Brackets
          </h2>
          <div className="flex flex-col md:flex-row gap-2.5">
            {bracketResults.map((br) => (
              <BracketCard key={br.label} label={br.label} status={br.status} teams={br.teams} />
            ))}
          </div>
        </section>

        <section className="mb-6">
          {standings ? (
            <StandingsTimeline data={standings} />
          ) : !loading ? (
            <DataUnavailable label="Standings Timeline" />
          ) : null}
        </section>

        <section className="mb-6">
          {bestTransfers && worstTransfers ? (
            <TransferHighlights best={bestTransfers} worst={worstTransfers} />
          ) : !loading ? (
            <DataUnavailable label="Transfer Highlights" />
          ) : null}
        </section>

        <section className="mb-6">
          {benchData ? (
            <BenchEfficiency data={benchData} />
          ) : !loading ? (
            <DataUnavailable label="Bench Efficiency" />
          ) : null}
        </section>

        {/* Footer */}
        <footer className="mt-8 text-center text-muted/50 text-xs">
          Data from{" "}
          <a href="https://draft.premierleague.com" target="_blank" rel="noopener noreferrer" className="text-mint/50 hover:text-mint transition-colors">
            FPL Draft API
          </a>
          {" "}· Built by{" "}
          <a href="https://github.com/Dazaman" target="_blank" rel="noopener noreferrer" className="text-mint/50 hover:text-mint transition-colors">
            Danial Azam
          </a>
        </footer>
      </div>
    </div>
  );
}
