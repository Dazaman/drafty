import os
import pandas as pd
from loguru import logger
from jinja2 import Template


def read_sql_template(file_name):
    sql_file_path = os.path.join("sql", file_name)
    with open(sql_file_path, "r") as sql_file:
        return sql_file.read()


def concat_team_points(con, team_ids):
    sql_template = read_sql_template("concat_team_points.sql")
    template = Template(sql_template)
    sql_query = template.render(team_ids=team_ids)
    joined = con.sql(sql_query).df()
    joined.to_csv("data/joined.csv", index=False)
    con.sql(
        "CREATE TABLE IF NOT EXISTS total_points AS FROM read_csv('data/joined.csv', auto_detect = TRUE);"
    )
    logger.info(f"Concatenated points data for {len(team_ids)} teams")


def calc_points_bracket(con, brackets, bracket):
    sql_template = read_sql_template("calc_points_bracket.sql")
    template = Template(sql_template)
    sql_query = template.render(
        start_gw=brackets[bracket][0], end_gw=brackets[bracket][1]
    )

    results = con.sql(sql_query).df()
    results.to_csv(f"data/results_{bracket}.csv", index=False)


def calc_running_standings(con):
    sql_query = read_sql_template("calc_running_standings.sql")
    standings_ts = con.sql(sql_query).df()
    standings_ts.to_csv("data/standings_ts.csv", index=False)
    con.sql(
        "CREATE TABLE IF NOT EXISTS standings_ts AS FROM read_csv('data/standings_ts.csv', auto_detect = TRUE);"
    )


def calc_cumm_points(con):
    sql_query = read_sql_template("calc_cumm_points.sql")
    cumm_points = con.sql(sql_query).df()
    cumm_points.to_csv("data/cumm_points.csv", index=False)
    con.sql(
        "CREATE TABLE IF NOT EXISTS cumm_points AS FROM read_csv('data/cumm_points.csv', auto_detect = TRUE);"
    )


def calc_blunders(con, gw):
    sql_template = read_sql_template("calc_blunders.sql")
    template = Template(sql_template)
    sql_query = template.render(gw=gw)

    blunders = con.sql(sql_query).df()
    blunders.to_csv(f"data/blunders_{gw}.csv", index=False)
    con.sql(
        f"CREATE TABLE IF NOT EXISTS blunders_{gw} AS FROM read_csv('data/blunders_{gw}.csv', auto_detect = TRUE);"
    )


def top_n_transfers(con):
    df_list = []

    for file in os.listdir("data/."):
        if file.startswith("blunders"):
            df = pd.read_csv(f"data/{file}")
            df_list.append(df)

    df_stacked = pd.concat(df_list)

    top_df = df_stacked.nlargest(10, "net_pts")
    top_df.to_csv("data/top_df.csv", index=False)

    con.sql(
        "CREATE TABLE IF NOT EXISTS top_n_transfers AS FROM read_csv('data/top_df.csv', auto_detect = TRUE);"
    )

    bottom_df = df_stacked.nsmallest(10, "net_pts")
    bottom_df.to_csv("data/bottom_df.csv", index=False)

    con.sql(
        "CREATE TABLE IF NOT EXISTS bottom_n_transfers AS FROM read_csv('data/bottom_df.csv', auto_detect = TRUE);"
    )


def calc_bench_pts(con):
    sql_query = read_sql_template("calc_bench_points.sql")
    bench_pts = con.sql(sql_query).df()
    bench_pts.to_csv("data/bench_pts.csv", index=False)
    con.sql(
        "CREATE TABLE IF NOT EXISTS bench_pts AS FROM read_csv('data/bench_pts.csv', auto_detect = TRUE);"
    )

    grp_sql = read_sql_template("calc_total_bench_pts.sql")
    total_bench_pts = con.sql(grp_sql).df()
    total_bench_pts.to_csv("data/total_bench_pts.csv", index=False)
    con.sql(
        "CREATE TABLE IF NOT EXISTS total_bench_pts AS FROM read_csv('data/total_bench_pts.csv', auto_detect = TRUE);"
    )
