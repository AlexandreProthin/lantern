# Design workflow tooling

Requires Python 3.10+; no packages, bundler or API key. Commands below run from the
repository root. The server resolves its design directory from its own file, so
it also works when launched from another directory.

```powershell
python design/tool/workflow.py serve
```

Opens `http://127.0.0.1:8765/index.html`. Use `--no-open` to keep it headless, or
`--port 8766` if 8765 is occupied. Ctrl+C stops it. It serves only `design/` and
binds to the loopback interface. Component pages require this server for saving;
individual experiment HTML files still work when opened directly.

## The human loop

1. Create a component on the main page: name, first round type, first prompt.
2. In its page, choose a round type, continuation mode and prompt. Save next round.
3. Tell the agent **next `<component>`**. Saving never invokes an AI automatically.
4. Reload after the agent produces a round. Select one or several proposal checkboxes
   from any round. Write feedback, choose the next round type, save, repeat.

The top controls stay above the scrolling gallery on desktop. Each row contains
three proposals; small screens stack them. Choose **Page format** to render each
page at 1600 × 900 (16:9), 900 × 1600 (9:16), or 390 × 844 (mobile). The viewport
scales up or down to fit without changing its layout width. The format preference
is remembered locally, independently of saved briefs and selections.

Double-click a thumbnail, press Enter/Space on it, or use **Preview** to open the
viewer. Left/right arrows and Previous/Next cycle through propositions in gallery
order (latest round first), wrapping at either end. Escape closes the viewer and
returns focus. Format selectors retain their normal arrow-key behavior.
Previews are for visual comparison; **Open full size** in the viewer opens an
interactive page. Long pages scroll in that full-size view.

- **Combine picks** (default): three proposals incorporating the selected directions.
- **Branch each pick**: three proposals per selected design, in selected order.
- **Fresh start**: three new directions, with no parents. Clear picks first.

An initial round can have no picks. Later rounds need a pick unless Fresh start is
explicitly selected. Selecting cards or editing text does not save automatically.
Unsaved edits trigger the browser's leave-page warning. A failed save remains unsaved.
Two tabs cannot silently overwrite one another; reload an out-of-date tab before saving.
Copy unsaved feedback elsewhere before reloading if you want to keep it.

## The agent loop

Read `design/AGENTS.md` first. To create a component from the command line:

```powershell
python design/tool/workflow.py init graph-panel --phase wireframe --prompt "Explore navigation through a graph of ideas"
python design/tool/workflow.py context graph-panel
```

`context` reads the saved request and ledger, then prints:

- `request`: verbatim saved picks, phase, mode, prompt, timestamp and revision;
- `parents`: selected node metadata and HTML paths to inspect;
- `publish_template`: exact IDs, file paths and parent arrays for the next round.

Copy `publish_template` into `design/<component>/round-spec.json`, fill in each
proposal's `title` and `direction`, and write the specified HTML files. Do not change
the template IDs, paths, parents or order. Create only the phase directory in use.
Then register the completed proposals:

```powershell
python design/tool/workflow.py publish graph-panel design/graph-panel/round-spec.json
```

Example spec shape (use the actual output from context):

```json
{
  "selection_revision": 1,
  "proposals": [
    {"id":"r001-01","parents":[],"file":"wireframe/graph-panel-wir-r001-01.html","title":"Map first","direction":"Spatial navigation centered on the graph"},
    {"id":"r001-02","parents":[],"file":"wireframe/graph-panel-wir-r001-02.html","title":"Reading trail","direction":"A sequential trail through related ideas"},
    {"id":"r001-03","parents":[],"file":"wireframe/graph-panel-wir-r001-03.html","title":"Working desk","direction":"Side-by-side inspection of pinned ideas"}
  ]
}
```

When the user's saved prompt asks for a single proposal, add `"single": true` to the spec and keep
only the template's first proposal (combine or fresh mode; branch is refused).

Publishing checks the saved revision, proposal count, IDs, parent groups and existing
HTML files. It atomically appends one round to `lineage.json`, including a full snapshot
of its request. It does not generate designs or judge their visual quality. The gallery
reads the ledger on reload; agents never hand-edit galleries to add cards.

If a newer request was saved while you worked, publication is rejected. Re-read context
and reconcile the draft with the new brief before publishing. Once a request is consumed,
`context` and `publish` reject another round until the user saves a new request. The user's
`selections.json` is never changed by publication. Previous requests live in round snapshots.

## Files and ownership

| File | Owner / purpose |
| --- | --- |
| `<component>/selections.json` | User's most recently saved next-round request |
| `<component>/lineage.json` | Append-only history updated through publish |
| `<component>/round-spec.json` | Agent's staging manifest; reusable for the next round |
| `<component>/index.html` | Thin shared gallery entry point, generated once by init |
| `tool/gallery.js`, `tool/gallery.css` | Shared hub and component interface |
| `tool/workflow.py` | Local server, validation, scaffolding, context and publication |

IDs use `r001-01`, `r001-02`, etc. They stay unique across phases; ancestry lives in
`parents[]`, which supports merges and branches. There are no current legacy experiments
to migrate. Do not feed the older digit-path ledger format into this tool.

The server writes JSON atomically and uses `tool/.workflow.lock` to serialize CLI and
browser mutations. If a process crashes mid-save, verify the PID in that lock is no longer
running, then remove only that lock file before retrying. Keep one agent working on a
given component at a time. Hand edits to JSON bypass conflict detection and are unsupported.

## Verification

```powershell
python -m unittest discover -s design/tool -p "test_*.py" -v
node --check design/tool/gallery.js
```

Tests create isolated temporary components. They cover disk persistence, multiple parents,
per-parent branching, immutable history, stale requests, duplicate publication, path bounds
and HTTP save validation. Infrastructure changes may be browser-checked; routine design
rounds follow the contract's lighter review policy.
