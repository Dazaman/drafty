"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCsvData } from "@/hooks/useData";
import type { BenchEntry, BenchDetail } from "@/lib/types";
import BenchEfficiency from "@/components/BenchEfficiency";

function mapBenchRow(row: Record<string, string>): BenchEntry {
  return {
    name: row["name"] ?? "",
    benchPts: parseFloat(row["bench_pts"] ?? "0"),
  };
}

function mapBenchDetailRow(row: Record<string, string>): BenchDetail {
  return {
    name: row["name"] ?? "",
    playerType: row["player_type"] ?? "",
    ptsLost: parseFloat(row["pts_lost"] ?? "0"),
  };
}

const POSITION_FILTERS = ["All", "GKP", "DEF", "MID", "FWD"] as const;
type PositionFilter = (typeof POSITION_FILTERS)[number];

const POSITION_BADGE: Record<string, { color: string; bg: string }> = {
  GKP: { color: "#6EE7B7", bg: "rgba(110,231,183,0.12)" },
  DEF: { color: "#7DD3FC", bg: "rgba(125,211,252,0.12)" },
  MID: { color: "#8B9CB6", bg: "rgba(139,156,182,0.12)" },
  FWD: { color: "#FCD34D", bg: "rgba(252,211,77,0.12)" },
};

export default function BenchPage() {
  const [activeFilter, setActiveFilter] = useState<PositionFilter>("All");

  const { data: benchData, loading: loadingBench } = useCsvData(
    "/data/total_bench_pts.csv",
    mapBenchRow
  );
  const { data: detailData, loading: loadingDetail } = useCsvData(
    "/data/bench_pts.csv",
    mapBenchDetailRow
  );

  const filtered = useMemo(() => {
    if (!detailData) return [];
    const rows =
      activeFilter === "All"
        ? detailData
        : detailData.filter((d) => d.playerType === activeFilter);
    return [...rows].sort((a, b) => a.ptsLost - b.ptsLost);
  }, [detailData, activeFilter]);

  const loading = loadingBench || loadingDetail;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-muted hover:text-bright text-sm transition-colors mb-6"
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-bright text-2xl font-bold mb-1">
            Bench Points Analysis
          </h1>
          <p className="text-muted text-sm">
            Points lost by benching higher-scoring players
          </p>
        </div>

        {/* Overview chart */}
        <section className="mb-8">
          <h2 className="text-mint text-[10px] font-semibold uppercase tracking-[2px] mb-2.5">
            Overview
          </h2>
          {loading ? (
            <div className="bg-ocean-surface rounded-lg p-6 border border-mint/10 text-center text-muted/50 text-sm animate-pulse">
              Loading…
            </div>
          ) : benchData ? (
            <BenchEfficiency data={benchData} />
          ) : (
            <div className="bg-ocean-surface rounded-lg p-6 border border-mint/10 text-center text-muted/50 text-sm">
              Data unavailable
            </div>
          )}
        </section>

        {/* Position breakdown */}
        <section className="mb-8">
          <h2 className="text-mint text-[10px] font-semibold uppercase tracking-[2px] mb-2.5">
            Position Breakdown
          </h2>

          {/* Filter pills */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {POSITION_FILTERS.map((pos) => (
              <button
                key={pos}
                onClick={() => setActiveFilter(pos)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  activeFilter === pos
                    ? "bg-mint/20 text-mint border-mint/40"
                    : "bg-ocean-surface text-muted border-muted/20 hover:text-bright hover:border-muted/40"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="bg-ocean-surface rounded-lg p-6 border border-mint/10 text-center text-muted/50 text-sm animate-pulse">
              Loading…
            </div>
          ) : (
            <div className="bg-ocean-surface rounded-lg border border-mint/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mint/10">
                    <th className="text-left text-muted text-[10px] uppercase tracking-[1.5px] px-4 py-2.5 font-medium">
                      Team
                    </th>
                    <th className="text-left text-muted text-[10px] uppercase tracking-[1.5px] px-4 py-2.5 font-medium">
                      Position
                    </th>
                    <th className="text-right text-muted text-[10px] uppercase tracking-[1.5px] px-4 py-2.5 font-medium">
                      Points Lost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const badge = POSITION_BADGE[row.playerType];
                    return (
                      <tr
                        key={`${row.name}-${row.playerType}-${i}`}
                        className="border-b border-mint/5 last:border-0 hover:bg-mint/5 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-bright font-medium">
                          {row.name}
                        </td>
                        <td className="px-4 py-2.5">
                          {badge ? (
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                              style={{
                                color: badge.color,
                                backgroundColor: badge.bg,
                              }}
                            >
                              {row.playerType}
                            </span>
                          ) : (
                            <span className="text-muted">{row.playerType}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium" style={{ color: "#EF4444" }}>
                          {row.ptsLost}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted/50">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
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
