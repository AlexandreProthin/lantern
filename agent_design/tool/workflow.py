"""Local design exploration: Python standard library only (3.10+)."""
import argparse
import sys
import copy
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import tempfile
from urllib.parse import urlsplit
import webbrowser

ROOT = Path(__file__).resolve().parent.parent
TAGS = dict(wireframe="wir", form="frm", type="typ", color="col", motion="mot", draft="drf")
SLUG = re.compile(r"[a-z][a-z0-9-]{0,59}\Z")


class Conflict(ValueError):
    pass


def now():
    return datetime.now(timezone.utc).isoformat()


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write(path, data):
    """Replace complete JSON atomically; never leave a partially saved request."""
    fd, name = tempfile.mkstemp(prefix=".save-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(data, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def concept_dir(root, slug):
    if not isinstance(slug, str) or not SLUG.fullmatch(slug) or slug == "tool":
        raise ValueError("Use a lowercase component name with letters, digits and hyphens; 'tool' is reserved.")
    path = root / slug
    if path.resolve().parent != root.resolve() or path.is_symlink():
        raise ValueError("Component must be a direct folder inside design/.")
    return path


def inside(folder, relative):
    if not isinstance(relative, str) or not relative or "\\" in relative:
        raise ValueError("Use a relative path with forward slashes.")
    path = (folder / relative).resolve()
    if not path.is_relative_to(folder.resolve()):
        raise ValueError("Path leaves the component folder.")
    return path


def initialize(root, slug, phase="wireframe", prompt=""):
    folder = concept_dir(root, slug)
    if phase not in TAGS:
        raise ValueError("Unknown phase.")
    if not isinstance(prompt, str) or len(prompt) > 20000:
        raise ValueError("Prompt must be text, at most 20,000 characters.")
    folder.mkdir()  # Never overwrite an existing component.
    write(folder / "lineage.json", {"schema_version": 1, "concept": slug, "rounds": [], "nodes": []})
    write(folder / "selections.json", {
        "schema_version": 1, "concept": slug, "revision": 1, "saved_at": now(),
        "based_on_round": 0, "selected_ids": [],
        "next": {"phase": phase, "mode": "combine", "prompt": prompt},
    })
    (folder / "index.html").write_text(PAGE, encoding="utf-8")
    return state(root, slug)


def validate_request(selection, ledger):
    if not isinstance(selection, dict):
        raise ValueError("Expected a JSON object.")
    ids = selection.get("selected_ids")
    known = {node["id"] for node in ledger["nodes"]}
    if not isinstance(ids, list) or any(not isinstance(i, str) for i in ids):
        raise ValueError("selected_ids must be a list of IDs.")
    if len(ids) != len(set(ids)) or any(i not in known for i in ids):
        raise ValueError("Select existing designs, without duplicate IDs.")
    nxt = selection.get("next")
    if not isinstance(nxt, dict) or nxt.get("phase") not in TAGS or nxt.get("mode") not in ("combine", "branch", "fresh"):
        raise ValueError("Choose a valid phase and continuation mode.")
    if not isinstance(nxt.get("prompt"), str) or len(nxt["prompt"]) > 20000:
        raise ValueError("Prompt must be text, at most 20,000 characters.")
    if nxt["mode"] == "fresh" and ids:
        raise ValueError("Clear selections to start a fresh direction.")
    if known and not ids and nxt["mode"] != "fresh":
        raise ValueError("Select at least one design, or choose Fresh start.")


def state(root, slug):
    folder = concept_dir(root, slug)
    ledger = read(folder / "lineage.json")
    selection = read(folder / "selections.json")
    consumed = any(r["request"]["revision"] == selection["revision"] for r in ledger["rounds"])
    return {"lineage": ledger, "selection": selection, "pending": not consumed}


def save_selection(root, slug, payload):
    current = state(root, slug)
    ledger, old = current["lineage"], current["selection"]
    latest = ledger["rounds"][-1]["number"] if ledger["rounds"] else 0
    if payload.get("revision") != old["revision"] or payload.get("based_on_round") != latest:
        raise Conflict("This page is out of date. Reload before saving; your choices have not been overwritten.")
    validate_request(payload, ledger)
    saved = {"schema_version": 1, "concept": slug, "revision": old["revision"] + 1,
             "saved_at": now(), "based_on_round": latest,
             "selected_ids": payload["selected_ids"], "next": payload["next"]}
    write(concept_dir(root, slug) / "selections.json", saved)
    return saved


def context(root, slug):
    current = state(root, slug)
    ledger, selection = current["lineage"], current["selection"]
    if not current["pending"]:
        raise Conflict("This saved request already has a round. Pick, enter feedback and save a new request first.")
    validate_request(selection, ledger)
    number = len(ledger["rounds"]) + 1
    phase = selection["next"]["phase"]
    groups = [[i] for i in selection["selected_ids"]] if selection["next"]["mode"] == "branch" else [selection["selected_ids"]]
    groups = groups or [[]]
    proposals = []
    for parents in groups:
        for _ in range(3):
            ident = f"r{number:03d}-{len(proposals) + 1:02d}"
            proposals.append({"id": ident, "parents": parents,
                              "file": f"{phase}/{slug}-{TAGS[phase]}-{ident}.html",
                              "title": "", "direction": ""})
    return {"request": selection,
            "parents": [n for n in ledger["nodes"] if n["id"] in selection["selected_ids"]],
            "publish_template": {"selection_revision": selection["revision"], "proposals": proposals}}


def publish(root, slug, spec):
    folder = concept_dir(root, slug)
    ctx = context(root, slug)
    selection = ctx["request"]
    if spec.get("selection_revision") != selection["revision"]:
        raise Conflict("The user saved a newer request. Read context again before publishing.")
    expected = ctx["publish_template"]["proposals"]
    if spec.get("single") is True:
        # The user's saved prompt asked for one proposal only: publish the template's first entry alone.
        if selection["next"]["mode"] == "branch":
            raise ValueError("A single proposal is only possible in combine or fresh mode.")
        expected = expected[:1]
    proposals = spec.get("proposals")
    if not isinstance(proposals, list) or len(proposals) != len(expected):
        raise ValueError(f"This request needs exactly {len(expected)} proposal{'s' if len(expected) != 1 else ''}.")
    phase = selection["next"]["phase"]
    nodes = []
    for actual, planned in zip(proposals, expected):
        if not isinstance(actual, dict) or any(actual.get(k) != planned[k] for k in ("id", "parents", "file")):
            raise ValueError("Proposal IDs, parents and files must match the context template, in order.")
        for key in ("title", "direction"):
            if not isinstance(actual.get(key), str) or not actual[key].strip():
                raise ValueError(f"Every proposal needs a {key}.")
        path = inside(folder, actual["file"])
        if not path.is_file() or "<html" not in path.read_text(encoding="utf-8-sig").lower():
            raise ValueError(f"Missing HTML experiment: {actual['file']}")
        nodes.append({**planned, "title": actual["title"], "direction": actual["direction"],
                      "phase": phase, "tag": TAGS[phase]})
    ledger = read(folder / "lineage.json")
    ledger["rounds"].append({"number": len(ledger["rounds"]) + 1, "created_at": now(),
                              "request": copy.deepcopy(selection), "node_ids": [n["id"] for n in nodes]})
    ledger["nodes"].extend(nodes)
    # The request snapshot and nodes commit together; selections remain user-owned.
    write(folder / "lineage.json", ledger)
    return ledger["rounds"][-1]


def amend(root, slug, spec):
    """Append one proposal to the latest round, on the user's explicit request (e.g. "make r006-02, r006-01 untouched").
    Earlier nodes and the round's request snapshot are kept; the round records when and why it was amended."""
    folder = concept_dir(root, slug)
    ledger = read(folder / "lineage.json")
    if not ledger["rounds"]:
        raise ValueError("There is no round to amend.")
    last = ledger["rounds"][-1]
    note = spec.get("note")
    if not isinstance(note, str) or not note.strip():
        raise ValueError("An amendment needs a note quoting the user's request.")
    request = last["request"]
    if request["next"]["mode"] == "branch":
        raise ValueError("Branch rounds cannot be amended.")
    actual = spec.get("proposal") or {}
    phase = request["next"]["phase"]
    ident = f"r{last['number']:03d}-{len(last['node_ids']) + 1:02d}"
    planned = {"id": ident, "parents": request["selected_ids"], "file": f"{phase}/{slug}-{TAGS[phase]}-{ident}.html"}
    if any(actual.get(k) != planned[k] for k in planned):
        raise ValueError(f"The amendment must be {ident} with the round's parents and file {planned['file']}.")
    for key in ("title", "direction"):
        if not isinstance(actual.get(key), str) or not actual[key].strip():
            raise ValueError(f"The proposal needs a {key}.")
    path = inside(folder, planned["file"])
    if not path.is_file() or "<html" not in path.read_text(encoding="utf-8-sig").lower():
        raise ValueError(f"Missing HTML experiment: {planned['file']}")
    ledger["nodes"].append({**planned, "title": actual["title"], "direction": actual["direction"], "phase": phase, "tag": TAGS[phase]})
    last["node_ids"].append(ident)
    last.setdefault("amendments", []).append({"at": now(), "node_id": ident, "note": note.strip()})
    write(folder / "lineage.json", ledger)
    return last


PAGE = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Design exploration</title><link rel="stylesheet" href="../tool/gallery.css">
<script src="../tool/gallery.js" defer></script></head><body><div id="app"></div></body></html>
'''


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, root=ROOT, **kwargs):
        self.root = root.resolve()
        super().__init__(*args, directory=str(self.root), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def local_host(self):
        return self.headers.get("Host") in (f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}")

    def do_GET(self):
        if not self.local_host():
            return self.json_response({"error": "Invalid host."}, 403)
        route = urlsplit(self.path).path
        try:
            if route == "/api/components":
                items = []
                for folder in sorted(self.root.iterdir()):
                    if folder.is_dir() and folder.name != "tool" and (folder / "lineage.json").is_file():
                        s = state(self.root, folder.name)
                        items.append({"slug": folder.name, "rounds": len(s["lineage"]["rounds"]), "pending": s["pending"]})
                return self.json_response(items)
            match = re.fullmatch(r"/api/([a-z][a-z0-9-]*)", route)
            if match:
                return self.json_response(state(self.root, match[1]))
            # SimpleHTTPRequestHandler otherwise follows symlinks outside its root.
            target = Path(self.translate_path(self.path)).resolve()
            if not target.is_relative_to(self.root) or any(p.startswith(".") for p in target.relative_to(self.root).parts):
                return self.json_response({"error": "Path not served."}, 403)
            super().do_GET()
        except (ValueError, OSError) as exc:
            self.json_response({"error": str(exc)}, 400)

    def do_POST(self):
        if not self.local_host() or self.headers.get("Origin") != f"http://{self.headers.get('Host')}":
            return self.json_response({"error": "Save from the local gallery tab."}, 403)
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            return self.json_response({"error": "Expected application/json."}, 415)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 100000:
                raise ValueError("Invalid request size.")
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("Expected a JSON object.")
            # CLI publication and browser saves share the same process lock.
            with project_lock(self.root):
                if self.path == "/api/components":
                    result = initialize(self.root, payload.get("slug"), payload.get("phase", "wireframe"), payload.get("prompt", ""))
                else:
                    match = re.fullmatch(r"/api/([a-z][a-z0-9-]*)/selections", self.path)
                    if not match:
                        return self.json_response({"error": "Unknown endpoint."}, 404)
                    result = save_selection(self.root, match[1], payload)
            self.json_response(result)
        except Conflict as exc:
            self.json_response({"error": str(exc)}, 409)
        except (ValueError, OSError) as exc:
            self.json_response({"error": str(exc)}, 400)


class project_lock:
    """Short cross-process lock for CLI and browser mutations; no dependencies."""
    def __init__(self, root):
        self.path = root / "tool" / ".workflow.lock"

    def __enter__(self):
        try:
            self.fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            raise Conflict("Another save is in progress. Retry shortly. If a process crashed, see tool/README.md.")
        os.write(self.fd, str(os.getpid()).encode())

    def __exit__(self, *args):
        os.close(self.fd)
        self.path.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    server = sub.add_parser("serve")
    server.add_argument("--port", type=int, default=8765)
    server.add_argument("--no-open", action="store_true")
    init = sub.add_parser("init")
    init.add_argument("concept")
    init.add_argument("--phase", choices=TAGS, default="wireframe")
    init.add_argument("--prompt", default="")
    ctx = sub.add_parser("context")
    ctx.add_argument("concept")
    pub = sub.add_parser("publish")
    pub.add_argument("concept")
    pub.add_argument("spec", type=Path)
    amd = sub.add_parser("amend", help="append one proposal to the latest round, on the user's request")
    amd.add_argument("concept")
    amd.add_argument("spec", type=Path)
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")   # prompts and directions may hold any character (e.g. ≠)
    try:
        if args.command == "serve":
            with ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, root=ROOT)) as httpd:
                url = f"http://127.0.0.1:{httpd.server_port}/index.html"
                print(f"Design workspace: {url}\nCtrl+C to stop.", flush=True)
                if not args.no_open:
                    webbrowser.open(url)
                try:
                    httpd.serve_forever()
                except KeyboardInterrupt:
                    pass
            return
        with project_lock(ROOT):
            if args.command == "init":
                result = initialize(ROOT, args.concept, args.phase, args.prompt)
            elif args.command == "context":
                result = context(ROOT, args.concept)
            elif args.command == "amend":
                result = amend(ROOT, args.concept, read(args.spec))
            else:
                result = publish(ROOT, args.concept, read(args.spec))
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, OSError) as exc:
        parser.exit(1, f"Error: {exc}\n")


if __name__ == "__main__":
    main()
