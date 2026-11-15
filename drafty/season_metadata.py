"""Season identity comes from FPL event deadlines, never the machine's date."""

from datetime import datetime, timezone
import json
from pathlib import Path

BOOTSTRAP_URL = "https://draft.premierleague.com/api/bootstrap-static"


def season_from_bootstrap(bootstrap):
    events = bootstrap.get("events", {})
    rows = events.get("data", []) if isinstance(events, dict) else events
    dated = [row for row in rows if row.get("deadline_time")]
    if not dated:
        raise ValueError("FPL API response contains no gameweek deadlines")
    first = min(dated, key=lambda row: int(row["id"]))
    start = datetime.fromisoformat(first["deadline_time"].replace("Z", "+00:00")).year
    finished = [int(row["id"]) for row in rows if row.get("finished")]
    return {
        "label": f"{start}/{start + 1}",
        "startYear": start,
        "endYear": start + 1,
        "currentGameweek": events.get("current", 0) if isinstance(events, dict) else 0,
        "lastFinishedGw": max(finished, default=0),
        "totalGameweeks": max((int(row["id"]) for row in rows), default=38),
        "source": BOOTSTRAP_URL,
    }


def load_metadata(source, fetch=True):
    source = Path(source)
    cached = source / "bootstrap-static.json"
    dataset = (
        season_from_bootstrap(json.loads(cached.read_text()))
        if cached.exists()
        else None
    )
    if fetch:
        import requests

        response = requests.get(BOOTSTRAP_URL, timeout=25)
        response.raise_for_status()
        season = season_from_bootstrap(response.json())
    elif dataset:
        season = dataset
    else:
        raise ValueError("No API season metadata is available")
    return {
        "season": season,
        "datasetSeason": dataset,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
