# Drafty

FPL Draft league analytics built with Next.js, React, TypeScript, D3 and Tailwind, backed by a Python/DuckDB pipeline. League ID, gameweek brackets, prize amounts and currency are configurable.

[Public site](https://drafty-flame.vercel.app/)

## Season and data

The season is derived from the official [FPL Draft bootstrap API](https://draft.premierleague.com/api/bootstrap-static): the first gameweek deadline identifies the season's starting year. There is no hardcoded year or browser-calendar fallback. Refreshes export that metadata alongside the scores to `public/data/config.json`.

`season` describes the current API season; `datasetSeason` describes the API snapshot that produced the cached scores. If they differ, the site explicitly identifies the older score dataset and offers a refresh link. The page title, navigation, header, admin panel and video use this metadata.

## Setup

Use Node.js 22.18+ (Node 24 recommended) and Python 3.11–3.13.

```bash
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements-pipeline.txt
npm run build
npm run admin
```

Open [the local admin panel](http://127.0.0.1:8001/admin/). The service also serves the league overview, transfers and bench pages from the built static app.

For frontend development, run `npm run dev`. Its Admin page links to the local service; the static Next.js development server does not execute Python jobs itself. Rebuild after editing frontend source to update the UI served by the admin service.

The original Poetry environment remains supported: `poetry install` and `poetry run python drafty/admin_server.py`.

## Admin panel

- Set the FPL Draft league ID (the number in `/api/league/<id>/details`).
- Add or remove up to eight brackets and edit their gameweek ranges. Ranges must be ordered, non-overlapping and within GW 1–38.
- Set per-rank bracket payouts, separate overall-season payouts, the entry fee per manager, and currency (USD, GBP, EUR or PKR). The bracket schedule applies to every bracket. Manager count comes from the exported league data. Admin shows the pool, allocation and any surplus or shortfall; the overview displays the full payout schedule.
- Choose **Refresh from FPL API** when switching leagues or updating the current season's scores. Otherwise, recalculate the existing database with the new brackets and winnings.
- Click **Apply configuration & run pipeline**, follow the live log, then open the updated league.

Runs use an isolated temporary workspace. Invalid inputs are rejected; concurrent runs are blocked. Configuration and scores are published only after the pipeline succeeds. Pipeline failures preserve the previously published data. Each replacement file is published atomically. Refreshes update both `public/data/` and the running local static preview's `out/data/`.

The service binds to `127.0.0.1` only, checks the Host header and requires same-origin JSON requests for mutations. It is a local administration tool. A hosted multi-user admin would need a persistent backend, authentication and a job queue; the public deployment remains static. Local changes are not automatically committed or deployed.

## Page flow

The overview prioritizes standings and the latest weekly story. The full replay lives at `/journey/`; bracket results, earned awards and prize rules live together at `/competition/`. Transfers and bench decisions remain separate analysis pages, with weekly moves and practical filters shown before historical highlights. Admin is in a separate management area.

The shared navigation and page-specific next steps connect these jobs. Competition links such as `/competition/#bracket-2` and `/competition/#winnings` open the relevant section directly, and bracket selection works with browser Back. League exports include manager/team identities for consistent table labels.

See [the UX review](docs/ux-review.md) for the page decisions and implemented flows.

## Season journey

The standings journey reveals the race week by week with Play/Pause, replay, previous/next week, scrubbing and playback speed. It shows interpolated paths, the current weekly leaderboard and cumulative points, lead-change milestones, and commentary calculated from recorded positions. Managers can be highlighted individually. Reduced-motion preferences disable playback while retaining manual exploration.

**Download season video** records a branded animated recap in the browser with Canvas and MediaRecorder. It downloads WebM, or MP4 where supported. Keep the tab active while recording; it takes roughly 8–26 seconds. Recording can be cancelled. Browsers without recording support can still play the journey. The recording includes the whole league and uses the score dataset's season.

## Pipeline

```text
FPL Draft API → Python ingestion/preprocessing → DuckDB
             → SQL transforms → CSVs + season/config/bracket JSON
             → Next.js static site
```

`drafty/config.yaml` is the saved league configuration. The admin writes it after a successful run. For command-line use:

```bash
# Safe staged full refresh, also used by GitHub Actions
.venv/bin/python drafty/admin_server.py --refresh-once

# Direct in-place reprocess (still checks the API for current-season metadata)
.venv/bin/python drafty/data_pipeline.py

# Direct in-place API refresh; prefer the staged runner above
.venv/bin/python drafty/data_pipeline.py --refresh
```

Transforms replace derived DuckDB tables on each run so bracket/selection changes reach downstream metrics. Reprocessing covers all cached gameweeks. Transfer highlights only include the dataset's current gameweek range.

| Frontend export | Contents |
|---|---|
| `config.json` | League, season identity, dataset season, refresh timestamp, brackets, currency and prizes |
| `brackets.json` | All configured bracket standings; number of brackets is not fixed in React |
| `results_*.csv` | Individual bracket results |
| `standings_ts.csv` | League positions per manager/week |
| `cumm_points.csv` | Cumulative points per manager/week |
| `top_df.csv`, `bottom_df.csv` | Best/worst transfers by next-week net points |
| `blunders_*.csv` | Transfers by transaction week; unscored results display as pending |
| `total_bench_pts.csv`, `bench_pts.csv` | Bench losses per manager and position |

GitHub Actions runs a staged full refresh every Tuesday at 00:00 UTC and commits `drafty/data/`, `drafty.db` and `public/data/`. The push triggers the static Vercel build. Manual `workflow_dispatch` is supported.

## Checks

```bash
npm run lint
npm run typecheck
npm test
.venv/bin/python -m unittest discover -s tests -v
npm run build
```

Tests cover season inference, configuration validation, local admin access checks, concurrent-run prevention, failed-run preservation, export completeness and journey narration/interpolation.
