"""Build journey evidence only from lineups that reconcile to official scores."""

import csv
import json
from pathlib import Path


def build_journey_facts(source):
    source = Path(source)
    needed = ["details.json", "bootstrap-static.json", "gw_live.csv", "joined.csv"]
    if not all((source / name).exists() for name in needed):
        return {"version": 1, "performances": []}
    entries = {
        int(e["entry_id"]): e
        for e in json.loads((source / "details.json").read_text())["league_entries"]
    }
    players = {
        int(p["id"]): p["web_name"]
        for p in json.loads((source / "bootstrap-static.json").read_text())["elements"]
    }
    with (source / "gw_live.csv").open() as handle:
        live = {(int(r["gw"]), int(r["id"])): r for r in csv.DictReader(handle)}
    transaction_path = source / "transactions.json"
    transactions = (
        json.loads(transaction_path.read_text()).get("transactions", [])
        if transaction_path.exists()
        else []
    )
    with (source / "joined.csv").open() as handle:
        scores = list(csv.DictReader(handle))
    performances = []
    for row in scores:
        team, gw, points = int(row["team_id"]), int(row["gw"]), int(row["points"])
        path = source / f"team_{team}/{gw}_event.json"
        if team not in entries or not path.exists():
            continue
        lineup = json.loads(path.read_text())
        active = {
            int(p["element"]) for p in lineup["picks"] if int(p["position"]) <= 11
        }
        for sub in lineup.get("subs", []):
            active.discard(int(sub["element_out"]))
            active.add(int(sub["element_in"]))
        if len(active) != 11 or any(
            (gw, element) not in live or element not in players for element in active
        ):
            continue
        contributors = []
        for element in active:
            stats = live[(gw, element)]
            contributors.append(
                {
                    "id": element,
                    "name": players[element],
                    "points": int(stats["total_points"]),
                    "goals": int(stats.get("goals_scored", 0)),
                    "assists": int(stats.get("assists", 0)),
                }
            )
        if sum(p["points"] for p in contributors) != points:
            continue
        moves = []
        for move in transactions:
            if (
                move.get("result") != "a"
                or int(move["entry"]) != team
                or int(move["event"]) != gw - 1
            ):
                continue
            incoming, outgoing = int(move["element_in"]), int(move["element_out"])
            if (
                incoming not in active
                or (gw, outgoing) not in live
                or outgoing not in players
            ):
                continue
            in_pts, out_pts = int(live[(gw, incoming)]["total_points"]), int(
                live[(gw, outgoing)]["total_points"]
            )
            moves.append(
                {
                    "playerIn": players[incoming],
                    "playerOut": players[outgoing],
                    "playerInPts": in_pts,
                    "playerOutPts": out_pts,
                    "netPts": in_pts - out_pts,
                    "transactionGw": gw - 1,
                }
            )
        entry = entries[team]
        performances.append(
            {
                "managerId": team,
                "name": entry["player_first_name"],
                "teamName": entry["entry_name"],
                "gw": gw,
                "points": points,
                "players": sorted(
                    contributors, key=lambda p: (-p["points"], p["name"])
                ),
                "transfers": sorted(moves, key=lambda m: -m["netPts"]),
            }
        )
    return {
        "version": 1,
        "performances": sorted(performances, key=lambda p: (p["gw"], p["managerId"])),
    }
