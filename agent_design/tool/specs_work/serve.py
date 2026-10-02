"""Lantern spec workshop: local server, Python standard library only (3.10+).

Serves the workshop page, a fresh-from-disk state API, a revision-checked answer
save, and a read-only view of agent_wiki/*.md. Saving never calls an AI.
"""
import argparse
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import tempfile
import threading
from urllib.parse import unquote, urlsplit
import webbrowser

HERE = Path(__file__).resolve().parent
WIKI = HERE.parent.parent.parent / "agent_wiki"
MAX_BODY = 1024 * 1024
LOCK = threading.Lock()
STATIC_BLOCKED = {"serve.py", "test_serve.py", "README.md"}


class Conflict(ValueError):
    pass


def now():
    return datetime.now(timezone.utc).isoformat()


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write(path, data):
    """Replace the whole JSON file atomically; never leave a partial save."""
    fd, name = tempfile.mkstemp(prefix=".save-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(data, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def state(root):
    data = root / "data"
    return {name: read(data / f"{name}.json") for name in ("questions", "answers", "specs")}


def is_str_list(value):
    return isinstance(value, list) and all(isinstance(v, str) for v in value)


def validate_answer(qid, a):
    if not isinstance(a, dict):
        raise ValueError(f"Answer for {qid} must be an object.")
    for key in ("other", "notes", "updated_at"):
        if key in a and not isinstance(a[key], str):
            raise ValueError(f"{qid}.{key} must be a string.")
    for key in ("choice", "order"):
        if key in a and not is_str_list(a[key]):
            raise ValueError(f"{qid}.{key} must be a list of strings.")
    if "placement" in a:
        p = a["placement"]
        if not isinstance(p, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in p.items()):
            raise ValueError(f"{qid}.placement must map item ids to bucket ids.")
    if a.get("flag") not in (None, "discuss"):
        raise ValueError(f'{qid}.flag must be null or "discuss".')


def save_answers(root, payload):
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object.")
    base, answers = payload.get("base_revision"), payload.get("answers")
    if not isinstance(base, int) or isinstance(base, bool):
        raise ValueError("base_revision must be an integer.")
    if not isinstance(answers, dict):
        raise ValueError("answers must be an object keyed by question id.")
    path = root / "data" / "answers.json"
    with LOCK:  # read-check-write is one step
        current = read(path)
        if base != current.get("revision"):
            raise Conflict("answers.json changed since you loaded it; reload")
        known = {q["id"] for q in read(root / "data" / "questions.json")["questions"]}
        for qid, a in answers.items():
            if qid not in known:
                raise ValueError(f"Unknown question id: {qid}")
            validate_answer(qid, a)
        saved = {"schema_version": 1, "revision": base + 1, "saved_at": now(), "answers": answers}
        write(path, saved)
    return saved


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, root=HERE, wiki=WIKI, **kwargs):
        self.root, self.wiki = root.resolve(), wiki
        super().__init__(*args, directory=str(self.root), **kwargs)

    def end_headers(self):
        route = urlsplit(self.path).path
        if route.startswith(("/api/", "/wiki/")):
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

    def wiki_response(self, rel):
        base = self.wiki.resolve()
        rel = unquote(rel)
        if not rel.lower().endswith(".md") or "\x00" in rel:
            return self.json_response({"error": "Only .md files are served."}, 403)
        target = (base / rel).resolve()
        if not target.is_relative_to(base):
            return self.json_response({"error": "Path leaves agent_wiki."}, 403)
        if not target.is_file():
            return self.json_response({"error": "Not written yet."}, 404)
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/markdown; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        route = urlsplit(self.path).path
        try:
            if route == "/api/state":
                return self.json_response(state(self.root))
            if route.startswith("/wiki/"):
                return self.wiki_response(route[len("/wiki/"):])
            if route.startswith("/api/"):
                return self.json_response({"error": "Unknown endpoint."}, 404)
            target = Path(self.translate_path(self.path)).resolve()
            if target.is_dir():
                target = target / "index.html"
            if (not target.is_relative_to(self.root) or target.name in STATIC_BLOCKED
                    or any(p.startswith(".") or p == "__pycache__" for p in target.relative_to(self.root).parts)):
                return self.json_response({"error": "Path not served."}, 403)
            super().do_GET()
        except (ValueError, OSError) as exc:
            self.json_response({"error": f"Could not read workshop data: {exc}"}, 500)

    def do_POST(self):
        if urlsplit(self.path).path != "/api/answers":
            return self.json_response({"error": "Unknown endpoint."}, 404)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > MAX_BODY:
                # Drain a moderately oversized body so the client reads the 413 instead of a
                # reset connection (Windows aborts sockets closed with unread data).
                if length <= 16 * MAX_BODY:
                    while length > 0:
                        length -= len(self.rfile.read(min(length, 65536))) or length
                self.close_connection = True
                return self.json_response({"error": "Request body too large (limit 1 MB)."}, 413)
            if length <= 0:
                raise ValueError("Empty request body.")
            payload = json.loads(self.rfile.read(length))
            self.json_response(save_answers(self.root, payload))
        except Conflict as exc:
            self.json_response({"error": str(exc)}, 409)
        except (ValueError, OSError) as exc:
            self.json_response({"error": str(exc)}, 400)


def make_server(port=8770, root=HERE, wiki=WIKI):
    return ThreadingHTTPServer(("127.0.0.1", port), partial(Handler, root=root, wiki=wiki))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8770)
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()
    with make_server(args.port) as httpd:
        url = f"http://127.0.0.1:{httpd.server_port}/index.html"
        print(f"Spec workshop: {url}\nCtrl+C to stop.", flush=True)
        if not args.no_open:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
