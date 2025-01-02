import argparse
import os
import yaml
import duckdb
from loguru import logger
from typing import List
from data_preprocess import (
    fetch_and_load_static_league_data,
    fetch_and_load_live_league_data,
)
from data_transform import (
    concat_team_points,
    calc_points_bracket,
    calc_bench_pts,
    calc_blunders,
    calc_running_standings,
    calc_cumm_points,
    top_n_transfers,
)


def data_pipeline(refresh: bool, league_code: str, brackets: List[str]):
    con = duckdb.connect("drafty.db")

    with duckdb.connect("drafty.db") as con:
        if refresh:
            entries, max_gw, gameweeks = fetch_and_load_static_league_data(
                con=con, league_code=league_code
            )
            fetch_and_load_live_league_data(
                con=con, entries=entries, gameweeks=gameweeks
            )
        else:
            # Retrieve entries from the database if not refreshing
            entries = (
                con.sql("SELECT DISTINCT entry_id FROM league_entries")
                .df()["entry_id"]
                .tolist()
            )
            gameweeks = (
                con.sql("SELECT DISTINCT event FROM status").df()["event"].tolist()
            )

        concat_team_points(con=con, team_ids=entries)
        calc_bench_pts(con=con)

        for i in gameweeks:
            calc_blunders(con=con, gw=i)

        for i in brackets.keys():
            calc_points_bracket(con=con, brackets=brackets, bracket=i)

        calc_running_standings(con=con)
        calc_cumm_points(con=con)
        top_n_transfers(con=con)


def parse_arguments(cli_args: list[str] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()

    parser.add_argument("--refresh", default=False, type=bool)

    return parser.parse_args(args=cli_args)


def main(cli_args: List[str]):

    logger.add("app.log", rotation="500 MB")
    args = parse_arguments(cli_args=cli_args)

    refresh = args.refresh

    # Read the config file
    with open("drafty/config.yaml", "r") as config_file:
        config = yaml.safe_load(config_file)

    brackets = config.get("brackets")
    league_code = config.get("league_code")

    if not league_code:
        logger.error("Error: league_code not found in config.yaml")
        return

    # Create directories if they don't exist
    os.makedirs("drafty/data/GW", exist_ok=True)

    data_pipeline(refresh=refresh, league_code=league_code, brackets=brackets)


if __name__ == "__main__":
    import sys

    main(sys.argv[1:])
