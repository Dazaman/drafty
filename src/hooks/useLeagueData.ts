"use client";
import { useMemo } from "react";
import { useLeagueConfig } from "@/components/LeagueProvider";
import { useCsvData, useJsonData } from "@/hooks/useData";
import { buildBrackets, mapPoints, mapStandings } from "@/lib/league";

export function useLeagueData() {
  const config = useLeagueConfig();
  const standings = useCsvData("/data/standings_ts.csv", mapStandings);
  const points = useCsvData("/data/cumm_points.csv", mapPoints);
  const brackets = useJsonData<Record<string, Record<string, string>[]>>("/data/brackets.json");
  const currentGw = Math.max(0, ...(standings.data ?? []).map(row => row.gw));
  const periods = useMemo(() => config.data ? buildBrackets(config.data, brackets.data, currentGw) : [], [config.data, brackets.data, currentGw]);
  return {
    config: config.data, standings: standings.data ?? [], points: points.data ?? [], periods, currentGw,
    loading: config.loading || standings.loading,
    error: config.error || standings.error,
    pointsError: points.error,
    bracketsLoading: brackets.loading,
    bracketsError: brackets.error,
  };
}
