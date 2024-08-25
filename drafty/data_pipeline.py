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


def data_pipeline(refresh: bool, league_code: str, brackets: List[str]):
    con = duckdb.connect("drafty.db")

    try:
        with duckdb.connect("drafty.db") as con:
            if refresh:
                entries, max_gw, gameweeks = fetch_and_load_static_league_data(
                    con=con, league_code=league_code
                )
                fetch_and_load_live_league_data(
                    con=con, entries=entries, gameweeks=gameweeks
                )
    except duckdb.Error as e:
        logger.error(f"Error connecting to or querying the database: {e}")


def parse_arguments(cli_args: list[str] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()

    parser.add_argument("--refresh", default=True, type=bool)

    return parser.parse_args(args=cli_args)


def main(cli_args: List[str]):

    logger.add("app.log", rotation="500 MB")
    args = parse_arguments(cli_args=cli_args)

    refresh = args.refresh

    # Read the config file
    with open("config.yaml", "r") as config_file:
        config = yaml.safe_load(config_file)

    brackets = config.get("brackets")
    league_code = config.get("league_code")

    if not league_code:
        logger.error("Error: league_code not found in config.yaml")
        return

    # Create directories if they don't exist
    os.makedirs("data/GW", exist_ok=True)

    data_pipeline(refresh=refresh, league_code=league_code, brackets=brackets)


if __name__ == "__main__":
    import sys

    main(sys.argv[1:])
