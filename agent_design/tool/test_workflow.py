"""Exercise the persistent round workflow with isolated design directories."""
import copy
from functools import partial
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import workflow as w


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "tool").mkdir()
        w.initialize(self.root, "panel", prompt="Three navigation mechanisms")

    def prepare(self):
        spec = w.context(self.root, "panel")["publish_template"]
        for node in spec["proposals"]:
            node.update(title=f"Idea {node['id']}", direction="A distinct navigation mechanism")
            path = self.root / "panel" / node["file"]
            path.parent.mkdir(exist_ok=True)
            path.write_text("<!doctype html><html><title>Test</title><body>Proposal</body></html>", encoding="utf-8")
        return spec

    def save(self, ids, mode="combine", phase="draft", prompt="Keep the map; simplify the inspector"):
        state = w.state(self.root, "panel")
        payload = copy.deepcopy(state["selection"])
        payload.update(based_on_round=len(state["lineage"]["rounds"]), selected_ids=ids,
                       next={"phase": phase, "mode": mode, "prompt": prompt})
        return w.save_selection(self.root, "panel", payload)

    def test_initial_scaffold_and_three_proposals(self):
        self.assertTrue((self.root / "panel/index.html").is_file())
        self.assertEqual(len(w.context(self.root, "panel")["publish_template"]["proposals"]), 3)
        with self.assertRaises(FileExistsError):
            w.initialize(self.root, "panel")

    def test_multiselect_save_publish_preserves_old_files_and_requests(self):
        first = self.prepare()
        w.publish(self.root, "panel", first)
        old = w.read(self.root / "panel/lineage.json")
        original_files = {n["file"]: (self.root / "panel" / n["file"]).read_bytes() for n in old["nodes"]}
        saved = self.save(["r001-01", "r001-03"], prompt="Café — combine both\nKeep navigation")
        second = self.prepare()
        self.assertEqual(second["proposals"][0]["parents"], ["r001-01", "r001-03"])
        w.publish(self.root, "panel", second)
        new = w.read(self.root / "panel/lineage.json")
        self.assertEqual(new["rounds"][0], old["rounds"][0])
        self.assertEqual(new["nodes"][:3], old["nodes"])
        self.assertEqual(new["rounds"][1]["request"], saved)
        self.assertEqual(w.read(self.root / "panel/selections.json"), saved)
        for file, content in original_files.items():
            self.assertEqual((self.root / "panel" / file).read_bytes(), content)

    def test_branch_mode_has_three_per_parent(self):
        w.publish(self.root, "panel", self.prepare())
        self.save(["r001-03", "r001-01"], mode="branch")
        spec = self.prepare()
        self.assertEqual(len(spec["proposals"]), 6)
        self.assertEqual([p["parents"] for p in spec["proposals"]], [["r001-03"]] * 3 + [["r001-01"]] * 3)
        w.publish(self.root, "panel", spec)

    def test_consumed_request_and_stale_generation_rejected(self):
        spec = self.prepare()
        self.save([])
        with self.assertRaises(w.Conflict):
            w.publish(self.root, "panel", spec)
        fresh = self.prepare()
        w.publish(self.root, "panel", fresh)
        with self.assertRaises(w.Conflict):
            w.publish(self.root, "panel", fresh)
        with self.assertRaises(w.Conflict):
            w.context(self.root, "panel")

    def test_stale_tab_does_not_overwrite_saved_choices(self):
        stale = w.read(self.root / "panel/selections.json")
        saved = self.save([], prompt="New request")
        with self.assertRaises(w.Conflict):
            w.save_selection(self.root, "panel", stale)
        self.assertEqual(w.read(self.root / "panel/selections.json"), saved)

    def test_page_loaded_before_publication_must_reload(self):
        payload = w.read(self.root / "panel/selections.json")
        w.publish(self.root, "panel", self.prepare())
        with self.assertRaises(w.Conflict):
            w.save_selection(self.root, "panel", payload)

    def test_fresh_start_requires_no_picks_and_is_explicit(self):
        w.publish(self.root, "panel", self.prepare())
        with self.assertRaises(ValueError):
            self.save([])
        with self.assertRaises(ValueError):
            self.save(["r001-01"], mode="fresh")
        self.save([], mode="fresh")
        self.assertEqual(w.context(self.root, "panel")["publish_template"]["proposals"][0]["parents"], [])

    def test_invalid_proposals_do_not_change_history(self):
        spec = self.prepare()
        original = (self.root / "panel/lineage.json").read_bytes()
        for mutate in (
            lambda s: s["proposals"].pop(),
            lambda s: s["proposals"][0].update(parents=["unknown"]),
            lambda s: s["proposals"][0].update(file="../../escape.html"),
            lambda s: s["proposals"][0].update(title=""),
        ):
            invalid = copy.deepcopy(spec)
            mutate(invalid)
            with self.assertRaises(ValueError):
                w.publish(self.root, "panel", invalid)
            self.assertEqual((self.root / "panel/lineage.json").read_bytes(), original)
        (self.root / "panel" / spec["proposals"][0]["file"]).unlink()
        with self.assertRaises(ValueError):
            w.publish(self.root, "panel", spec)

    def test_invalid_picks_and_path_boundaries(self):
        w.publish(self.root, "panel", self.prepare())
        for picks in (["r001-01", "r001-01"], ["unknown"]):
            with self.assertRaises(ValueError):
                self.save(picks)
        for slug in ("../escape", "tool", "C:\\escape", "a/b"):
            with self.assertRaises(ValueError):
                w.concept_dir(self.root, slug)
        with self.assertRaises(ValueError):
            w.inside(self.root / "panel", "../outside.html")

    def test_process_lock_serializes_mutations(self):
        with w.project_lock(self.root):
            with self.assertRaises(w.Conflict):
                with w.project_lock(self.root):
                    self.fail("Acquired an existing lock")
        self.assertFalse((self.root / "tool/.workflow.lock").exists())

    def test_http_save_reload_and_foreign_origin(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(w.Handler, root=self.root))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        base = f"http://127.0.0.1:{server.server_port}"
        with urlopen(base + "/api/panel") as response:
            payload = json.load(response)["selection"]
        payload["next"]["prompt"] = "Saved over HTTP — and read from disk"
        request = Request(base + "/api/panel/selections", data=json.dumps(payload).encode(),
                          headers={"Content-Type": "application/json", "Origin": base})
        with urlopen(request) as response:
            self.assertEqual(json.load(response)["revision"], 2)
        with urlopen(base + "/api/panel") as response:
            self.assertEqual(json.load(response)["selection"]["next"]["prompt"], payload["next"]["prompt"])
        self.assertEqual(w.read(self.root / "panel/selections.json")["next"], payload["next"])
        request.headers["Origin"] = "https://foreign.example"
        with self.assertRaises(HTTPError) as caught:
            urlopen(request)
        self.assertEqual(caught.exception.code, 403)


if __name__ == "__main__":
    unittest.main()
