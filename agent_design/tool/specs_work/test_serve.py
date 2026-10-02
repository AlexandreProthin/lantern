import json
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

import serve

QUESTIONS = {"schema_version": 1, "areas": [], "rounds": [],
             "questions": [{"id": "q-a", "kind": "text"}, {"id": "q-b", "kind": "single"}]}
EMPTY = {"schema_version": 1, "revision": 0, "saved_at": None, "answers": {}}


class WorkshopTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.root, self.wiki = base / "specs_work", base / "agent_wiki"
        (self.root / "data").mkdir(parents=True)
        (self.wiki / "specs").mkdir(parents=True)
        for name, doc in (("questions", QUESTIONS), ("answers", EMPTY), ("specs", {"specs": []})):
            (self.root / "data" / f"{name}.json").write_text(json.dumps(doc), encoding="utf-8-sig")
        (self.wiki / "specs" / "a.md").write_bytes(b"# A\n")
        (self.wiki / "specs" / "secret.txt").write_text("nope", encoding="utf-8")
        (base / "outside.md").write_text("outside", encoding="utf-8")
        (self.root / "index.html").write_text("<html></html>", encoding="utf-8")
        self.httpd = serve.make_server(0, self.root, self.wiki)
        self.port = self.httpd.server_port
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.tmp.cleanup()

    def call(self, path, body=None, raw=None):
        data = raw if raw is not None else (None if body is None else json.dumps(body).encode())
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=data,
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, r.read(), r.headers
        except urllib.error.HTTPError as e:
            return e.code, e.read(), e.headers

    def post(self, body):
        status, data, _ = self.call("/api/answers", body)
        return status, json.loads(data)

    def test_state_reads_fresh_with_bom(self):
        status, data, headers = self.call("/api/state")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        doc = json.loads(data)
        self.assertEqual(set(doc), {"questions", "answers", "specs"})
        (self.root / "data" / "specs.json").write_text('{"specs":[{"id":"x"}]}', encoding="utf-8")
        self.assertEqual(json.loads(self.call("/api/state")[1])["specs"]["specs"][0]["id"], "x")

    def test_save_bumps_revision(self):
        answers = {"q-a": {"notes": "hi", "flag": "discuss"},
                   "q-b": {"choice": ["x"], "placement": {"i": "b"}, "order": ["i"], "other": ""}}
        status, doc = self.post({"base_revision": 0, "answers": answers})
        self.assertEqual(status, 200)
        self.assertEqual(doc["revision"], 1)
        self.assertTrue(doc["saved_at"])
        disk = json.loads((self.root / "data" / "answers.json").read_text(encoding="utf-8"))
        self.assertEqual(disk["answers"], answers)
        self.assertEqual(self.post({"base_revision": 1, "answers": {}})[1]["revision"], 2)

    def test_stale_revision_conflicts(self):
        self.post({"base_revision": 0, "answers": {}})
        status, doc = self.post({"base_revision": 0, "answers": {"q-a": {"notes": "x"}}})
        self.assertEqual(status, 409)
        self.assertIn("reload", doc["error"])

    def test_unknown_question_rejected(self):
        status, doc = self.post({"base_revision": 0, "answers": {"q-nope": {}}})
        self.assertEqual(status, 400)
        self.assertIn("q-nope", doc["error"])
        self.assertEqual(json.loads((self.root / "data" / "answers.json").read_text(encoding="utf-8-sig"))["revision"], 0)

    def test_bad_types_rejected(self):
        bad = [{"choice": "a"}, {"choice": [1]}, {"notes": 5}, {"other": None}, {"order": "x"},
               {"placement": {"a": 1}}, {"placement": []}, {"flag": "urgent"}, "text"]
        for answer in bad:
            with self.subTest(answer=answer):
                self.assertEqual(self.post({"base_revision": 0, "answers": {"q-a": answer}})[0], 400)
        self.assertEqual(self.post({"base_revision": "0", "answers": {}})[0], 400)
        self.assertEqual(self.post({"base_revision": 0, "answers": []})[0], 400)
        self.assertEqual(self.call("/api/answers", raw=b"{not json")[0], 400)

    def test_wiki_serves_markdown(self):
        status, data, headers = self.call("/wiki/specs/a.md")
        self.assertEqual((status, data), (200, b"# A\n"))
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(self.call("/wiki/specs/missing.md")[0], 404)

    def test_wiki_traversal_blocked(self):
        for path in ("/wiki/../outside.md", "/wiki/%2e%2e/outside.md", "/wiki/specs/..%2f..%2foutside.md"):
            with self.subTest(path=path):
                self.assertIn(self.call(path)[0], (403, 404))
                self.assertNotIn(b"outside", self.call(path)[1])

    def test_wiki_non_markdown_blocked(self):
        self.assertEqual(self.call("/wiki/specs/secret.txt")[0], 403)

    def test_body_too_large(self):
        big = json.dumps({"base_revision": 0, "answers": {"q-a": {"notes": "x" * (serve.MAX_BODY + 10)}}})
        self.assertEqual(self.call("/api/answers", raw=big.encode())[0], 413)

    def test_static_serves_page_not_server_files(self):
        self.assertEqual(self.call("/index.html")[0], 200)
        (self.root / "serve.py").write_text("x", encoding="utf-8")
        self.assertEqual(self.call("/serve.py")[0], 403)


if __name__ == "__main__":
    unittest.main()
