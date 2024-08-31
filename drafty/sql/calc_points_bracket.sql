WITH
    gw
    AS
    (
        SELECT
            *
        FROM total_points
        WHERE gw >= {{ start_gw }} AND gw <= {{ end_gw }}
    ),
    pts_table
    AS
    (
        SELECT
            team_id,
            SUM(points) as points
        FROM gw
        GROUP BY 1
    )
SELECT
    CONCAT('app/static/',b.short_name, '.png') AS img,
    b.entry_name AS team_name,
    CONCAT(b.player_first_name,' ', b.player_last_name) AS full_name,
    a.points AS points
FROM pts_table a
    LEFT JOIN league_entries b
    ON a.team_id = b.entry_id
ORDER BY 3 desc