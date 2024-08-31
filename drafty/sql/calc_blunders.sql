
WITH
    transactions_c
    AS
    (
        SELECT *
        FROM main.transactions tr
        WHERE result = 'a'
            AND event = {{ gw }}
    ),
    gwl
    as
    (
        SELECT
            *,
            gw - 1 AS prev_week
        FROM main.gw_live
    ),
    players
    as
    (
        SELECT *
        FROM main.elements
    ),
    merged
    as
    (
        SELECT
            tr.*,
            gwl_out.gw,
            gwl_out.total_points as out_pts,
            gwl_in.total_points as in_pts, 
        FROM transactions_c tr
            LEFT JOIN gwl gwl_out
            ON tr.event = gwl_out.prev_week
                AND tr.element_out = gwl_out.id
            LEFT JOIN gwl gwl_in
            ON tr.event = gwl_in.prev_week
                AND tr.element_in = gwl_in.id
    ),
    details
    as
    (
        SELECT
            m.*,
            b.entry_name AS team_name,
            pi.web_name element_in_name,
            po.web_name element_out_name,
            in_pts - out_pts as diff
        FROM merged m
            LEFT JOIN players pi
            ON m.element_in = pi.id
            LEFT JOIN players po
            ON m.element_out = po.id
            LEFT JOIN league_entries b
            ON m.entry = b.entry_id
    )
SELECT
    team_name as team,
    kind as waiver_or_free,
    event as waiver_gw,
    gw as next_gw,
    element_in_name as player_in,
    in_pts as player_in_pts,
    element_out_name as player_out,
    out_pts as player_out_pts,
    diff as net_pts, 
FROM details
ORDER BY diff asc