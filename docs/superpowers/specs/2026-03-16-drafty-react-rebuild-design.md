# Drafty React Rebuild — Design Spec

## Goal

Rebuild the Drafty FPL Draft League analytics dashboard from Streamlit to a Next.js static site. Single page, vertical scroll, mobile-first. Deep Ocean + Mint & Ice theme consistent with the portfolio.

## Context

Drafty is an FPL Draft League analytics app for league code 33786 (2024/25 season). The current Streamlit app has 3 pages (Standings, Transfers, Selection) with data sourced from a Python/DuckDB pipeline that runs weekly via GitHub Actions. The rebuild keeps the backend pipeline unchanged and replaces only the frontend.

## Architecture

```
FPL Draft API
     ↓ (weekly GitHub Actions cron)
Python pipeline (data_ingest.py → data_preprocess.py → data_transform.py)
     ↓
DuckDB (drafty.db)
     ↓ (SQL transforms → CSV export)
CSV files in public/data/
     ↓ (client-side fetch at runtime)
Next.js static app (D3.js charts, Tailwind CSS)
     ↓ (static export)
Vercel / static hosting
```

### What changes

- **Frontend:** Streamlit → Next.js + D3.js + Tailwind CSS
- **Data serving:** CSV files move from `drafty/data/` to `public/data/` in the Next.js project
- **GitHub Actions:** Updated to also build the Next.js static export after pipeline runs
- **Pipeline addition:** Export `config.json` from `config.yaml` (bracket ranges + prize amounts) to `public/data/`

### What stays the same

- Python data pipeline (`data_ingest.py`, `data_preprocess.py`, `data_transform.py`)
- DuckDB as the transformation engine
- SQL queries in `drafty/sql/`
- Weekly cron schedule
- Single league, single season scope

## Tech Stack

- **Next.js 15** with App Router, static export (`output: "export"`)
- **D3.js** for standings timeline and bench efficiency charts
- **Tailwind CSS v4** with Deep Ocean + Mint & Ice theme
- **TypeScript**

## Theme

Matches portfolio site:

| Token | Hex | Usage |
|-------|-----|-------|
| Ocean | #0B1120 | Page background |
| Ocean Surface | #142035 | Card backgrounds |
| Mint | #6EE7B7 | Primary accent, winner highlights |
| Ice | #7DD3FC | Secondary accent, runner-up, live brackets |
| Muted | #8B9CB6 | Secondary text |
| Bright | #E2E8F0 | Primary text |
| Error Red | #EF4444 | Negative transfer points |

## Page Layout

Single page, vertical scroll, mobile-first. Five sections in order:

### 1. Header + Earnings Chip

- Left: "Drafty 24/25" title, subtitle "FPL Draft League · Updated GW {n}"
- Right: compact earnings chip showing cumulative prize money per earner (name + amount), derived from bracket results
- On mobile: earnings chip wraps below the title

### 2. Bracket Cards

Three cards side-by-side (stacking on mobile), one per bracket:

- **GW 1–13**, **GW 14–26**, **GW 27–38**
- Each shows: GW range, status badge (Completed / Live), top 3 teams with rank badge, points, and prize tag ($50 / $25)
- Live bracket uses Ice accent; completed brackets use Mint
- Data source: `results_1.csv`, `results_2.csv`, `results_3.csv`

### 3. Standings Timeline

- D3 multi-line chart showing league position (y-axis, inverted) over gameweeks (x-axis)
- One line per team, colour-coded
- Hover/touch shows tooltip with team name and position at that GW
- Data source: `standings_ts.csv`

### 4. Transfer Highlights

Two cards side-by-side (stacking on mobile):

- **Best Transfers** (Mint accent): top 3 transfers sorted by net_pts descending, showing player in/out and points gained
- **Worst Transfers** (Ice accent): top 3 transfers sorted by net_pts ascending, showing player in/out and points lost (red text)
- Data source: `top_df.csv`, `bottom_df.csv`

### 5. Bench Efficiency

- D3 bar chart showing total bench points left behind per team
- Bars use alternating Mint/Ice fills
- Subtitle: "Points lost by benching higher-scoring players"
- Data source: `total_bench_pts.csv`

### Footer

- "Data from FPL Draft API · Built by Danial Azam"
- Links to GitHub repo and portfolio

## Data Files & Column Mapping

The pipeline exports these CSVs. The `useData` hook maps snake_case CSV columns to camelCase TypeScript types.

| File | CSV Columns | Used by |
|------|-------------|---------|
| `results_1.csv` | `img`, `team_name`, `full_name`, `points` | Bracket Cards |
| `results_2.csv` | (same as above) | Bracket Cards |
| `results_3.csv` | (same as above) | Bracket Cards |
| `standings_ts.csv` | `name`, `gw`, `pos` | Standings Timeline |
| `top_df.csv` | `team`, `waiver_or_free`, `waiver_gw`, `next_gw`, `player_in`, `player_in_pts`, `player_out`, `player_out_pts`, `net_pts` | Transfer Highlights |
| `bottom_df.csv` | (same as top_df) | Transfer Highlights |
| `total_bench_pts.csv` | `name`, `bench_pts` | Bench Efficiency |

### Column mapping to TypeScript

- **Bracket results**: `team_name` → `name`, rank derived from row index (after sorting by `points` descending — see pipeline note below), `img` and `full_name` ignored in v1. Prize amounts are not in the CSV; they are derived from rank (1st = $50, 2nd = $25, others = $0) using bracket config.
- **Standings**: `pos` → `position`
- **Transfers**: `player_in` → `playerIn`, `player_out` → `playerOut`, `net_pts` → `netPts`, etc.
- **Bench**: `bench_pts` → `benchPts`

### Pipeline note

The `calc_points_bracket.sql` query orders by column 3 (`full_name`) descending, not by `points`. The frontend must sort bracket results by `points` descending before deriving rank.

### Derived values

- **`currentGw`**: derived from `max(gw)` in `standings_ts.csv`
- **Bracket status**: "completed" if `currentGw > bracket.endGw`, "live" if `currentGw >= bracket.startGw && currentGw <= bracket.endGw`, otherwise hidden
- **Earnings**: accumulated per team across all completed brackets. 1st place = $50, 2nd place = $25 per bracket.

### Configuration

Bracket GW ranges and prize amounts are defined in a `public/data/config.json` file, exported by the pipeline from `config.yaml`:

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

### Empty states

- If a CSV fails to load: show a muted "Data unavailable" message in that section
- If bracket 3 has no data yet (GW < 27): show the bracket card with "Upcoming" status badge and no team rows

Note: `cumm_points.csv`, `bench_pts.csv` (per-position), and `blunders_*.csv` (per-GW) are not used in v1 but remain available for Phase B enhancements.

## File Structure

```
drafty/
├── drafty/                    # Python pipeline (unchanged)
│   ├── data_ingest.py
│   ├── data_preprocess.py
│   ├── data_transform.py
│   ├── data_pipeline.py
│   ├── sql/
│   └── config.yaml
├── src/                       # Next.js frontend (new)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── BracketCard.tsx
│   │   ├── StandingsTimeline.tsx
│   │   ├── TransferHighlights.tsx
│   │   └── BenchEfficiency.tsx
│   ├── hooks/
│   │   └── useData.ts
│   └── lib/
│       └── types.ts
├── public/
│   └── data/                  # CSV exports from pipeline
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── README.md                  # Updated with full architecture docs
└── .github/
    └── workflows/
        └── weekly_refresh.yaml  # Updated to include Next.js build
```

## Components

### Header (`Header.tsx`)
- Props: `earnings: { name: string; amount: number }[]`, `currentGw: number`
- Renders title, subtitle, and earnings chip
- Earnings derived from bracket results at page level

### BracketCard (`BracketCard.tsx`)
- Props: `bracket: { label: string; gwRange: string; status: "completed" | "live" | "upcoming"; teams: { rank: number; name: string; points: number; prize?: number }[] }`
- Renders a single bracket card with rank badges, points, prize tags

### StandingsTimeline (`StandingsTimeline.tsx`)
- Props: `data: { name: string; gw: number; position: number }[]`
- D3 multi-line chart, SVG rendered client-side
- Inverted y-axis (1st at top), GW on x-axis
- Hover tooltip

### TransferHighlights (`TransferHighlights.tsx`)
- Props: `best: Transfer[]; worst: Transfer[]`
- Two side-by-side cards, top 3 each
- `Transfer` type: `{ team: string; playerIn: string; playerOut: string; netPts: number }`

### BenchEfficiency (`BenchEfficiency.tsx`)
- Props: `data: { name: string; benchPts: number }[]`
- D3 bar chart, sorted by most points lost

### useData hook (`useData.ts`)
- Generic CSV fetch + parse hook with column-mapping support
- Fetches from `public/data/`, parses CSV to typed arrays
- Handles snake_case → camelCase column renaming
- Returns `{ data, loading, error }`

## README Deliverable

The README.md must be updated with:

1. **Project overview** — what Drafty is, who it's for
2. **Architecture diagram** — end-to-end flow from FPL API to deployed static site
3. **Data pipeline** — how `data_pipeline.py` works, what it fetches, what it produces
4. **CSV outputs** — table of all CSV files and their contents
5. **Frontend** — how the Next.js app consumes the data
6. **Development setup** — how to run the pipeline and frontend locally
7. **Deployment** — how GitHub Actions refreshes data and where the site is hosted
8. **Configuration** — `config.yaml` explanation (league code, brackets)

## Phase B (Future)

Not in scope for this build, but planned:

- Per-GW transfer breakdown (expandable sections using `blunders_*.csv`)
- Per-position bench analysis (using `bench_pts.csv`)
- Player-level drill-downs
- Better chart interactivity (click to filter, animated transitions)
- Configurable league code support

## Non-Goals

- No server-side rendering or API routes — fully static
- No DuckDB in the browser — pipeline stays Python-only
- No authentication or user accounts
- No real-time data — weekly cron refresh only
