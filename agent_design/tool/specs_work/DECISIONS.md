# Spec workshop — decisions digest

> **Closed 2026-10-02.** Round 3 confirmed every (R3: …) proposal below, with three changes: a single click in Gallery also shows detailed stats; CLI sign-in is **instructions only** in v0.1.0 (Lantern opening it is Later); the default model is **`opus`**, not sonnet. The agreed specs in `agent_wiki/specs/` now supersede this digest.

The single source of truth that spec writers work from, maintained by the agent after each round.
Rounds 1 and 2 were answered by the user on 2026-10-01; question ids refer to
`data/questions.json`. Where this digest and an older spec draft disagree, **this digest wins**.
Items marked **(R3: q-…)** are proposals still awaiting the user in round 3: write them into
specs as the proposed behaviour and list them in the spec's `# Open` section with that id.

## Product frame

- v0.1.0 is the user's **daily tool**: the Learn room only, built modular. Multiple rooms are
  coming, not all about learning, possibly with new mechanisms. Reusable components are a
  requirement. (q-scope-purpose, q-scope-rooms)
- **Rooms have spaces**, like Prism's lens → view. Each room owns its spaces. Learn has three:
  **Welcome**, **Study** (the graph + reading panel) and **Gallery**. There is no app-level home in
  v0.1.0. The app opens on the **last used room's Welcome**. (q-r2-spaces)
- Each room has its own accent ("its own lantern"); the frame, typography and structure are shared.
  Learn keeps the amber lantern of the final learning-node design
  (`agent_design/learningnode/RECIPE.md`, design r008-02 *Forward embers*). (q-r2-header, q-poc-keep)
- Feel: a calm, warm light in a peaceful place. Subtle motion, no distraction. (q-poc-keep)

## Navigation and header (q-r2-header + user notes)

- Header, left to right: Lantern mark · room chip (a label in v0.1.0; it becomes the room switcher
  later) · space navigation · subject title · compact stats (*12 lit · 4 understood · 9 dark*; hover
  shows the token total) · settings gear. The Lantern mark leads to the current room's Welcome.
- Space navigation is **not necessarily tabs**, but it must be intuitive. User's notes:
  - In Study, the **top-left of the graph view** holds a **Welcome icon**, which takes the place
    of the current "reset graph" icon. Next to it is a **Gallery icon**.
  - The current "reset graph" action is really **recenter**, and stays as its own control
    (proposed: with the zoom controls) **(R3: q-r3-nav)**.
  - From Welcome, Gallery is reachable. Selecting a (recent) subject switches to Study.
  - In Gallery, **double-click** opens a subject in Study (single click selects it and shows its
    actions) **(R3: q-r3-nav)**.
- The **legend is mandatory**: a small overlay in a corner of the graph that can be collapsed but
  never removed. It shows the node states (open, lit, understood demonstrated / self-declared,
  dismissed) and the text-link lines.
- The stats stay secondary.

## Domain model

- Library (a folder) → Subject → RoomVisit (per room; v0.1.0 has only `learn`) → its own graph
  (q-model-rooms). Room definitions are built into the app and never stored.
- **Shape in v0.1.0: a tree.** Merge (several parents, Ctrl+click) is **Later** (q-r2-merge,
  q-r2-shape notes). Proposed **(R3: q-r3-links)**: store `parents: string[]` holding exactly one
  id (none for the root), so that merge can be added later without a format change.
  **Relations live in the text** as markdown links `[label](node:<id>)`, written by the tutor or
  the user. They're clickable in the panel and drawn as faint dotted lines in the graph, toggled
  from the legend. There's no separate edge list.
- States: open → lit → understood, plus **dismissed**. `understoodBy` is `demonstrated` or
  `self` (null unless understood). (q-model-states, q-learn-understood)
- Kinds: subject, axis, deeper, application, adjacent, exercise, question, own (added by the
  user). `merge` is Later.
- Provenance (q-r2-provenance, all accepted):
  - A **generation log** per room visit: one record per LLM call, holding id, nodeId, task
    (intro|light|reply|check|more|suggest), model (the **resolved id** the provider reports),
    effort, tone, promptVersion, startedAt, durationMs, usage {input, output, thinking,
    cacheRead, cacheWrite}, costUsd (stored, not shown), and outcome ok|cancelled|error.
  - Totals are derived from the log, never stored twice.
  - Cancelled and failed calls count, and are marked as such.
  - The content author is recorded on each node: `{kind: model, model, effort, generationId}`.
    An edit adds `edited: {by, at}`.
  - Each dialogue turn records its author: the model and generation for tutor turns, the
    user's name for learner turns.
  - The user's display name comes from settings, defaulting to the Windows user name.
- Usage display: **tokens and time**, no currency. The node meta line looks like
  *Sonnet 5.5 · medium · 3.2k in / 1.1k out · 24 s*. The subject total appears in the stats hover
  and in the Gallery. All usage numbers can be hidden by a setting. (q-r2-usage-display,
  q-r2-settings)
- Log growth: keep every record forever. That's about 300 bytes per record, so 2,000 calls come
  to about 600 KB **(R3: q-r3-storage)**.

## Learn room behaviour

- Options: always **3** per light-up. **More options** adds 3 new open children and never
  replaces existing ones. The tutor sees every existing child, including dismissed ones, and must
  propose different directions. (q-learn-options, q-r2-actions)
- **Add my own node**: from a node's panel, enter a title and optional hook. This creates an open
  child with kind `own` and author = user; it is lit like any other node.
- **Dismiss**: only open nodes can be dismissed. A dismissed node stays in the graph, faded.
  A *Dismissed (n)* fold in the parent's panel lists them, each with *Restore*. A dismissed node
  is never re-proposed.
- **Delete**: removes a node and its subtree, after a confirm dialog that shows the count. The
  log keeps their records. The root can't be deleted; deleting the subject is done in Gallery.
- **Cancel**: discards the partial reply. The node returns to its previous state, and the log
  records *cancelled* with the tokens used so far.
- **One generation at a time per subject** (superseded "per node", 2026-10-02; R3: q-r3-proposals). Everything stays browsable and readable; start controls are disabled while it runs. The provider contract still allows concurrency, so parallel generation (Later) needs no provider change.
  Parallel generation is Later.
- **Understood**: the tutor may emit `<understood/>` only in reply to a *Test me* question
  (demonstrated). *I get it / Not sure anymore* is always available to the learner
  (self-declared).
- **Regenerate**: Later. *More options* covers the options case. (q-r2-regenerate)
- **Editing** (q-r2-edit, all accepted):
  - Title and hook can be edited on any node.
  - The explanation can be edited in place as markdown (edit → save / cancel).
  - Tutor dialogue turns can be edited too.
  - An edit keeps the previous text **once**, in `previous`, for compare or revert. Undo is Later.
  - Edited content shows an *edited by <name>* mark.
  - The tutor treats the learner's corrections as truth; the system prompt says corrections take
    precedence.
  - Editing never triggers a generation.
- **Tone**: set per subject, with a room default in Learn settings. Presets are ELI5, Curious,
  Student, Engineer and Expert, plus a free-text custom tone. It can be changed from the header at
  any time and affects new generations only. Each generation logs its tone. (q-r2-tone)
- **Text selection → action** (q-r2-highlight): bold key terms keep the *focus* colour, as in the
  PoC. Selecting text in an explanation or dialogue shows a small popover **(R3: q-r3-select)**:
  - *Ask about this* puts the quote into the dialogue box as `> quote` and focuses it.
  - *Make it a node* creates an open `own` child of the current node. Its title is the selection
    (trimmed, at most 80 characters; a longer selection becomes the hook and the user is asked
    for a title).
- **Spawn animation** (q-r2-spawn): specified in words and tuned in the app; there's no design
  round. Proposed defaults **(R3: q-r3-spawn)**:
  - When a light-up or *More options* starts, 3 neutral *pending* placeholders grow out of the
    parent's rim. They are staggered by 120 ms with an ease-out of 500 ms, in a neutral dotted
    style distinct from *open*.
  - While waiting, they breathe slowly (opacity 0.5↔0.8, 2.4 s period).
  - When the options block parses, each placeholder becomes the real open node in place and its
    title fades in over 200 ms. Surplus placeholders shrink back into the parent over 300 ms.
  - On cancel or error, all placeholders shrink back over 300 ms.
  - For replies and checks, which add no nodes, there are no placeholders: the node itself gets a
    soft pulse while the tutor writes.
  - Reduced motion: placeholders appear and disappear with no growth and no breathing.
  - These rules apply in both layouts. In the physics layout, placeholders are real simulation
    bodies, so the graph makes room for them.
  - The travelling light and embers of the final design are unchanged.

## Prompts, protocol, context, provider

- **Prompts are app-internal and versioned.** Each generation records `promptVersion`. Tone and
  model are the user-facing controls, and the prompt evals guard every change. (q-r2-prompt)
- **The system prompt structure** has to be specified properly. The user asked for "a proper
  prompt-engineered pre-prompt": room role, method (from the learning-session skill), tone block,
  learner-corrections-take-precedence rule, link rule (link to existing nodes with `node:<id>`
  when you mention them, and only to ids present in the context), language rule, protocol.
- **Tagged blocks protocol** as in the PoC (`<options>`, `<branch>`, `<understood/>`, at the end
  of the reply). Options-first is **Later**. (q-llm-latency)
- **Context: adaptive** (q-llm-context, q-r2-context, all accepted):
  - A budget of **12k input tokens for the map part**, configurable in Learn settings
    (advanced).
  - Below the budget, send the whole map outline, as the PoC does.
  - Above it, send the path to the root, the siblings and children of the focus, and the
    **titles of every node**, so the tutor never proposes duplicates. Descendant hooks follow as
    long as budget remains.
  - Dialogue: the last 12 turns in full; older ones are replaced by *(n earlier turns omitted)*.
    There are no summary calls in v0.1.0.
  - The user's edits to the focused node and its parents are never clipped first.
  - Node ids appear in the outline so the tutor can link to them.
  - Note: every CLI call also carries about 13k tokens of the CLI's own baseline (cache
    creation), which falls outside Lantern's budget.
- **Provider** in v0.1.0: the Claude Code CLI only, with the flags in
  `agent_wiki/decisions/claude-cli-provider-flags.md`, plus `--model` and `--effort
  low|medium|high|xhigh|max`.
  - The `system/init` line reports the resolved model.
  - The `result` line reports `duration_ms`, `total_cost_usd` and `usage`, including
    `output_tokens_details.thinking_tokens`.
  - Cancel = kill the child process.
- **Model and effort**: set per subject, with app defaults in settings. A picker in the subject
  header changes them for future generations. The model choices are the aliases opus, sonnet and
  haiku, or a free-text id. Effort offers the 5 levels. (q-r2-model)
- **Latency is accepted and masked by motion, not reduced.**

## UI

- The Study layout is the PoC split (graph on the left, reading panel on the right):
  - The divider is resizable; double-clicking it resets to 44%.
  - Either side can collapse.
  - The split is remembered app-wide. (q-ui-layout, q-r2-graph)
- Both graph layouts stay: free (physics) and tree, with the toggle.
- Rich content: KaTeX math, Mermaid diagrams and syntax-highlighted code, in both explanations
  and dialogue.
- **Keyboard:**
  - Arrows move between parent, children and siblings.
  - Enter lights an open node, or focuses the panel.
  - Ctrl+Enter sends; Esc cancels a generation.
  - `?` shows the shortcuts.
  - Merge shortcuts are Later.
- Reduced motion is respected.
- **Welcome** (q-r2-welcome, all accepted):
  - One subject field, front and centre, with *Suggest 3 subjects* and a tone picker.
  - The 3 most recent subjects as large cards: title, mini graph thumbnail, understood / total,
    last opened, *Continue*.
  - **The Welcome look is designed in agent_design** as a design component before it is
    implemented, so the spec fixes behaviour and content, not the visual.
- **Gallery** (q-r2-welcome):
  - All subjects as a card grid, sortable by last opened, created or progress, and filterable by
    text.
  - Card stats: nodes, lit, understood (demonstrated / self), tokens spent, time span (created →
    last opened), and main model.
  - Card actions: rename, delete (with confirmation), and reveal the file in Explorer.
- Interface language: English, with all strings in one module. (q-ui-language)

## Settings (q-r2-settings, all accepted)

Settings are stored app-side, in the OS config directory, never in the library.

- **General**:
  - Library folder: change it or reveal it. Moving the existing subjects is offered, never forced
    **(R3: q-r3-storage)**.
  - Display name.
- **Provider (Claude Code CLI)**:
  - Status: found or not, version, logged in or not.
  - A *Test* button that runs a tiny call.
  - A clear fix-it message when something is missing. The user must never need a terminal.
  - Default model and default effort.
- **Learn room** (a submenu):
  - Default tone.
  - Context budget (advanced).
- **Appearance**:
  - Reduce-motion override.
  - Show token stats (on/off).

## Storage (q-storage-*)

- One JSON file per subject at `<library>/subjects/<id>.json`, format `lantern/1`. The library
  defaults to `Documents/Lantern`.
- PoC subjects are imported, and the originals are kept.
- Write safety (ST-20 to ST-24 in `specs/subject-storage.md`) awaits the user's review
  **(R3: q-r3-review)**.
- Conflict UX **(R3: q-r3-storage)**, as proposed:
  - If the file changed on disk and there are no unsaved local changes, reload silently and show
    a toast.
  - If both sides changed, keep the disk version open, save the local version as a conflict copy,
    and show a banner with *Open conflict copy*.

## Platform and quality

- Windows only. Tests:
  - Core unit tests.
  - Rust tests.
  - Playwright end-to-end tests with the fake tutor.
  - Prompt evals run by hand on **Haiku**.
  - No CI.
- Evals layout **(R3: q-r3-evals)**:
  - An `evals/` folder holding fixture subjects and cases.
  - A runner: `npm run eval -- --model haiku [--effort low]`.
  - Results go to `evals/results/<date>-<model>.json` (git-ignored), with a summary table printed
    to the console.
- Installer: Prism's unsigned per-user NSIS installer, built locally. **The updater plugin and
  `createUpdaterArtifacts` are wired from v0.1.0, but there is no update UI or flow.**
  (q-r2-installer)

## Later (not in v0.1.0)

- Merge (Ctrl+click), regenerate, parallel generation.
- API, local and other providers (with a security focus).
- Search, export (for example as an OKF bundle), undo / history, spaced review, learner profile,
  bring-your-own material.
- The Think room and an app-level home / room switcher.
- Auto-update UI, light theme, French UI.
- Options-first protocol, a cheaper model for cheap tasks, summary calls.
