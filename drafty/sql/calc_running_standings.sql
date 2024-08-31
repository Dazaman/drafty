WITH
    points
    as
    (
        SELECT team_id, gw, points, total_points
        FROM main.total_points
    )
SELECT
    b.player_first_name AS name,
    a.gw,
    RANK() OVER (PARTITION BY a.gw order by a.total_points DESC) as pos
FROM points a
    LEFT JOIN league_entries b
    ON a.team_id = b.entry_id
ORDER BY gw