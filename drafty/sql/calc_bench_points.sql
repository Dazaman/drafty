
WITH
    teams
    as
    (
        SELECT
            "element",
            "position",
            gw,
            team_id
        FROM
            main.gw_event
    ),
    live
    as
    (
        SELECT
            live.*,
            players.web_name,
            players.element_type
        FROM
            main.gw_live live
            LEFT JOIN elements players
            ON
        live.id = players.id
    ),
    joined
    as
    (
        SELECT
            teams.*,
            live.total_points,
            live.web_name,
            CASE
            WHEN live.element_type == '01' THEN 'GKP'
            WHEN live.element_type == '02' THEN 'DEF'
            WHEN live.element_type == '03' THEN 'MID'
            WHEN live.element_type == '04' THEN 'FWD'
            ELSE '00'
        END AS player_type
        FROM
            teams
            JOIN live
            ON
            teams.element = live.id
                AND teams.gw = live.gw
    ),
    subs
    as
    (
        SELECT
            *
        FROM
            joined
        WHERE
        position >= 12
    ),
    starting
    as
    (
        SELECT
            *
        FROM
            joined
        WHERE 
        position < 12
    ),
    best_starting
    as
    (
        SELECT
            gw,
            team_id,
            player_type,
            MIN(total_points) as min_points_start
        FROM
            starting
        GROUP BY
        1,
        2,
        3
    ),
    best_subs
    as
    (
        SELECT
            gw,
            team_id,
            player_type,
            MAX(total_points) as max_points_subs
        FROM
            subs
        GROUP BY
        1,
        2,
        3
    ),
    final
    as
    (
        SELECT
            start.*,
            subs.max_points_subs,
            min_points_start - max_points_subs as diff
        FROM
            best_starting start
            JOIN
            best_subs subs
            ON start.gw = subs.gw
                AND start.team_id = subs.team_id
                AND start.player_type = subs.player_type
        ORDER BY
        subs.gw,
        subs.team_id
    ),
    grouped
    as
    (
        SELECT
            team_id,
            player_type,
            sum(diff) as pts_lost
        FROM final
        WHERE diff < 0
        GROUP BY 1,2
    )
SELECT
    b.player_first_name as name,
    g.player_type,
    g.pts_lost, 
FROM grouped g
    LEFT JOIN league_entries b
    ON g.team_id = b.entry_id
ORDER BY name, pts_lost;