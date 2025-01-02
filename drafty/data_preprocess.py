import os
import duckdb
import json
import pandas as pd
from loguru import logger
from typing import List
from data_ingest import (
    get_static_data,
    get_league_data,
    get_team_data,
    get_gw_team_data,
    get_gw_data,
)


# Helper function to load JSON data and create table
def load_json_to_table(
    con: duckdb.DuckDBPyConnection,
    file_path: str,
    keys: List[str],
    table_name: str = None,
):
    with open(file_path) as json_data:
        data = json.load(json_data)
        for key in keys:
            df = pd.json_normalize(data[key])  # noqa: F841
            table = table_name or key
            logger.info(f"Creating table {table} from {file_path}")
            con.sql(f"CREATE TABLE IF NOT EXISTS {table} AS SELECT * FROM df")


def get_details(
    con: duckdb.DuckDBPyConnection, league_code: str
) -> tuple[List[int], List[int]]:
    """
    Retrieve entry IDs and gameweek information from the database.

    Args:
        con (duckdb.DuckDBPyConnection): DuckDB connection object.
        league_code (str): Code of the league to retrieve data for.

    Returns:
        tuple[List[int], List[int]]: A tuple containing two lists:
            1. List of entry IDs
            2. List of gameweek numbers
    """
    results = con.sql("SELECT DISTINCT entry_id FROM league_entries").df()
    gw = con.sql("SELECT DISTINCT event FROM status").df()

    with open(r"drafty/data_gw", "w") as fp:
        fp.writelines(gw["event"].astype(str).to_list())

    with open(r"drafty/data_teams", "w") as fp:
        fp.write("\n".join(results["entry_id"].astype(str).to_list()))

    return results["entry_id"].to_list(), gw["event"].to_list()


def fetch_and_load_static_league_data(
    con: duckdb.DuckDBPyConnection,
    league_code: str,
) -> tuple[List[int], List[int], List[int]]:
    """
    Retrieve static and league-specific data.

    Args:
        con (duckdb.DuckDBPyConnection): DuckDB connection object.
        league_code (str): Code of the league to retrieve data for.

    Returns:
        None
    """
    # Fetch static and league data
    get_static_data()
    get_league_data(league_code=league_code)

    # Load main data files
    data_files = {
        "drafty/data/details.json": ["league_entries", "league", "standings"],
        "drafty/data/event-status.json": ["status"],
        "drafty/data/bootstrap-static.json": ["elements"],
        "drafty/data/transactions.json": ["transactions"],
    }

    for file_path, keys in data_files.items():
        load_json_to_table(con=con, file_path=file_path, keys=keys)

    # Get entry IDs and gameweeks
    entries, max_gw = get_details(con=con, league_code=league_code)
    gameweeks = list(range(1, max_gw[0] + 1))

    # Log entries and latest gameweek
    logger.info(f"Number of entries: {len(entries)}")
    logger.info(f"Latest gameweek: {max_gw[0]}")

    return entries, max_gw, gameweeks


def fetch_and_load_live_league_data(
    con: duckdb.DuckDBPyConnection,
    entries: List[int],
    gameweeks: List[int],
) -> None:
    """
    Load data from JSON files into the database.

    Args:
        con (duckdb.DuckDBPyConnection): DuckDB connection object.

    Returns:
        None
    """
    for team_id in entries:
        get_team_data(team_id=team_id)
        for gw in gameweeks:
            get_gw_team_data(team_id=team_id, gw=gw)

    # Fetch gameweek data
    for gw in gameweeks:
        get_gw_data(gw=gw)

    # Load team history data
    for entry in os.listdir("drafty/data"):
        if entry.startswith("team_"):
            history_file = f"drafty/data/{entry}/history.json"
            logger.info(f"Loading history data for {entry} - , {history_file}")
            load_json_to_table(con, history_file, ["history"], table_name=entry)
            # Drop specific columns and save as CSV
            history_df = pd.read_sql(f"SELECT * FROM {entry}", con)
            history_df = history_df.drop(["rank", "rank_sort"], axis=1)
            history_df.to_csv(f"drafty/data/{entry}/history.csv", index=False)

    # Load gameweek live data
    gw_live_data = []
    for file in os.listdir("drafty/data/gw"):
        if file.endswith(".json"):
            with open(f"drafty/data/gw/{file}") as json_data:
                data = json.load(json_data)
                gw = file.split("_")[0]
                for element_id, element_data in data["elements"].items():
                    row = element_data["stats"]
                    row["id"] = element_id
                    row["gw"] = gw
                    gw_live_data.append(row)

    gw_live_df = pd.DataFrame(gw_live_data)
    gw_live_df.to_csv("drafty/data/gw_live.csv", index=False)
    con.sql(
        "CREATE TABLE IF NOT EXISTS gw_live AS FROM read_csv('drafty/data/gw_live.csv', auto_detect=TRUE)"
    )

    # Load gameweek event data
    gw_event_data = []
    for team_id in entries:
        team_dir = f"drafty/data/team_{team_id}"
        for file in os.listdir(team_dir):
            if file.endswith("event.json"):
                with open(f"{team_dir}/{file}") as json_data:
                    data = json.load(json_data)
                    gw = file.split("_")[0]
                    for pick in data["picks"]:
                        pick["gw"] = gw
                        pick["team_id"] = team_id
                        gw_event_data.append(pick)

    gw_event_df = pd.DataFrame(gw_event_data)
    gw_event_df = gw_event_df.drop(
        ["is_captain", "is_vice_captain", "multiplier"], axis=1
    )
    gw_event_df.to_csv("drafty/data/gw_event.csv", index=False)
    con.sql(
        "CREATE TABLE IF NOT EXISTS gw_event AS FROM read_csv('drafty/data/gw_event.csv', auto_detect=TRUE)"
    )
