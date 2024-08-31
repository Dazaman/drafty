SELECT name, SUM(pts_lost) as bench_pts
FROM bench_pts
GROUP BY name
ORDER BY bench_pts