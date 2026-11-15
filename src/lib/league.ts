import type { AppConfig, BracketTeam, StandingsEntry } from "./types";

export type BracketPeriod = {
  number: number;
  label: string;
  startGw: number;
  endGw: number;
  status: "completed" | "live" | "upcoming";
  teams: BracketTeam[];
  available: boolean;
};
export type PointsEntry = { name: string; gw: number; points: number };
export const mapStandings = (row: Record<string, string>): StandingsEntry => ({
  name: row.name ?? "", gw: Number(row.gw), position: Number(row.pos),
});
export const mapPoints = (row: Record<string, string>): PointsEntry => ({
  name: row.name ?? "", gw: Number(row.gw), points: Number(row.points),
});

export function buildBrackets(config: AppConfig, rows: Record<string, Record<string, string>[]> | null, currentGw: number): BracketPeriod[] {
  return config.brackets.map((bracket, index) => {
    const status = currentGw > bracket.endGw || (config.datasetSeason?.lastFinishedGw ?? 0) >= bracket.endGw
      ? "completed" : currentGw >= bracket.startGw ? "live" : "upcoming";
    const raw = rows?.[String(index + 1)];
    const teams = status === "upcoming" ? [] : [...(raw ?? [])]
      .sort((a, b) => Number(b.points) - Number(a.points))
      .map((team, rank) => ({
        name: team.team_name, fullName: team.full_name, points: Math.round(Number(team.points)),
        rank: rank + 1, prize: config.prizes[String(rank + 1)] ?? 0,
      }));
    return { ...bracket, number: index + 1, status, teams, available: raw !== undefined };
  });
}

export function featuredBracket(periods: BracketPeriod[]) {
  return periods.find(period => period.status === "live")
    ?? [...periods].reverse().find(period => period.status === "completed")
    ?? periods[0];
}

export function bracketAwards(periods: BracketPeriod[]) {
  const teams = new Map<string, { name: string; fullName: string; amount: number; wins: number }>();
  for (const period of periods) {
    if (period.status !== "completed") continue;
    for (const team of period.teams) {
      if (team.prize <= 0) continue;
      const previous = teams.get(team.name) ?? { name: team.name, fullName: team.fullName, amount: 0, wins: 0 };
      teams.set(team.name, { ...previous, amount: previous.amount + team.prize, wins: previous.wins + 1 });
    }
  }
  return [...teams.values()].sort((a, b) => b.amount - a.amount);
}
