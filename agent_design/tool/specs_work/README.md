# Lantern spec workshop

A local page where you and an AI agent iterate on product specifications in rounds of
questions and answers. Requires Python 3.10+; no packages, bundler or API key. Commands
run from the repository root in PowerShell.

```powershell
python agent_design/tool/specs_work/serve.py
```

Opens `http://127.0.0.1:8770/index.html`. Use `--no-open` to stay headless or
`--port 8771` if 8770 is taken. Ctrl+C stops it. It binds to 127.0.0.1 only, serves
this folder, and serves `agent_wiki/**/*.md` read-only under `/wiki/`.

Saving writes a file to disk. It never calls an AI.

## The human loop

1. Start the server. Open the **Questions** tab; the latest round is shown.
2. Answer in your own words first. Claude's take is collapsed on purpose, so you form your
   view before seeing a recommendation. Add notes, or flag a question for discussion.
3. **Save answers** (or Ctrl+S). The status reads "Saved revision N" only after the server
   has written `data/answers.json`.
4. Tell the agent **next**. The agent folds your answers into the specs and writes a new round.
5. Click **Reload**, and repeat.

Other tabs: **Specs** lists specs with status (todo, draft, review, agreed) and renders the
markdown from `agent_wiki/`; **Sketches** lists every illustration questions point to.

A question counts as answered when: single/multi has a choice (or other text); text has notes;
scope has every item placed; rank has been ordered (any move, or "keep this order"); or it is flagged.

Unsaved edits trigger the browser's leave-page warning. As a convenience, an unsaved draft is
kept in the browser; if the page crashes you are offered "Restore unsaved draft?". The draft is
never the source of truth. Two tabs cannot silently overwrite each other: a stale save is refused
with a 409 and your edits stay on screen.

## File ownership

| File | Owner | Notes |
|------|-------|-------|
| `data/questions.json` | agent | Areas, rounds, questions. Append only. |
| `data/specs.json` | agent | Spec list and statuses. |
| `data/answers.json` | user (via the page) | The agent reads it, never edits it. |
| `agent_wiki/specs/*.md` | agent | Rendered in the Specs tab. |
| `sketches/*.html` | agent | Referenced by a question's `illustration`. |
| `serve.py`, `index.html`, `app.js`, `app.css` | tooling | Not touched during rounds. |

## The agent loop

On "next":

1. Read `data/answers.json`. Check `revision` and `saved_at`; do not infer answers from chat.
   Treat `flag: "discuss"` as "talk to me before folding this in".
2. Fold the answers into `agent_wiki/specs/*.md` (follow the wiki's own conventions).
3. For each question whose answer is now reflected in a spec, set
   `"settled": {"summary": "...", "spec": "specs/<file>.md"}` in `questions.json`.
4. Update `data/specs.json`: `status` (`todo`, `draft`, `review`, `agreed`), `summary`, `questions`.
5. Append a new round: add `{"number": N+1, "created_at": ..., "intro": "markdown"}` to `rounds`
   and new questions with `"round": N+1`.
6. Never delete or renumber questions or rounds, and never edit `answers.json`. Question ids
   must stay stable, because answers are keyed by id (unknown ids are rejected on save).
7. Tell the user: **Reload, answer, save, then say next.**

Write JSON as UTF-8 (a BOM is tolerated). The server re-reads the files on every request.

### questions.json

```json
{
  "schema_version": 1,
  "areas": [{"id": "scope", "title": "v0.1.0 scope", "blurb": "one line"}],
  "rounds": [{"number": 1, "created_at": "ISO", "intro": "markdown"}],
  "questions": [{
    "id": "q-scope-rooms", "round": 1, "area": "scope",
    "title": "Which rooms ship in v0.1.0?",
    "context": "markdown: why this matters, what we know",
    "kind": "single | multi | text | scope | rank",
    "options": [{"id": "a", "label": "short", "detail": "markdown", "recommended": true, "tint": "#4fc1c0"}],
    "allow_other": true,
    "items": [{"id": "x", "label": "short", "detail": "markdown"}],
    "buckets": [{"id": "v010", "label": "v0.1.0"}, {"id": "later", "label": "Later"}],
    "take": "markdown: your recommendation and reasoning",
    "illustration": "sketches/foo.html",
    "settled": {"summary": "markdown", "spec": "specs/domain-model.md"}
  }]
}
```

`options` for single/multi; `items` + `buckets` for scope; `items` for rank; text has neither.
`take`, `illustration`, `settled` and `allow_other` are optional. An option's optional `tint`
(a `#rrggbb` colour) draws its card in that colour, for questions about colour. `illustration` is a relative path
inside this folder.

### answers.json (written by the server)

```json
{"schema_version": 1, "revision": 4, "saved_at": "ISO",
 "answers": {"q-id": {"choice": ["a"], "other": "", "placement": {"itemId": "bucketId"},
                      "order": ["itemId"], "notes": "", "flag": null, "updated_at": "ISO"}}}
```

All answer fields are optional. `choice` may contain `"other"`, with the text in `other`.
Text questions store their answer in `notes`. `flag` is `null` or `"discuss"`.

### specs.json

```json
{"specs": [{"id": "domain-model", "title": "Domain model", "area": "model",
            "status": "todo | draft | review | agreed", "file": "specs/domain-model.md",
            "summary": "one line", "questions": ["q-..."]}]}
```

`file` is relative to `agent_wiki/`. Frontmatter (`title`, `status`) is stripped and shown in the reader.
A missing file shows "Not written yet".

## Tests

```powershell
python -m unittest discover -s agent_design/tool/specs_work -p "test_*.py" -v
node --check agent_design/tool/specs_work/app.js
```
