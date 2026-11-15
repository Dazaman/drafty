"""Local-only configuration and pipeline runner; serves the built static app."""

import argparse
from collections import deque
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
from urllib.parse import urlsplit
import uuid

import yaml
from configuration import validate_config

ROOT = Path(__file__).resolve().parents[1]


class PipelineRunner:
    def __init__(self, root=ROOT):
        self.root = Path(root)
        self.lock = threading.Lock()
        self.state = {"status": "idle", "logs": [], "message": "Ready to run"}

    def snapshot(self):
        with self.lock:
            return {**self.state, "logs": list(self.state["logs"])}

    def start(self, config, refresh):
        config = validate_config(config)
        if type(refresh) is not bool:
            raise ValueError("Refresh must be true or false")
        with self.lock:
            if self.state["status"] == "running":
                raise RuntimeError("A pipeline run is already in progress")
            self.state = {
                "id": uuid.uuid4().hex,
                "status": "running",
                "logs": deque(maxlen=200),
                "message": (
                    "Fetching fresh API data"
                    if refresh
                    else "Recalculating cached scores"
                ),
            }
        threading.Thread(target=self.run, args=(config, refresh), daemon=True).start()
        return self.snapshot()

    def run(self, config, refresh):
        try:
            with tempfile.TemporaryDirectory(prefix="drafty-run-") as directory:
                work = Path(directory)
                shutil.copytree(
                    self.root / "drafty",
                    work / "drafty",
                    ignore=shutil.ignore_patterns(
                        "data", "__pycache__", "*.db", "*.log"
                    ),
                )
                (work / "drafty/config.yaml").write_text(
                    yaml.safe_dump(config, sort_keys=False)
                )
                (work / "drafty/data/gw").mkdir(parents=True)
                if not refresh:
                    if not (self.root / "drafty.db").exists():
                        raise ValueError(
                            "No cached database exists. Choose Refresh from FPL API."
                        )
                    shutil.copy2(self.root / "drafty.db", work / "drafty.db")
                    shutil.copytree(
                        self.root / "drafty/data",
                        work / "drafty/data",
                        dirs_exist_ok=True,
                    )
                    previous = yaml.safe_load(
                        (self.root / "drafty/config.yaml").read_text()
                    )
                    if int(previous["league_code"]) != config["league_code"]:
                        raise ValueError(
                            "Changing league ID requires Refresh from FPL API."
                        )
                command = [sys.executable, "-u", "drafty/data_pipeline.py"]
                if refresh:
                    command.append("--refresh")
                with subprocess.Popen(
                    command,
                    cwd=work,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                ) as process:
                    for line in process.stdout:
                        with self.lock:
                            self.state["logs"].append(line.rstrip()[-2000:])
                    if process.wait() != 0:
                        raise RuntimeError(
                            "Pipeline failed. Published scores and configuration were preserved. See the log below."
                        )
                # Only a successful pipeline may publish its configuration and score files.
                self.publish(work)
            with self.lock:
                self.state.update(
                    status="succeeded",
                    message="Configuration saved and scores updated",
                    completedAt=datetime.now(timezone.utc).isoformat(),
                )
        except Exception as error:
            with self.lock:
                self.state.update(status="failed", message=str(error))

    def publish(self, work):
        files = [
            (work / "drafty.db", self.root / "drafty.db"),
            (work / "drafty/config.yaml", self.root / "drafty/config.yaml"),
        ]
        for folder in ["drafty/data", "public/data"]:
            files.extend(
                (path, self.root / path.relative_to(work))
                for path in (work / folder).rglob("*")
                if path.is_file()
            )
        if (self.root / "out").exists():
            files.extend(
                (path, self.root / "out/data" / path.name)
                for path in (work / "public/data").iterdir()
                if path.is_file()
            )
        for source, destination in files:
            destination.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                dir=destination.parent, delete=False
            ) as staging:
                temporary = Path(staging.name)
            try:
                shutil.copy2(source, temporary)
                os.replace(temporary, destination)
            finally:
                temporary.unlink(missing_ok=True)

        for folder in ["drafty/data", "public/data", "out/data"]:
            destination = self.root / folder
            expected = {
                path.name for path in (work / "public/data").glob("blunders_*.csv")
            }
            for path in destination.glob("blunders_*.csv"):
                if path.name not in expected:
                    path.unlink()


class AdminHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, root=ROOT, runner=None, **kwargs):
        self.root = Path(root)
        self.runner = runner
        super().__init__(*args, directory=str(self.root / "out"), **kwargs)

    def trusted_host(self):
        return self.headers.get("Host") in {
            f"127.0.0.1:{self.server.server_port}",
            f"localhost:{self.server.server_port}",
        }

    def reply(self, status, value):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self.trusted_host():
            return self.reply(403, {"error": "Untrusted host"})
        path = urlsplit(self.path).path.rstrip("/")
        if path == "/admin-api/config":
            config = validate_config(
                yaml.safe_load((self.root / "drafty/config.yaml").read_text())
            )
            metadata = json.loads((self.root / "public/data/config.json").read_text())
            return self.reply(200, {"config": config, "metadata": metadata})
        if path == "/admin-api/status":
            return self.reply(200, self.runner.snapshot())
        if path.startswith("/admin-api"):
            return self.reply(404, {"error": "Unknown admin endpoint"})
        super().do_GET()

    def do_POST(self):
        origin = self.headers.get("Origin")
        if not self.trusted_host() or origin != f"http://{self.headers.get('Host')}":
            return self.reply(
                403,
                {"error": "Admin changes require a same-origin local browser session"},
            )
        if urlsplit(self.path).path.rstrip("/") != "/admin-api/run":
            return self.reply(404, {"error": "Unknown admin endpoint"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if (
                not 0 < length <= 16384
                or self.headers.get("Content-Type", "").split(";")[0]
                != "application/json"
            ):
                raise ValueError("Send a JSON configuration under 16 KB")
            request = json.loads(self.rfile.read(length))
            if not isinstance(request, dict):
                raise ValueError("Request must be an object")
            result = self.runner.start(
                request.get("config"), request.get("refresh", False)
            )
            self.reply(202, result)
        except (ValueError, TypeError) as error:
            self.reply(400, {"error": str(error)})
        except RuntimeError as error:
            self.reply(409, {"error": str(error)})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument(
        "--refresh-once",
        action="store_true",
        help="Run a staged API refresh without starting the web service",
    )
    args = parser.parse_args()
    if args.refresh_once:
        config = validate_config(
            yaml.safe_load((ROOT / "drafty/config.yaml").read_text())
        )
        runner = PipelineRunner()
        runner.run(config, True)
        result = runner.snapshot()
        print("\n".join(result["logs"]))
        print(result["message"])
        raise SystemExit(0 if result["status"] == "succeeded" else 1)
    if not (ROOT / "out/admin/index.html").exists():
        raise SystemExit("Build the admin UI first: npm run build")
    runner = PipelineRunner()
    handler = partial(AdminHandler, root=ROOT, runner=runner)
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Drafty admin: http://127.0.0.1:{args.port}/admin/", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
