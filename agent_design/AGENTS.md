# Design Experiments — Working Contract

This directory is Lantern's design sandbox. Components explored in its subfolders
contribute to the overall Lantern design. Speed of iteration, meaningful alternatives
and a reliable record of user choices matter more than production architecture.

## Scope and layout

All paths below are relative to `design/`, not the repository root.

```
design/
  AGENTS.md                   this contract
  index.html                  component hub
  tool/                       shared workflow tooling; never a component
    workflow.py               local server + init/context/publish commands
    gallery.js / gallery.css  shared interface
    README.md                 usage, schemas and recovery
  <component>/                one part/component/idea, e.g. graph-panel/
    index.html                that component's round gallery
    selections.json           user's saved request for the next round
    lineage.json              immutable nodes + rounds + request snapshots
    round-spec.json           agent's staging manifest for publication
    <component>-data.json     canonical shared content, when applicable
    <component>-data.js       generated browser-friendly mirror
    RECIPE.md                 final decision record, when finalized
    wireframe/ form/ type/ color/ motion/ draft/ final/   created only as used
      <component>-<tag>-r001-01.html
    refs/                     supplied references
    assets/                   supporting files, only when needed
```

`design/index.html` is the workspace hub, linking the component galleries. Component
experiments are designs for Lantern, not replacements for the workflow interface.
An overall app composition can be explored as its own component. Do not replace the
hub with a winning mockup unless the user explicitly asks to redesign the tooling.

Every experiment is self-contained HTML with inline CSS/JS, plus shared concept data
and genuinely needed local assets. No build step, framework or package manager.
Google Fonts and system stacks are the font sources. Experiment files can be opened
directly. Gallery saving requires the local Python standard-library server.

The server, galleries and persistence helpers are an explicit exception to the old
no-tooling/no-server rule. Shared infrastructure belongs only in `tool/`.

## Start and use the workspace

From the repository root:

```powershell
python design/tool/workflow.py serve
```

The hub opens at `http://127.0.0.1:8765/index.html`. `--no-open` suppresses opening a
browser; `--port` changes the port. See [tool/README.md](tool/README.md) for details.

Each component's `index.html` has, in order:

1. Top actions: selected count, clear picks, **Save next round**, and save feedback.
2. Next-round type (phase), continuation mode and a free-text prompt.
3. A scrolling gallery, latest round first, with **three propositions per row** on
   desktop (stacked on narrow screens). Each card has a checkbox, preview, full-size
   link, ID, title, direction and parent IDs. Older rounds remain selectable.

The user chooses one or multiple designs, enters the next brief and saves. Saving
writes `<component>/selections.json` on disk. Browser storage, downloads and chat
history are not substitutes for that file. Show success only after the server confirms
that the file was written. The UI warns about unsaved changes and reports save errors.
Saving queues a brief; it does not start an agent. The user then says **next <component>**.

## Starting a component

Create it in the hub with its name, first phase and prompt, or run:

```powershell
python design/tool/workflow.py init <component> --phase wireframe --prompt "The first brief"
```

Initialization creates the component page and JSON files, without design proposals or
empty phase folders. Never overwrite an existing component. Use lowercase names with
hyphens. `tool` is reserved.

The user's chosen phase in the saved request is sufficient authorization: do not ask
again. If creating a concept from chat and no phase is given, ask which phase to begin
in before generating proposals. Creating the empty workspace scaffold needs no phase
confirmation; its default is wireframe.

## The iteration loop — saved file first

For **every** generation, including the first:

1. Read this contract and run `python design/tool/workflow.py context <component>`.
   This reads `selections.json` and `lineage.json`. Read the selected parents' HTML and
   shared data, too. Do not infer picks from chat, a screenshot or previous memory.
2. Honor the saved phase, continuation mode and prompt verbatim. If chat conflicts
   with the saved request, resolve that conflict before generating. Do not silently
   rewrite the user's saved file. If the brief cannot be honored within its phase,
   explain the conflict and ask for an updated saved request.
3. Use `publish_template` from context as `<component>/round-spec.json`. It supplies
   exact IDs, files and parents. Fill in titles and directions. Write the specified
   experiment files, with the requested changes and the required header.
4. Publish via `python design/tool/workflow.py publish <component> <spec-path>`.
   This validates the request revision and appends the nodes and a full saved-request
   snapshot atomically to the ledger. The gallery reads it automatically on reload.
5. Report the new IDs and a sentence per proposition; identify how they use the picks.
   For color/type briefs, state how the input was interpreted. End with **Reload,
   pick, write feedback, save, then say next <component>.**

A saved request is consumed once. Do not generate again from an already-published
revision. If the user saves while an agent is working, publication rejects the stale
revision: re-read context and reconcile the draft with the new request. Do not bypass
the check or overwrite existing registered experiments. Never modify `selections.json`
as part of publication. Do not run two agents on the same component at once.

## Multiple selections and counts

Continuation mode is part of the saved request:

- **combine** (default): exactly **3** proposals total. All selected IDs are parents
  of each proposal. Combine their ideas according to the prompt; each description
  names what comes from which parent. Explain incompatible choices rather than
  pretending they can coexist. Within a frozen phase, selected parents must agree
  on the frozen dimensions; otherwise request a compatible phase or selection.
- **branch**: exactly **3 per selected design**, grouped in selected order. Each
  trio has that one parent. This creates multiple rows in the same round.
- **fresh**: exactly **3**, with no parents. The user must clear picks and explicitly
  choose Fresh start when previous proposals exist.

The very first round needs no parents. Later combine/branch rounds require at least
one pick. Picks can come from any round and any age, including different rounds.
Never produce three mere reskins when the phase calls for structural alternatives;
within type/color/motion, explore distinct directions in that variable alone.

## Shared data comes first

Before any content-bearing proposal, write `<component>-data.json` and its generated
`<component>-data.js` mirror (`window.<COMPONENT>_DATA = ...;`). All variations read
that same dataset. Never inline differing copies. Include a `meta` field contract and
representative hard cases: empty, ongoing, overlapping, missing fields, short/long text,
collisions and differing precision as appropriate.

JSON is authoritative. Regenerate the mirror with Python or another available tool
when JSON changes; use UTF-8. The JS mirror makes direct `file://` opening work without
fetch. Do not require Bash on this Windows workspace. The workflow galleries instead
read the ledger through the local server and need no separate content dataset.

## Phases

The standard chain, each phase its own folder. Every phase is **optional** — the user
names the phase they want next, and whatever an earlier phase left in place carries
forward unchanged.

| Folder       | tag   | The one variable                                                     | Everything else is |
|--------------|-------|----------------------------------------------------------------------|--------------------|
| `wireframe/` | `wir` | structure & interaction — what it is, how it is navigated, hard cases | unstyled: black and white, system/mono type, hairlines and boxes |
| `form/`      | `frm` | composition, density, scale contrast, hierarchy, spatial rhythm       | grayscale, one neutral typeface, structure frozen |
| `type/`      | `typ` | typography — families, scale, weights, leading, tracking, case        | form frozen, still grayscale |
| `color/`     | `col` | palette                                                               | form and type frozen |
| `motion/`    | `mot` | motion language — timing, easing, choreography, what moves and what does not | everything visual frozen |
| `draft/`     | `drf` | everything at once — the fast lane                                    | nothing is frozen |
| `final/`     | `fin` | nothing — the terminal copy                                           | — |

1. **Wireframe.** Two wireframes must differ in *mechanism*, not in looks.
2. **Form.** Grayscale on purpose: if the hierarchy only reads once color is on, the
   hierarchy is broken and color is hiding it. Motion appears here only where it is
   *structural* (what a transition reveals), not as a motion language.
3. **Type.** See **The type phase** below for the input formats.
4. **Color.** See **The color phase** below for the input formats.
5. **Motion.** Hold everything visual still so three motion languages can be compared.
6. **Draft.** One round, fully dressed, no phase discipline — for when the user wants to
   *see something* rather than isolate a variable. A draft is a first-class node: it can
   be drafted from again, or dropped into the chain beneath it (its structure becomes the
   wireframe answer; its type and palette become the starting inputs for `type/` and
   `color/` when the user wants to iterate them properly).

Changing the interaction model means we are back in wireframe. Changing the composition
means we are back in form.

The user says when to switch phase. I never promote a concept to the next phase on my own.

## The color phase

The user gives input in **one of four forms**, and I say back in the round report which
one I read it as:

1. **Precise scheme** — role/hex pairs, one per line or slash-separated. Missing roles I
   derive; extra colors I ignore and say so.
   ```
   bg #0b0b0d   surface #16161a   ink #f2f2f2   ink-mute #9a9aa2
   line #2a2a30   accent #ff5c39   accent-ink #0b0b0d
   ```
   A bare list of hex values is also fine — I assign the roles and report the assignment.
2. **Vibe** — one free sentence ("cold and clinical with one hot accent").
3. **Direction** — a named family ("warm monochrome", "duotone", "high-chroma on near-black").
4. **Reference** — an image dropped in `<concept>/refs/`, which I sample. For a website, use the supplied URL or a screenshot in `refs/` as the reference.
   State when the reference cannot be accessed.

Every color variation exposes the **same token set** in `:root`, so palettes stay
comparable and swappable:

```
--bg  --surface  --surface-2  --ink  --ink-mute  --line  --accent  --accent-ink  --focus
--pos  --neg          (only when the concept has status colors)
```

## The type phase

Two input forms:

1. **Precise** — family + weights per role:
   `display: Fraunces 700 · body: Inter 400/600 · mono: JetBrains Mono 400`
2. **Direction per role** —
   `display: high-contrast editorial serif · body: neutral grotesk · mono: none`

Sources are **Google Fonts or a system stack**, nothing else. If the user names a font
that is neither, I substitute the nearest available and say so in the round report —
never silently.

Token set:

```
--font-display  --font-body  --font-mono
--step--1 … --step-6                  the type scale
--tracking-tight/-normal/-wide        --leading-tight/-normal/-loose
```

## IDs, lineage and preserved history

IDs are unique inside a component: `r001-01`, `r001-02`, `r001-03`, then `r002-01`, etc.
For per-parent branching, a six-proposal round uses `r002-01` through `r002-06`.
The filename is `<component>-<phase-tag>-<id>.html`, in its phase folder.

The old concatenated-digit lineage scheme is superseded. Multi-parent history is a
DAG recorded explicitly in `parents[]`; filenames no longer encode ancestry. Never
renumber, reuse, delete or overwrite a registered node. Phase changes keep all parents.
`publish` allocates IDs through `context`; do not invent IDs outside that template.

The two authoritative files have different owners:

```json
// selections.json — user's newest saved request
{
  "schema_version": 1,
  "concept": "graph-panel",
  "revision": 2,
  "saved_at": "2026-09-29T10:00:00+00:00",
  "based_on_round": 1,
  "selected_ids": ["r001-01", "r001-03"],
  "next": {"phase": "draft", "mode": "combine", "prompt": "Keep the map from 01 and the inspector from 03"}
}
```

`lineage.json` holds `schema_version`, `concept`, `nodes[]` and `rounds[]`. Each node
has `id`, `parents`, `phase`, `tag`, `file`, `title`, `direction`. Each round has
`number`, `created_at`, `node_ids` and `request` (the complete consumed selections
snapshot). That snapshot preserves historical picks, phase, mode and feedback even
after the user saves a new request. Treat previous nodes and rounds as append-only.
Do not hand-edit the ledger to register a round; use `publish`.

## Experiment header

Each experiment starts with a comment like this, plus a meaningful `<title>`:

```html
<!--
  id:        r002-01
  component: graph-panel
  phase:     draft
  parents:   r001-01, r001-03
  direction: Spatial map with the selected side inspector
  request:   revision 2
  inputs:    Keep the map from 01 and the inspector from 03
-->
```

Use `parents: none` for a root. Preserve the prompt verbatim in the ledger; safely
escape a comment-ending sequence if it occurs in the HTML comment.

## Finishing a component

Finalization is an explicit user decision, not an automatic phase promotion. `final`
is a terminal snapshot rather than an exploratory round type in the selector. Require
one winning leaf. If multiple picks still need combining, generate a combine round
first, then let the user select its winner.

Copy the winner to `final/<component>-fin-<id>.html`, retaining its ID. Write `RECIPE.md`
with its source path, all contributing ancestors (including merges), decisions at each
step, verbatim type/color inputs and final token values. Resolve relative asset/data
paths so the snapshot works from `final/`. Do not overwrite an existing different final
snapshot without an explicit replacement request. The original leaf and its history
remain selectable; finalization does not lock the component or replace the hub.

## Review policy

For ordinary proposal rounds, write carefully, verify paths/metadata/counts and report
back. Do not spend extra turns opening every proposal in a browser unless requested
or needed to investigate a reported issue. The user reviews the designs.

Changes to the **workflow tooling itself** are different: test real disk saves, loading,
multiple picks, round history and conflicts. A local server and browser verification
are allowed for this infrastructure. Keep tests in `tool/` and use temporary fixture
components; do not leave fabricated proposals in the user's gallery.

## Style defaults

- Dark-first; respect color-scheme preference when practical.
- System fonts or Google Fonts; no unrelated external assets.
- Responsive, no horizontal page overflow. The desktop gallery has three columns.
- Honor `prefers-reduced-motion` for animation.
- Newest round first; retain all old experiments and lineage.

## Non-negotiables

- Read the saved request before every round; do not refine without saved picks.
- Match the mode's exact proposal count and the saved phase.
- In a phased round, change only its variable; `draft` can change all variables.
- Never promote a phase unasked or hide structural changes in a later phase.
- Never rewrite registered experiments or historical request snapshots.
- Never claim a save succeeded if it exists only in browser memory or a download.
- Keep shared content consistent and the ledger current through publication.
- Keep shared tooling in `tool/`; no dependencies or server copies per component.
