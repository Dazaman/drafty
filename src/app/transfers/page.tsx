"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCsvData } from "@/hooks/useData";
import type { Transfer, StandingsEntry } from "@/lib/types";

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

function TypeBadge({ type }: { type: string }) {
  const isWaiver = type.toLowerCase() === "waiver";
  return (
    <span
      className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
        isWaiver
          ? "bg-ice/10 text-ice border border-ice/20"
          : "bg-mint/10 text-mint border border-mint/20"
      }`}
    >
      {isWaiver ? "Waiver" : "Free"}
    </span>
  );
}

function NetPts({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`font-semibold ${positive ? "text-mint" : "text-error"}`}>
      {positive ? "+" : ""}
      {Math.round(value)}
    </span>
  );
}

function SummaryCard({
  title,
  transfers,
  variant,
}: {
  title: string;
  transfers: Transfer[];
  variant: "best" | "worst";
}) {
  const borderColor = variant === "best" ? "border-mint/15" : "border-ice/15";
  const titleColor = variant === "best" ? "text-mint" : "text-ice";

  return (
    <div className={`flex-1 bg-ocean-surface rounded-lg p-4 border ${borderColor}`}>
      <h3 className={`text-xs font-semibold ${titleColor} mb-3`}>{title}</h3>
      <div className="space-y-0">
        {transfers.map((t, i) => (
          <div
            key={`${t.team}-${t.playerIn}-${t.waiverGw}-${i}`}
            className={`py-2 ${i < transfers.length - 1 ? "border-b border-white/5" : ""}`}
          >
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-bright text-xs font-medium truncate">{t.team}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <TypeBadge type={t.waiverOrFree} />
                <span className="text-muted text-[10px]">GW{t.nextGw}</span>
                <NetPts value={t.netPts} />
                <span className={`text-[10px] ${t.netPts >= 0 ? "text-mint" : "text-error"}`}>pts</span>
              </div>
            </div>
            <div className="text-[11px] text-muted">
              <span className="text-bright/80">{t.playerIn}</span>
              <span className="mx-1">→</span>
              <span>{t.playerOut}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function mapStandingsRow(row: Record<string, string>): StandingsEntry {
  return { name: row["name"] ?? "", gw: parseInt(row["gw"] ?? "0"), position: parseInt(row["pos"] ?? "0") };
}

function GwTable({ transfers, loading, error }: { transfers: Transfer[] | null; loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <div className="text-mint text-sm animate-pulse text-center py-8">
        Loading transfers...
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-error text-sm text-center py-8">
        Failed to load data.
      </div>
    );
  }
  if (!transfers || transfers.length === 0) {
    return (
      <div className="text-muted text-sm text-center py-8">
        No transfers for this gameweek.
      </div>
    );
  }

  const sorted = [...transfers].sort((a, b) => b.netPts - a.netPts);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted border-b border-white/10">
            <th className="text-left py-2 pr-3 font-semibold">Team</th>
            <th className="text-left py-2 pr-3 font-semibold">Type</th>
            <th className="text-left py-2 pr-3 font-semibold">Player In</th>
            <th className="text-right py-2 pr-3 font-semibold">In Pts</th>
            <th className="text-left py-2 pr-3 font-semibold">Player Out</th>
            <th className="text-right py-2 pr-3 font-semibold">Out Pts</th>
            <th className="text-right py-2 font-semibold">Net Pts</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => (
            <tr
              key={`${t.team}-${t.playerIn}-${i}`}
              className={`border-b border-white/5 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
            >
              <td className="py-2 pr-3 text-bright font-medium">{t.team}</td>
              <td className="py-2 pr-3">
                <TypeBadge type={t.waiverOrFree} />
              </td>
              <td className="py-2 pr-3 text-bright/90">{t.playerIn}</td>
              <td className="py-2 pr-3 text-right text-muted">{Math.round(t.playerInPts)}</td>
              <td className="py-2 pr-3 text-muted">{t.playerOut}</td>
              <td className="py-2 pr-3 text-right text-muted">{Math.round(t.playerOutPts)}</td>
              <td className="py-2 text-right font-semibold">
                <NetPts value={t.netPts} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TransfersPage() {
  const [selectedGw, setSelectedGw] = useState(1);

  const { data: standings } = useCsvData("/data/standings_ts.csv", mapStandingsRow);
  const currentGw = useMemo(() => {
    if (!standings) return 0;
    return Math.max(...standings.map((s) => s.gw));
  }, [standings]);
  const gwOptions = useMemo(() => Array.from({ length: currentGw }, (_, i) => i + 1), [currentGw]);

  const { data: bestTransfers, loading: bestLoading } = useCsvData("/data/top_df.csv", mapTransferRow);
  const { data: worstTransfers, loading: worstLoading } = useCsvData("/data/bottom_df.csv", mapTransferRow);
  const {
    data: gwTransfers,
    loading: gwLoading,
    error: gwError,
  } = useCsvData(`/data/blunders_${selectedGw}.csv`, mapTransferRow);

  const summaryLoading = bestLoading || worstLoading;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-muted hover:text-bright text-sm transition-colors inline-flex items-center gap-1"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-bright text-2xl font-bold mb-8">Transfer History</h1>

        {/* Summary section */}
        <section className="mb-8">
          <h2 className="text-mint text-[10px] font-semibold uppercase tracking-[2px] mb-2.5">
            All-Time Best &amp; Worst
          </h2>
          {summaryLoading ? (
            <div className="text-mint text-sm animate-pulse text-center py-6">Loading...</div>
          ) : (
            <div className="flex flex-col md:flex-row gap-2.5">
              {bestTransfers && (
                <SummaryCard title="Best Transfers" transfers={bestTransfers} variant="best" />
              )}
              {worstTransfers && (
                <SummaryCard title="Worst Transfers" transfers={worstTransfers} variant="worst" />
              )}
            </div>
          )}
        </section>

        {/* Per-GW section */}
        <section>
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-3">
            <h2 className="text-mint text-[10px] font-semibold uppercase tracking-[2px]">
              Transfers by Gameweek
            </h2>
            <select
              value={selectedGw}
              onChange={(e) => setSelectedGw(Number(e.target.value))}
              className="bg-ocean-surface border border-white/10 text-bright text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-mint/40 cursor-pointer"
            >
              {gwOptions.map((gw) => (
                <option key={gw} value={gw} className="bg-ocean-surface">
                  Gameweek {gw}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-ocean-surface rounded-lg p-4 border border-mint/10">
            <GwTable transfers={gwTransfers} loading={gwLoading} error={gwError} />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 text-center text-muted/50 text-xs">
          Data from{" "}
          <a
            href="https://draft.premierleague.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mint/50 hover:text-mint transition-colors"
          >
            FPL Draft API
          </a>
          {" "}· Built by{" "}
          <a
            href="https://github.com/Dazaman"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mint/50 hover:text-mint transition-colors"
          >
            Danial Azam
          </a>
        </footer>
      </div>
    </div>
  );
}
