import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import sys

sys.path.insert(0, str(Path(__file__).parents[1] / "drafty"))

spec = importlib.util.spec_from_file_location(
    "export_frontend", Path(__file__).parents[1] / "drafty/export_frontend.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ExportFrontendTests(unittest.TestCase):
    def test_exports_data_and_numeric_config(self):
        config = {
            "league_code": 25129,
            "brackets": {"1": ["1", "13"]},
            "prizes": {"1": 75},
            "entry_fee": 175,
            "season_prizes": {"1": 500, "2": 340, "3": 200},
        }
        with tempfile.TemporaryDirectory() as root:
            source, target = Path(root) / "source", Path(root) / "public"
            source.mkdir()
            names = [
                "standings_ts.csv",
                "cumm_points.csv",
                "bench_pts.csv",
                "total_bench_pts.csv",
                "top_df.csv",
                "bottom_df.csv",
                "results_1.csv",
                "blunders_1.csv",
            ]
            for name in names:
                (source / name).write_text("name,points\nExample,12\n")
            (source / "standings_ts.csv").write_text("name,gw,pos\nExample,1,1\n")
            (source / "blunders_38.csv").write_text("stale season data")
            (source / "details.json").write_text(
                json.dumps(
                    {
                        "league_entries": [
                            {
                                "entry_id": 1,
                                "player_first_name": "Example",
                                "player_last_name": "Manager",
                                "entry_name": "Example FC",
                            }
                        ]
                    }
                )
            )
            module.export_frontend(
                config, source, target, metadata={"season": {"label": "2026/2027"}}
            )
            self.assertEqual(
                (target / "blunders_1.csv").read_text(),
                (source / "blunders_1.csv").read_text(),
            )
            exported = json.loads((target / "config.json").read_text())
            self.assertEqual(exported["brackets"][0]["endGw"], 13)
            self.assertEqual(exported["prizes"]["1"], 75)
            self.assertEqual(exported["entryFee"], 175)
            self.assertEqual(exported["seasonPrizes"], {"1": 500, "2": 340, "3": 200})
            self.assertEqual(exported["participantCount"], 1)
            self.assertEqual(
                exported["managers"][0],
                {
                    "id": 1,
                    "name": "Example",
                    "fullName": "Example Manager",
                    "teamName": "Example FC",
                },
            )
            self.assertEqual(len(list(target.iterdir())), len(names) + 2)
            self.assertFalse((target / "blunders_38.csv").exists())

    def test_missing_input_preserves_published_data(self):
        with tempfile.TemporaryDirectory() as root:
            source, target = Path(root) / "source", Path(root) / "public"
            source.mkdir()
            target.mkdir()
            (target / "config.json").write_text("original")
            with self.assertRaises(FileNotFoundError):
                module.export_frontend({"brackets": {"1": [1, 13]}}, source, target)
            self.assertEqual((target / "config.json").read_text(), "original")


if __name__ == "__main__":
    unittest.main()
