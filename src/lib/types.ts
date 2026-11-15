export interface BracketTeam {
  name: string;
  fullName: string;
  points: number;
  rank: number;
  prize: number;
}

export interface BracketConfig {
  label: string;
  startGw: number;
  endGw: number;
}

export interface SeasonMetadata {
  label: string;
  startYear: number;
  endYear: number;
  currentGameweek: number;
  lastFinishedGw: number;
  totalGameweeks: number;
  source: string;
}

export interface ManagerIdentity {
  id: number;
  name: string;
  fullName: string;
  teamName: string;
}

export interface AppConfig {
  managers?: ManagerIdentity[];
  leagueCode: number;
  entryFee: number;
  participantCount: number;
  seasonPrizes: Record<string, number>;
  currency: string;
  season: SeasonMetadata;
  datasetSeason: SeasonMetadata | null;
  updatedAt: string;
  brackets: BracketConfig[];
  prizes: Record<string, number>;
}

export interface StandingsEntry {
  name: string;
  gw: number;
  position: number;
}

export interface Transfer {
  team: string;
  waiverOrFree: string;
  waiverGw: number;
  nextGw: number;
  playerIn: string;
  playerInPts: number;
  playerOut: string;
  playerOutPts: number;
  netPts: number;
}

export interface BenchEntry {
  name: string;
  benchPts: number;
}

export interface BenchDetail {
  name: string;
  playerType: string;
  ptsLost: number;
}
