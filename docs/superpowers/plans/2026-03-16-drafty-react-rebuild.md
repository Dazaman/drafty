# Drafty React Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Drafty FPL Draft League dashboard from Streamlit to a Next.js static site with D3 charts.

**Architecture:** Single-page Next.js app (static export) consuming CSV files produced by the existing Python/DuckDB pipeline. D3.js for charts, Tailwind CSS v4 for styling with Deep Ocean + Mint theme. Pipeline adds a `config.json` export; CSV files move to `public/data/`.

**Tech Stack:** Next.js 15, TypeScript, D3.js, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-16-drafty-react-rebuild-design.md`

---

## Chunk 1: Project Setup & Data Layer

### Task 1: Scaffold Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `public/data/` (copy CSV files here)
- Create: `public/data/config.json`

- [ ] **Step 1: Initialize Next.js in the existing repo**

The drafty repo already exists at `/Users/mazam1/GitHub/personal/portfolio/drafty/`. Run create-next-app in a temp dir, then move files in — or manually init. The key constraint: the `drafty/` Python package directory must coexist with `src/` for Next.js.

```bash
cd /Users/mazam1/GitHub/personal/portfolio/drafty
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --skip-install 2>&1 || true
npm install
npm install d3 @types/d3
```

Note: `create-next-app` may complain about existing files. If it fails, manually create the needed files (package.json, next.config.ts, tsconfig.json, src/app/).

- [ ] **Step 2: Configure next.config.ts for static export**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

- [ ] **Step 3: Set up globals.css with Deep Ocean theme**

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme inline {
  --color-ocean: #0B1120;
  --color-ocean-surface: #142035;
  --color-mint: #6EE7B7;
  --color-ice: #7DD3FC;
  --color-muted: #8B9CB6;
  --color-bright: #E2E8F0;
  --color-error: #EF4444;
  --font-sans: var(--font-inter);
}

body {
  background-color: var(--color-ocean);
  color: var(--color-muted);
}
```

- [ ] **Step 4: Set up layout.tsx**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Drafty 24/25 — FPL Draft League",
  description: "FPL Draft League analytics dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Create placeholder page.tsx**

```typescript
// src/app/page.tsx
export default function Dashboard() {
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-bright text-2xl font-bold">Drafty 24/25</h1>
        <p className="text-muted text-sm mt-1">Loading...</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Copy CSV files to public/data/**

```bash
mkdir -p public/data
cp drafty/data/results_1.csv drafty/data/results_2.csv drafty/data/results_3.csv public/data/
cp drafty/data/standings_ts.csv public/data/
cp drafty/data/top_df.csv drafty/data/bottom_df.csv public/data/
cp drafty/data/total_bench_pts.csv public/data/
```

- [ ] **Step 7: Create config.json**

```json
{
  "brackets": [
    { "label": "GW 1–13", "startGw": 1, "endGw": 13 },
    { "label": "GW 14–26", "startGw": 14, "endGw": 26 },
    { "label": "GW 27–38", "startGw": 27, "endGw": 38 }
  ],
  "prizes": { "1": 50, "2": 25 }
}
```

Save to `public/data/config.json`.

- [ ] **Step 8: Verify build**

```bash
npm run build
```

Expected: Successful static export with `/` route.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind theme and data files"
```

---

### Task 2: Types and data hooks

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/hooks/useData.ts`

- [ ] **Step 1: Define TypeScript types**

```typescript
// src/lib/types.ts
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

export interface AppConfig {
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
```

- [ ] **Step 2: Create useData hook with CSV parsing**

```typescript
// src/hooks/useData.ts
"use client";

import { useState, useEffect } from "react";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv<T>(text: string, mapRow: (row: Record<string, string>) => T): T[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return mapRow(row);
  });
}

export function useCsvData<T>(path: string, mapRow: (row: Record<string, string>) => T) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch ${path}`);
        return res.text();
      })
      .then((text) => setData(parseCsv(text, mapRow)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error };
}

export function useJsonData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch ${path}`);
        return res.json();
      })
      .then((json) => setData(json as T))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [path]);

  return { data, loading, error };
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/hooks/useData.ts
git commit -m "feat: add TypeScript types and CSV/JSON data hooks"
```

---

## Chunk 2: Header & Bracket Cards

### Task 3: Header component

**Files:**
- Create: `src/components/Header.tsx`

- [ ] **Step 1: Implement Header with earnings chip**

```typescript
// src/components/Header.tsx
interface Earning {
  name: string;
  amount: number;
}

interface HeaderProps {
  currentGw: number;
  earnings: Earning[];
}

export default function Header({ currentGw, earnings }: HeaderProps) {
  const sorted = [...earnings].filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-bright text-2xl font-bold">Drafty 24/25</h1>
        <p className="text-muted text-sm mt-1">
          FPL Draft League · Updated GW {currentGw}
        </p>
      </div>
      {sorted.length > 0 && (
        <div className="flex items-center gap-3 bg-ocean-surface rounded-lg px-4 py-2 border border-mint/10">
          <span className="text-muted text-[10px] uppercase tracking-wider">Earnings</span>
          <div className="flex gap-3">
            {sorted.map((e, i) => (
              <div key={e.name} className="text-center">
                <div className={`text-sm font-bold ${i === 0 ? "text-mint" : "text-ice"}`}>
                  ${e.amount}
                </div>
                <div className="text-[8px] text-muted">{e.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: add Header component with earnings chip"
```

---

### Task 4: BracketCard component

**Files:**
- Create: `src/components/BracketCard.tsx`

- [ ] **Step 1: Implement BracketCard**

```typescript
// src/components/BracketCard.tsx
import type { BracketTeam } from "@/lib/types";

interface BracketCardProps {
  label: string;
  status: "completed" | "live" | "upcoming";
  teams: BracketTeam[];
}

const rankColors = ["bg-mint", "bg-ice", "bg-muted"];
const rankTextColors = ["text-mint", "text-ice", "text-muted"];

export default function BracketCard({ label, status, teams }: BracketCardProps) {
  const isLive = status === "live";
  const borderColor = isLive ? "border-ice/15" : "border-mint/15";
  const accentColor = isLive ? "text-ice" : "text-mint";

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
      {teams.map((team, i) => (
        <div key={team.name} className={`flex items-center gap-2 ${i < teams.length - 1 ? "mb-1.5" : ""}`}>
          <div
            className={`w-[18px] h-[18px] ${rankColors[i] ?? "bg-muted"} rounded-full flex items-center justify-center text-[9px] text-ocean font-bold`}
          >
            {team.rank}
          </div>
          <div className={`flex-1 text-xs ${i < 2 ? "text-bright" : "text-muted"}`}>
            {team.name}
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
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BracketCard.tsx
git commit -m "feat: add BracketCard component"
```

---

### Task 5: Wire Header and BracketCards into page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the page with data loading and bracket logic**

```typescript
// src/app/page.tsx
"use client";

import { useMemo } from "react";
import { useCsvData, useJsonData } from "@/hooks/useData";
import type { AppConfig, BracketTeam, StandingsEntry, Transfer, BenchEntry } from "@/lib/types";
import Header from "@/components/Header";
import BracketCard from "@/components/BracketCard";

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
        ? [...raw].sort((a, b) => b.points - a.points).slice(0, 3)
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

        {/* Standings — wired in Task 6 */}
        <section className="mb-6">
          <div className="bg-ocean-surface rounded-lg p-3.5 border border-mint/10 text-muted text-sm">
            Standings Timeline — coming next
          </div>
        </section>

        {/* Transfers — wired in Task 9 */}
        <section className="mb-6">
          <div className="bg-ocean-surface rounded-lg p-3.5 border border-mint/10 text-muted text-sm">
            Transfer Highlights — coming next
          </div>
        </section>

        {/* Bench — wired in Task 9 */}
        <section className="mb-6">
          <div className="bg-ocean-surface rounded-lg p-3.5 border border-mint/10 text-muted text-sm">
            Bench Efficiency — coming next
          </div>
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
```

- [ ] **Step 2: Verify build and dev server**

```bash
npm run build
npm run dev
```

Open http://localhost:3000 — should show header with earnings chip, 3 bracket cards with real data, and placeholder sections below.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire Header and BracketCards with real data"
```

---

## Chunk 3: Standings Timeline (D3)

### Task 6: StandingsTimeline component

**Files:**
- Create: `src/components/StandingsTimeline.tsx`

- [ ] **Step 1: Implement D3 multi-line chart**

```typescript
// src/components/StandingsTimeline.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import type { StandingsEntry } from "@/lib/types";

interface StandingsTimelineProps {
  data: StandingsEntry[];
}

const TEAM_COLORS = [
  "#6EE7B7", "#7DD3FC", "#F9A8D4", "#FCD34D",
  "#A78BFA", "#FB923C", "#34D399", "#60A5FA",
  "#F472B6", "#FBBF24",
];

export default function StandingsTimeline({ data }: StandingsTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    name: string;
    gw: number;
    position: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const containerWidth = containerRef.current.clientWidth;
    const margin = { top: 12, right: 16, bottom: 28, left: 32 };
    const width = containerWidth - margin.left - margin.right;
    const height = 180;

    svg.attr("width", containerWidth).attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const teams = [...new Set(data.map((d) => d.name))];
    const maxGw = d3.max(data, (d) => d.gw) ?? 1;
    const maxPos = d3.max(data, (d) => d.position) ?? teams.length;

    const x = d3.scaleLinear().domain([1, maxGw]).range([0, width]);
    const y = d3.scaleLinear().domain([1, maxPos]).range([0, height]);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(Math.min(maxGw, 10)).tickFormat((d) => `${d}`))
      .call((g) => g.select(".domain").attr("stroke", "#8B9CB6").attr("stroke-opacity", 0.2))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#8B9CB6").attr("stroke-opacity", 0.1))
      .call((g) => g.selectAll(".tick text").attr("fill", "#8B9CB6").attr("font-size", "9px"));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(maxPos).tickFormat((d) => `${d}`))
      .call((g) => g.select(".domain").attr("stroke", "#8B9CB6").attr("stroke-opacity", 0.2))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#8B9CB6").attr("stroke-opacity", 0.1))
      .call((g) => g.selectAll(".tick text").attr("fill", "#8B9CB6").attr("font-size", "9px"));

    const colorScale = d3.scaleOrdinal<string>().domain(teams).range(TEAM_COLORS);

    const line = d3.line<StandingsEntry>()
      .x((d) => x(d.gw))
      .y((d) => y(d.position))
      .curve(d3.curveMonotoneX);

    const grouped = d3.group(data, (d) => d.name);

    grouped.forEach((entries, name) => {
      const sorted = [...entries].sort((a, b) => a.gw - b.gw);
      g.append("path")
        .datum(sorted)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", colorScale(name))
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.7);
    });

    // Invisible hover targets
    const allPoints = data.map((d) => ({
      ...d,
      cx: x(d.gw) + margin.left,
      cy: y(d.position) + margin.top,
    }));

    svg.on("mousemove", (event) => {
      const [mx, my] = d3.pointer(event);
      let closest = allPoints[0];
      let minDist = Infinity;
      allPoints.forEach((p) => {
        const dist = Math.hypot(p.cx - mx, p.cy - my);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      });
      if (minDist < 30) {
        setTooltip({
          name: closest.name,
          gw: closest.gw,
          position: closest.position,
          x: closest.cx,
          y: closest.cy,
        });
      } else {
        setTooltip(null);
      }
    });

    svg.on("mouseleave", () => setTooltip(null));
  }, [data]);

  return (
    <div className="bg-ocean-surface rounded-lg p-3.5 border border-mint/10">
      <h2 className="text-mint text-[10px] font-semibold uppercase tracking-[2px] mb-2.5">
        Standings Timeline
      </h2>
      <div ref={containerRef} className="relative">
        <svg ref={svgRef} />
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-ocean border border-mint/20 rounded px-2 py-1 text-xs z-10"
            style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
          >
            <div className="text-bright font-semibold">{tooltip.name}</div>
            <div className="text-muted">GW {tooltip.gw} · Position {tooltip.position}</div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into page.tsx**

Replace the standings placeholder section in `src/app/page.tsx` with:

```tsx
{standings && (
  <section className="mb-6">
    <StandingsTimeline data={standings} />
  </section>
)}
```

Add the import at the top:

```tsx
import StandingsTimeline from "@/components/StandingsTimeline";
```

- [ ] **Step 3: Verify in dev server**

```bash
npm run dev
```

Open http://localhost:3000 — standings chart should render with coloured lines, hover tooltips.

- [ ] **Step 4: Commit**

```bash
git add src/components/StandingsTimeline.tsx src/app/page.tsx
git commit -m "feat: add StandingsTimeline D3 line chart"
```

---

## Chunk 4: Transfer Highlights & Bench Efficiency

### Task 7: TransferHighlights component

**Files:**
- Create: `src/components/TransferHighlights.tsx`

- [ ] **Step 1: Implement TransferHighlights**

```typescript
// src/components/TransferHighlights.tsx
import type { Transfer } from "@/lib/types";

interface TransferHighlightsProps {
  best: Transfer[];
  worst: Transfer[];
}

function TransferCard({
  title,
  transfers,
  variant,
}: {
  title: string;
  transfers: Transfer[];
  variant: "best" | "worst";
}) {
  const accent = variant === "best" ? "mint" : "ice";
  const borderColor = variant === "best" ? "border-mint/15" : "border-ice/15";

  return (
    <div className={`flex-1 min-w-[220px] bg-ocean-surface rounded-lg p-3.5 border ${borderColor}`}>
      <h3 className={`text-xs font-semibold text-${accent} mb-2`}>{title}</h3>
      {transfers.slice(0, 3).map((t, i) => (
        <div
          key={`${t.playerIn}-${t.waiverGw}`}
          className={`flex justify-between items-center text-xs text-bright py-1 ${
            i < 2 ? "border-b border-mint/5" : ""
          }`}
        >
          <span>
            {t.playerIn} → <span className="text-muted">(for {t.playerOut})</span>
          </span>
          <span className={variant === "best" ? "text-mint" : "text-error"}>
            {t.netPts > 0 ? "+" : ""}
            {Math.round(t.netPts)} pts
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TransferHighlights({ best, worst }: TransferHighlightsProps) {
  return (
    <div>
      <h2 className="text-mint text-[10px] font-semibold uppercase tracking-[2px] mb-2.5">
        Transfer Highlights
      </h2>
      <div className="flex flex-col md:flex-row gap-2.5">
        <TransferCard title="Best Transfers" transfers={best} variant="best" />
        <TransferCard title="Worst Transfers" transfers={worst} variant="worst" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TransferHighlights.tsx
git commit -m "feat: add TransferHighlights component"
```

---

### Task 8: BenchEfficiency component

**Files:**
- Create: `src/components/BenchEfficiency.tsx`

- [ ] **Step 1: Implement D3 bar chart**

```typescript
// src/components/BenchEfficiency.tsx
"use client";

import { useRef, useEffect, useMemo } from "react";
import * as d3 from "d3";
import type { BenchEntry } from "@/lib/types";

interface BenchEfficiencyProps {
  data: BenchEntry[];
}

export default function BenchEfficiency({ data }: BenchEfficiencyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...data].sort((a, b) => a.benchPts - b.benchPts),
    [data]
  );

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || sorted.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const containerWidth = containerRef.current.clientWidth;
    const margin = { top: 8, right: 8, bottom: 24, left: 8 };
    const width = containerWidth - margin.left - margin.right;
    const height = 120;

    svg.attr("width", containerWidth).attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const maxVal = d3.max(sorted, (d) => Math.abs(d.benchPts)) ?? 1;

    const x = d3.scaleBand()
      .domain(sorted.map((d) => d.name))
      .range([0, width])
      .padding(0.3);

    const y = d3.scaleLinear().domain([0, maxVal]).range([0, height]);

    const colors = ["#6EE7B7", "#7DD3FC"];

    g.selectAll("rect")
      .data(sorted)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.name)!)
      .attr("y", (d) => height - y(Math.abs(d.benchPts)))
      .attr("width", x.bandwidth())
      .attr("height", (d) => y(Math.abs(d.benchPts)))
      .attr("rx", 3)
      .attr("fill", (_, i) => colors[i % 2])
      .attr("fill-opacity", 0.5);

    // Value labels
    g.selectAll(".val")
      .data(sorted)
      .enter()
      .append("text")
      .attr("x", (d) => x(d.name)! + x.bandwidth() / 2)
      .attr("y", (d) => height - y(Math.abs(d.benchPts)) - 4)
      .attr("text-anchor", "middle")
      .attr("fill", "#8B9CB6")
      .attr("font-size", "9px")
      .text((d) => Math.round(Math.abs(d.benchPts)));

    // Name labels
    g.selectAll(".name")
      .data(sorted)
      .enter()
      .append("text")
      .attr("x", (d) => x(d.name)! + x.bandwidth() / 2)
      .attr("y", height + 14)
      .attr("text-anchor", "middle")
      .attr("fill", "#8B9CB6")
      .attr("font-size", "9px")
      .text((d) => d.name);
  }, [sorted]);

  return (
    <div className="bg-ocean-surface rounded-lg p-3.5 border border-mint/10">
      <h2 className="text-mint text-[10px] font-semibold uppercase tracking-[2px] mb-1">
        Bench Points Left Behind
      </h2>
      <p className="text-muted text-[10px] mb-2.5">
        Points lost by benching higher-scoring players
      </p>
      <div ref={containerRef}>
        <svg ref={svgRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BenchEfficiency.tsx
git commit -m "feat: add BenchEfficiency D3 bar chart"
```

---

### Task 9: Wire remaining sections into page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace placeholder sections**

Add imports:

```tsx
import TransferHighlights from "@/components/TransferHighlights";
import BenchEfficiency from "@/components/BenchEfficiency";
```

Also add a reusable error fallback helper at the top of `page.tsx`:

```tsx
function DataUnavailable({ label }: { label: string }) {
  return (
    <div className="bg-ocean-surface rounded-lg p-3.5 border border-mint/10 text-muted/50 text-sm text-center">
      {label} — Data unavailable
    </div>
  );
}
```

Replace the standings placeholder with:

```tsx
<section className="mb-6">
  {standings ? (
    <StandingsTimeline data={standings} />
  ) : !loading ? (
    <DataUnavailable label="Standings Timeline" />
  ) : null}
</section>
```

Replace the transfer placeholder with:

```tsx
<section className="mb-6">
  {bestTransfers && worstTransfers ? (
    <TransferHighlights best={bestTransfers} worst={worstTransfers} />
  ) : !loading ? (
    <DataUnavailable label="Transfer Highlights" />
  ) : null}
</section>
```

Replace the bench placeholder with:

```tsx
<section className="mb-6">
  {benchData ? (
    <BenchEfficiency data={benchData} />
  ) : !loading ? (
    <DataUnavailable label="Bench Efficiency" />
  ) : null}
</section>
```

- [ ] **Step 2: Verify full dashboard in dev server**

```bash
npm run dev
```

All 5 sections should render with real data: header + earnings, brackets, standings timeline, transfers, bench efficiency.

- [ ] **Step 3: Build static export**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire TransferHighlights and BenchEfficiency into dashboard"
```

---

## Chunk 5: README & Cleanup

### Task 10: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write comprehensive README**

Replace the contents of `README.md` with full documentation covering:

1. **Project overview** — Drafty is an FPL Draft League analytics dashboard for league 33786 (2024/25 season). Rebuilt from Streamlit to Next.js.
2. **Architecture** — ASCII diagram: FPL Draft API → Python/DuckDB pipeline → CSV → Next.js static site
3. **Data pipeline** — `data_pipeline.py` orchestrates: `data_ingest.py` (fetches from FPL API), `data_preprocess.py` (normalizes JSON into DuckDB tables), `data_transform.py` (SQL queries produce analytics CSVs)
4. **CSV outputs** — table listing all 7+ CSV files, their columns, and purpose
5. **Frontend** — Next.js app reads CSVs from `public/data/`, D3.js for charts, Tailwind for styling
6. **Development setup**:
   - Pipeline: `poetry install && poetry run python drafty/data_pipeline.py --refresh True`
   - Frontend: `npm install && npm run dev`
7. **Deployment** — GitHub Actions runs weekly (Tuesdays 00:00 UTC), refreshes data, commits CSVs
8. **Configuration** — `drafty/config.yaml` sets `league_code` and `brackets` GW ranges

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: comprehensive README with architecture and setup"
```

---

### Task 11: Update GitHub Actions workflow

**Files:**
- Modify: `.github/workflows/weekly_refresh.yaml`

- [ ] **Step 1: Add Next.js build step to workflow**

After the existing pipeline step, add:

```yaml
      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install frontend dependencies
        run: npm ci

      - name: Copy data files to public
        run: |
          mkdir -p public/data
          cp drafty/data/results_*.csv public/data/
          cp drafty/data/standings_ts.csv public/data/
          cp drafty/data/top_df.csv drafty/data/bottom_df.csv public/data/
          cp drafty/data/total_bench_pts.csv public/data/

      - name: Build static site
        run: npm run build
```

Update the git add step to include `public/data/` and `out/`.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/weekly_refresh.yaml
git commit -m "ci: add Next.js build to weekly refresh workflow"
```

- [ ] **Step 3: Final build verification**

```bash
npm run build
```

Expected: clean static export with all pages.
