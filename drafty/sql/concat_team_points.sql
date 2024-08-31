
{% for team_id in team_ids %}
SELECT
    entry AS team_id,
    event AS gw,
    points AS points,
    total_points AS total_points
FROM {%-
if true %} team_{{ team_id }} {%- endif %}
{%
if not loop.last %}
UNION ALL
{% endif %}
{% endfor %}