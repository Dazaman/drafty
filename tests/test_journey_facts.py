import csv
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).parents[1] / "drafty"))
from journey_facts import build_journey_facts


class JourneyFactsTests(unittest.TestCase):
    def fixture(self, root):
        (root / "details.json").write_text(
            json.dumps(
                {
                    "league_entries": [
                        {
                            "entry_id": 1,
                            "player_first_name": "Alex",
                            "entry_name": "Alex FC",
                        }
                    ]
                }
            )
        )
        (root / "bootstrap-static.json").write_text(
            json.dumps(
                {
                    "elements": [
                        {"id": i, "web_name": f"Player {i}"} for i in range(1, 14)
                    ]
                }
            )
        )
        (root / "team_1").mkdir()
        lineup = {
            "picks": [{"element": i, "position": i} for i in range(1, 14)],
            "subs": [{"element_in": 12, "element_out": 1}],
        }
        (root / "team_1/2_event.json").write_text(json.dumps(lineup))
        with (root / "gw_live.csv").open("w") as handle:
            writer = csv.DictWriter(handle, fieldnames=["gw", "id", "total_points"])
            writer.writeheader()
            writer.writerows(
                {
                    "gw": 2,
                    "id": i,
                    "total_points": 100 if i == 13 else 12 if i == 12 else 2,
                }
                for i in range(1, 14)
            )
        (root / "joined.csv").write_text("team_id,gw,points\n1,2,32\n")
        (root / "transactions.json").write_text(
            json.dumps(
                {
                    "transactions": [
                        {
                            "entry": 1,
                            "event": 1,
                            "result": "a",
                            "element_in": 12,
                            "element_out": 1,
                        },
                        {
                            "entry": 1,
                            "event": 1,
                            "result": "a",
                            "element_in": 13,
                            "element_out": 2,
                        },
                        {
                            "entry": 1,
                            "event": 1,
                            "result": "r",
                            "element_in": 3,
                            "element_out": 1,
                        },
                    ]
                }
            )
        )

    def test_scoring_xi_includes_subs_excludes_bench_and_unplayed_transfers(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root)
            result = build_journey_facts(root)["performances"][0]
            self.assertEqual(sum(p["points"] for p in result["players"]), 32)
            self.assertEqual({p["id"] for p in result["players"]}, set(range(2, 13)))
            self.assertEqual(len(result["transfers"]), 1)
            self.assertEqual(result["transfers"][0]["netPts"], 10)

    def test_unreconciled_or_missing_lineups_are_not_used_as_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root)
            (root / "joined.csv").write_text("team_id,gw,points\n1,2,99\n1,3,42\n")
            self.assertEqual(build_journey_facts(root)["performances"], [])

    def test_missing_optional_data_returns_empty_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(build_journey_facts(directory)["performances"], [])
