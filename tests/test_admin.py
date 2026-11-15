from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parents[1] / "drafty"))
from admin_server import AdminHandler, PipelineRunner
from configuration import validate_config
from season_metadata import season_from_bootstrap


def config():
    return {
        "league_code": 25129,
        "brackets": {"1": ["1", "13"], "2": ["14", "38"]},
        "prizes": {"1": 50, "2": 25},
        "currency": "GBP",
    }


class ConfigurationTests(unittest.TestCase):
    def test_valid_variable_brackets_and_currency(self):
        self.assertEqual(validate_config(config())["currency"], "GBP")
        self.assertEqual(len(validate_config(config())["brackets"]), 2)

    def test_updated_prize_pool_balances(self):
        value = validate_config(
            {
                **config(),
                "entry_fee": 175,
                "season_prizes": {"1": 500, "2": 340, "3": 200},
                "prizes": {"1": 60, "2": 30},
                "brackets": {"1": [1, 10], "2": [11, 20], "3": [21, 30], "4": [31, 38]},
            }
        )
        self.assertEqual(value["entry_fee"], 175)
        self.assertEqual(sum(value["season_prizes"].values()), 1040)
        self.assertEqual(sum(value["prizes"].values()) * len(value["brackets"]), 360)
        self.assertEqual(8 * value["entry_fee"], 1040 + 360)

    def test_invalid_ranges_prizes_and_leagues(self):
        cases = [
            {"brackets": {"1": [1, 14], "2": [14, 38]}},
            {"brackets": {"1": [1.5, 13]}},
            {"brackets": {"1": [0, 13]}},
            {"brackets": {"1": [1, 39]}},
            {"prizes": {"1": -10}},
            {"prizes": {"1": float("nan")}},
            {"prizes": {"1": float("inf")}},
            {"league_code": "25129; rm -rf"},
            {"league_code": True},
            {"currency": "invalid"},
            {"entry_fee": -1},
            {"entry_fee": float("nan")},
            {"season_prizes": {"1": -100}},
            {"season_prizes": {"99": 500}},
        ]
        for invalid in cases:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                validate_config({**config(), **invalid})


class SeasonTests(unittest.TestCase):
    def test_season_follows_api_deadline_not_current_date(self):
        result = season_from_bootstrap(
            {
                "events": {
                    "current": 2,
                    "data": [
                        {
                            "id": 38,
                            "deadline_time": "2027-05-20T15:00:00Z",
                            "finished": False,
                        },
                        {
                            "id": 1,
                            "deadline_time": "2026-08-21T17:30:00Z",
                            "finished": True,
                        },
                    ],
                }
            }
        )
        self.assertEqual(result["label"], "2026/2027")
        self.assertEqual(result["lastFinishedGw"], 1)
        self.assertEqual(result["totalGameweeks"], 38)

    def test_invalid_metadata_does_not_invent_a_year(self):
        with self.assertRaises(ValueError):
            season_from_bootstrap({})


class AdminTests(unittest.TestCase):
    def test_host_and_cross_origin_writes_are_rejected(self):
        handler = object.__new__(AdminHandler)
        handler.server = MagicMock(server_port=8001)
        handler.path = "/admin-api/run"
        handler.reply = MagicMock()
        for headers in [
            {"Host": "evil.example:8001", "Origin": "http://evil.example:8001"},
            {"Host": "127.0.0.1:8001", "Origin": "https://evil.example"},
            {"Host": "127.0.0.1:8001"},
        ]:
            handler.headers = headers
            handler.do_POST()
            self.assertEqual(handler.reply.call_args.args[0], 403)

    def test_bad_config_never_starts_a_process(self):
        runner = PipelineRunner()
        with patch("admin_server.subprocess.Popen") as process:
            with self.assertRaises(ValueError):
                runner.start({**config(), "league_code": -1}, False)
            process.assert_not_called()

    def test_overlapping_runs_are_rejected(self):
        runner = PipelineRunner()
        runner.state["status"] = "running"
        with self.assertRaises(RuntimeError):
            runner.start(config(), False)

    def test_publish_removes_transfer_files_from_an_old_season(self):
        with tempfile.TemporaryDirectory() as directory:
            root, work = Path(directory) / "root", Path(directory) / "work"
            for folder in ["drafty/data", "public/data", "out/data"]:
                (root / folder).mkdir(parents=True)
                (root / folder / "blunders_30.csv").write_text("old season")
            for folder in ["drafty/data", "public/data"]:
                (work / folder).mkdir(parents=True)
                (work / folder / "blunders_1.csv").write_text("new season")
            (work / "drafty.db").write_text("new database")
            (work / "drafty/config.yaml").write_text("new configuration")
            PipelineRunner(root).publish(work)
            for folder in ["drafty/data", "public/data", "out/data"]:
                self.assertFalse((root / folder / "blunders_30.csv").exists())
                self.assertEqual(
                    (root / folder / "blunders_1.csv").read_text(), "new season"
                )
            self.assertEqual((root / "drafty.db").read_text(), "new database")

    def test_failed_pipeline_preserves_published_data(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "drafty").mkdir()
            (root / "drafty/config.yaml").write_text("original configuration")
            (root / "drafty.db").write_text("original database")
            runner = PipelineRunner(root)
            process = MagicMock()
            process.__enter__.return_value = process
            process.stdout = iter(["API failure\n"])
            process.wait.return_value = 1
            with patch(
                "admin_server.subprocess.Popen", return_value=process
            ), patch.object(runner, "publish") as publish:
                runner.run(config(), True)
                publish.assert_not_called()
            self.assertEqual(runner.snapshot()["status"], "failed")
            self.assertEqual((root / "drafty.db").read_text(), "original database")
            self.assertEqual(
                (root / "drafty/config.yaml").read_text(), "original configuration"
            )


if __name__ == "__main__":
    unittest.main()
