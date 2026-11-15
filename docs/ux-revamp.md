# Drafty UX

The main jobs are to understand the title race, compare bracket results and winnings, investigate transfers, and review bench decisions. Persistent navigation gives each job a destination; Admin manages the competition and refreshes the data.

The overview prioritizes full standings, cumulative points and weekly movement. The season journey now has its own page; it plays through recorded gameweeks, narrates lead changes, highlights turning points and exports a short browser-recorded video. Bracket results, earned awards and prize rules live together on the competition page. See [the latest UX review](ux-review.md) for the page decisions and flows. Tables and manual week controls remain available to keyboard users and people who prefer reduced motion.

Season identity comes from the FPL API's gameweek deadlines. Current API season and cached score season are tracked separately; the interface never silently relabels historic scores. League, season, brackets and prize currency are exported data rather than UI constants.

The local admin validates league/bracket/prize inputs, runs the Python pipeline in an isolated workspace, reports logs and only publishes successful results. The public site remains a static deployment; local administration changes require a normal commit/deploy to update it.

The bracket payout tie-break policy remains the original points-sort/rank-order behavior. A future change to split prizes needs a league rule decision. The bench metric describes potential same-position gains, not a full formation-constrained optimal lineup calculation.
