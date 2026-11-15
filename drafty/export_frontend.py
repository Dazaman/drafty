"""Publish the pipeline's CSV outputs to the static frontend."""

import json
import os
from pathlib import Path
import shutil
import tempfile
import csv
from season_metadata import load_metadata


def export_frontend(
    config, source=Path("drafty/data"), target=Path("public/data"), metadata=None
):
    source, target = Path(source), Path(target)
    required = [
        "standings_ts.csv",
        "cumm_points.csv",
        "bench_pts.csv",
        "total_bench_pts.csv",
        "top_df.csv",
        "bottom_df.csv",
        *[f"results_{bracket}.csv" for bracket in config["brackets"]],
    ]
    missing = [name for name in required if not (source / name).is_file()]
    if missing:
        raise FileNotFoundError(f"Missing frontend exports: {', '.join(missing)}")

    metadata = metadata if metadata is not None else load_metadata(source)
    details_path = source / "details.json"
    managers = []
    if details_path.exists():
        entries = json.loads(details_path.read_text())["league_entries"]
        participant_count = len(entries)
        managers = [
            {
                "id": entry["entry_id"],
                "name": entry["player_first_name"],
                "fullName": f"{entry['player_first_name']} {entry['player_last_name']}",
                "teamName": entry["entry_name"],
            }
            for entry in entries
        ]
    else:
        with (source / "standings_ts.csv").open() as handle:
            participant_count = len({row["name"] for row in csv.DictReader(handle)})
    frontend_config = {
        **metadata,
        "leagueCode": config["league_code"],
        "currency": config.get("currency", "USD"),
        "entryFee": config.get("entry_fee", 0),
        "participantCount": participant_count,
        "managers": managers,
        "seasonPrizes": config.get("season_prizes", {}),
        "brackets": [
            {"label": f"GW {start}–{end}", "startGw": int(start), "endGw": int(end)}
            for start, end in config["brackets"].values()
        ],
        "prizes": config.get("prizes", {"1": 50, "2": 25}),
    }
    target.mkdir(parents=True, exist_ok=True)
    # Validate all required inputs before publishing; replace individual files atomically.
    with tempfile.TemporaryDirectory(dir=target.parent) as staging:
        staging = Path(staging)
        for name in required:
            shutil.copy2(source / name, staging / name)
        bracket_rows = {}
        for bracket in config["brackets"]:
            with (source / f"results_{bracket}.csv").open() as handle:
                bracket_rows[bracket] = list(csv.DictReader(handle))
        (staging / "brackets.json").write_text(json.dumps(bracket_rows) + "\n")
        with (source / "standings_ts.csv").open() as handle:
            latest_gw = max(
                (int(row["gw"]) for row in csv.DictReader(handle)), default=0
            )
        for gw in range(1, latest_gw + 1):
            path = source / f"blunders_{gw}.csv"
            if path.exists():
                shutil.copy2(path, staging / path.name)
        (staging / "config.json").write_text(
            json.dumps(frontend_config, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        for path in staging.iterdir():
            os.replace(path, target / path.name)
