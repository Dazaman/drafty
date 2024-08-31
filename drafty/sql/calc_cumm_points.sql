WITH
    points
    as
    (
        SELECT team_id, gw, points, total_points
        FROM main.total_points
    )
SELECT
    b.player_first_name AS name,
    a.gw AS gw,
    a.total_points AS points
FROM points a
    LEFT JOIN league_entries b
    ON a.team_id = b.entry_id
ORDER BY gw, total_points desc