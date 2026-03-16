# Drafty

An FPL Draft League analytics dashboard for league **33786** (2024/25 season). Originally built with Streamlit, rebuilt as a Next.js static site.

## Architecture

```
FPL Draft API
     │
     ▼
data_ingest.py          ← fetches raw league, entry, and gameweek data
     │
     ▼
data_preprocess.py      ← cleans and normalizes into DuckDB tables
     │
     ▼
data_transform.py       ← SQL transforms via DuckDB (standings, bench pts, transfers)
     │
     ▼
drafty.db               ← local DuckDB database
     │
     ▼
CSV exports             ← written to public/data/
     │
     ▼
Next.js static site     ← D3.js charts, Tailwind CSS v4
     │
     ▼
Vercel / static hosting
```

GitHub Actions (`weekly_refresh.yaml`) runs the full pipeline every Tuesday at 00:00 UTC, commits the updated DuckDB file and CSVs, then triggers a new static build.

---

## Data Pipeline

The pipeline is orchestrated by `drafty/data_pipeline.py` and consists of three modules:

| Module | Responsibility |
|---|---|
| `data_ingest.py` | Fetches raw data from the FPL Draft API (league entries, gameweek status, team picks, live scores) |
| `data_preprocess.py` | Cleans and normalizes raw data; loads static league data (`fetch_and_load_static_league_data`) and per-gameweek live data (`fetch_and_load_live_league_data`) into DuckDB |
| `data_transform.py` | Runs DuckDB SQL transforms to produce analytics tables: bracket standings, bench efficiency, transfer blunders, running standings, cumulative points |

### Running the pipeline

```bash
# From the repo root

# First run / full refresh (re-fetches all data from API)
poetry run python drafty/data_pipeline.py --refresh True

# Reprocess existing data without hitting the API
poetry run python drafty/data_pipeline.py
```

The pipeline reads `drafty/config.yaml` for the league code and bracket definitions, then writes results to `drafty.db` and exports CSVs to `public/data/`.

---

## Configuration

`drafty/config.yaml` drives both the pipeline and the frontend.

```yaml
league_code: 33786
brackets:
  "1": ["1", "13"]    # Bracket 1: GW1–GW13
  "2": ["14", "26"]   # Bracket 2: GW14–GW26
  "3": ["27", "38"]   # Bracket 3: GW27–GW38
```

At build time the config is exported to `public/data/config.json` so the Next.js frontend can read it without a server.

---

## CSV Outputs

All files are written to `public/data/` and loaded by the frontend at runtime.

| File | Description |
|---|---|
| `results_1.csv` | Bracket 1 final standings (GW1–13) |
| `results_2.csv` | Bracket 2 final standings (GW14–26) |
| `results_3.csv` | Bracket 3 final standings (GW27–38) |
| `standings_ts.csv` | League position over time (one row per manager per GW) — powers the standings timeline chart |
| `top_df.csv` | Best transfers by net points gained |
| `bottom_df.csv` | Worst transfers (biggest points lost) |
| `total_bench_pts.csv` | Total bench points left unused per manager — bench efficiency metric |

---

## Frontend

| Technology | Version | Role |
|---|---|---|
| Next.js | 15+ | Static export (`output: 'export'`) |
| React | 19 | Component framework |
| D3.js | 7 | Data-driven charts (standings timeline, bench efficiency) |
| Tailwind CSS | v4 | Utility-first styling |
| TypeScript | 5 | Type safety throughout |

### Theme

Deep Ocean base with Mint & Ice accent palette. All design tokens are defined in `src/app/globals.css`.

### Key source paths

```
src/
  app/
    page.tsx            ← root page, composes all sections
    globals.css         ← Tailwind theme tokens
  components/           ← BracketCard, StandingsTimeline, BenchEfficiency, TransferHighlights, Header
  hooks/                ← useCSV, useConfig — data-fetching hooks
  lib/                  ← shared utilities
public/data/            ← CSV exports + config.json (pipeline outputs)
```

---

## Development Setup

### Python pipeline

```bash
# Install Poetry if not already installed
pip install poetry

# Install dependencies
poetry install

# Run pipeline (reprocess existing data)
poetry run python drafty/data_pipeline.py

# Run pipeline with full API refresh
poetry run python drafty/data_pipeline.py --refresh True
```

Requires Python `>=3.11,<3.14`. Key dependencies: `duckdb ^1.0.0`, `pandas ^2.2.2`, `loguru ^0.7.2`.

### Frontend

```bash
# Install Node dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build static export
npm run build
```

---

## Deployment

### GitHub Actions — `weekly_refresh.yaml`

Runs every Tuesday at 00:00 UTC (also supports manual `workflow_dispatch`).

Steps:
1. Check out the repository
2. Set up Python 3.11 and install dependencies via Poetry
3. Delete stale data files (`drafty/data/`, `drafty.db`)
4. Run `poetry run python drafty/data_pipeline.py --refresh True`
5. Commit and push the updated `drafty/data/` and `drafty.db` back to `main`

The push to `main` triggers a Vercel deploy which rebuilds the Next.js static export from the fresh CSVs.

---

## Ideas / Future Work

- Display current GW team lineups
- Read directly from DuckDB instead of CSV exports (evaluate size and performance trade-offs)
- Support multiple leagues via parameterised config
- Document how to find your own league code
