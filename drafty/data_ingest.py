import requests
import json
import os
from loguru import logger


def get_json(json_files, apis) -> None:
    with requests.Session() as session:
        for file, api in zip(json_files, apis):

            logger.info(f"Fetching {file} from {api}")
            response = session.get(api)
            response.raise_for_status()  # Raise an exception for HTTP errors

            with open(file, "w") as outfile:
                json.dump(response.json(), outfile)


def get_static_data() -> list:
    api_endpoints = [
        "bootstrap-dynamic",
        "game",
        "bootstrap-static",
        "pl/event-status",
    ]

    base_url = "https://draft.premierleague.com/api/"
    json_files = [
        f"drafty/data/{endpoint.split('/')[-1]}.json" for endpoint in api_endpoints
    ]
    apis = [f"{base_url}{endpoint}" for endpoint in api_endpoints]

    get_json(json_files=json_files, apis=apis)

    return json_files


def get_league_data(league_code) -> list:
    api_endpoints = [
        f"league/{league_code}/details",
        f"league/{league_code}/element-status",
        f"draft/league/{league_code}/transactions",
        f"draft/{league_code}/choices",
    ]

    base_url = "https://draft.premierleague.com/api/"
    json_files = [
        f"drafty/data/{endpoint.split('/')[-1]}.json" for endpoint in api_endpoints
    ]
    apis = [f"{base_url}{endpoint}" for endpoint in api_endpoints]

    get_json(json_files=json_files, apis=apis)

    return json_files


def get_team_data(team_id):
    api_endpoints = [
        f"entry/{team_id}/public",
        f"entry/{team_id}/history",
        # f"entry/{team_id}/my-team",
        # f"watchlist/{team_id}",
    ]

    base_url = "https://draft.premierleague.com/api/"
    team_dir = f"drafty/data/team_{team_id}"
    os.makedirs(team_dir, exist_ok=True)

    json_files = [
        f"{team_dir}/{endpoint.split('/')[-1]}.json" for endpoint in api_endpoints
    ]
    apis = [f"{base_url}{endpoint}" for endpoint in api_endpoints]

    get_json(json_files=json_files, apis=apis)


def get_gw_data(gw):
    api_endpoints = [f"event/{gw}/live"]

    base_url = "https://draft.premierleague.com/api/"
    gw_dir = "drafty/data/gw"
    os.makedirs(gw_dir, exist_ok=True)  # Create gw directory if it doesn't exist

    json_files = [f"{gw_dir}/{gw}_live.json"]
    apis = [f"{base_url}{endpoint}" for endpoint in api_endpoints]

    get_json(json_files=json_files, apis=apis)


def get_gw_team_data(team_id, gw):
    api_endpoints = [f"entry/{team_id}/event/{gw}"]

    base_url = "https://draft.premierleague.com/api/"
    json_files = [f"drafty/data/team_{team_id}/{gw}_event.json"]
    apis = [f"{base_url}{endpoint}" for endpoint in api_endpoints]

    get_json(json_files=json_files, apis=apis)
