"use client";

import { useState } from "react";
import type { BracketTeam } from "@/lib/types";

interface BracketCardProps {
  label: string;
  status: "completed" | "live" | "upcoming";
  teams: BracketTeam[];
}

const rankColors = ["bg-mint", "bg-ice", "bg-muted"];
const rankTextColors = ["text-mint", "text-ice", "text-muted"];

export default function BracketCard({ label, status, teams }: BracketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLive = status === "live";
  const borderColor = isLive ? "border-ice/15" : "border-mint/15";
  const accentColor = isLive ? "text-ice" : "text-mint";
  const canExpand = teams.length > 3;
  const visibleTeams = expanded ? teams : teams.slice(0, 3);

  return (
    <div className={`flex-1 min-w-[200px] bg-ocean-surface rounded-lg p-3.5 border ${borderColor}`}>
      <div className="flex justify-between items-center mb-2.5">
        <div className={`text-xs font-semibold ${accentColor}`}>{label}</div>
        <div
          className={`text-[10px] px-2 py-0.5 rounded-full ${
            status === "completed"
              ? "bg-ocean text-muted"
              : status === "live"
              ? "bg-ice/10 text-ice"
              : "bg-ocean text-muted/50"
          }`}
        >
          {status === "completed" ? "Completed" : status === "live" ? "Live" : "Upcoming"}
        </div>
      </div>
      {visibleTeams.map((team, i) => (
        <div key={team.name} className={`flex items-center gap-2 ${i < visibleTeams.length - 1 ? "mb-1.5" : ""}`}>
          <div
            className={`w-[18px] h-[18px] ${rankColors[i] ?? "bg-muted"} rounded-full flex items-center justify-center text-[9px] text-ocean font-bold`}
          >
            {team.rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-xs ${i < 2 ? "text-bright" : "text-muted"} truncate`}>
              {team.name}
            </div>
            {team.fullName && (
              <div className="text-[9px] text-muted/60 truncate">{team.fullName}</div>
            )}
          </div>
          <div className={`text-xs font-semibold ${rankTextColors[i] ?? "text-muted"}`}>
            {team.points}
          </div>
          {team.prize > 0 && (
            <div
              className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                i === 0
                  ? "bg-mint/10 text-mint"
                  : "bg-ice/10 text-ice"
              }`}
            >
              ${team.prize}
            </div>
          )}
        </div>
      ))}
      {status === "upcoming" && teams.length === 0 && (
        <div className="text-muted/50 text-xs">No data yet</div>
      )}
      {canExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`mt-2 text-[10px] ${accentColor} hover:underline cursor-pointer`}
        >
          {expanded ? "Show less ▲" : `Show all ${teams.length} teams ▼`}
        </button>
      )}
    </div>
  );
}
