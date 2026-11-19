# UX review and revised flow

## Findings

The overview had become a full report: a promotional introduction, summary cards, prize rules, standings, a full interactive season replay, transfer rankings and bench comparisons. Managers had to scroll past unrelated information to reach a task. Prize schedules occupied more prominent space than the league table. Admin appeared beside everyday manager tasks. Detail pages repeated back links and footers while providing little direction to a related task.

The central weekly job is to understand league position and movement. The other important jobs are to understand bracket results and winnings, replay the season, and investigate transfers or bench decisions. They deserve depth, but do not all need to be rendered on the opening page.

## Page decisions

| Destination | Main question | Essential contents | Why it belongs here |
|---|---|---|---|
| Overview `/` | Where does everyone stand now? | Leader/gap, latest bracket, prize-pool link, full season standings and movement, short weekly story | A compact starting point for repeat visits; no full replay or rules to scroll through |
| Season journey `/journey/` | How did we get here? | Playback, manager highlighting, weekly leaderboard, turning points, video export | Exploration and recording need a focused space; playback controls appear before the chart, including on phones |
| Brackets & winnings `/competition/` | Who won each stage, and what is at stake? | Four-stage calendar, selected bracket results, earned bracket awards, overall/bracket payout schedule, entry fee and calculation notes | Brackets and money are closely related; splitting them into separate pages would create unnecessary navigation |
| Transfers `/transfers/` | Did a transfer pay off? | Latest-week moves first; previous/next week, team/type filters, pending-score explanation; historical extremes second | A weekly investigation is more frequent than browsing all-time highlights |
| Bench decisions `/bench/` | Where did lineup decisions cost points? | Manager comparison, manager/position breakdown filters, explanation of the hindsight metric | Bench outcomes have a different unit and method from transfers; combining them into one large analysis page would obscure both |
| League admin `/admin/` | How do I manage the competition? | Settings, brackets, separate season/bracket prizes, budget check, pipeline run and log | An occasional management job, separated from everyday league navigation |

No extra analytics hub, rules page or dashboard subpage is needed. Navigation groups Transfers and Bench decisions under Decision analysis. Admin sits in the desktop management area and behind a labelled gear link on mobile.

## Flows implemented

1. **Weekly check-in:** Overview → season standings → short weekly story → Season journey → back to standings or bracket results.
2. **Bracket check:** Overview's latest-bracket card → a direct `#bracket-N` link → selected results → earned awards → prize rules. Upcoming brackets show a start week instead of an empty table. Hash selection supports direct links and browser Back.
3. **Prize check:** Overview pool card → `#winnings` → full allocation. Earned bracket awards exclude live and upcoming prizes and are labelled separately from payments.
4. **Decision review:** Overview preview or grouped navigation → Transfers → choose week/team/type → inspect scored or pending moves → Bench decisions (carrying the selected team’s manager) → filter position → return to standings.
5. **Administration:** management link → settings → apply and run → review bracket awards or the updated league.

## Shared conventions

- All manager pages use a consistent introduction and explicit task name. Explanations sit beside the controls they affect.
- Navigation, page location, season and score status remain consistent. One shared footer reports the published snapshot date and data source.
- Repeated standalone "Back to Dashboard" links are replaced by persistent navigation and specific next-step links.
- Mobile navigation stays available while scrolling and reveals the active destination. Core standings fit the screen; wide transfer tables scroll within their own panel.
- Full manager names and team identities come from the league API export, reducing the mismatch between season and bracket tables.
- Loading, request failures, no matches and upcoming stages are distinguished. Filters can be cleared and changing a transfer week retains the team/type selection.
- Bracket completion follows FPL's finished-week metadata, including a bracket that ends on the latest available week. Tests cover completion, live/upcoming status, default selection and exclusion of provisional prizes from earned awards.

## Remaining product decision

Prize tie-break rules remain the existing ordered-results behavior. A split-prize policy requires an explicit league rule; this review changes navigation and presentation rather than inventing payout policy.

## Story-led overview

The overview now opens with the real season journey, playing automatically and looping after a five-second hold on the latest week. A compact chart and manager selector lead into the current standings alongside a four-bracket digest and prize pool. Blue, violet and gold surface accents distinguish the three areas without using warning colors for navigation.

The transfer reel rotates through the three highest and three lowest next-week returns, with exact incoming/outgoing scores, manual navigation and a detailed-view link. It pauses on hover or keyboard focus. Both moving sections have pause controls, stop in hidden tabs, and respect reduced-motion preferences; the journey also suspends while offscreen. Full journey evidence, video export, bracket results and transfer filters stay on their dedicated pages.
