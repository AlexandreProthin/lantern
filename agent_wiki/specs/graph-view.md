---
type: Spec
title: Graph view
description: The Study space's graph - layouts, node rendering per state, route highlight, text links, spawn and busy animation, controls, keyboard, the graph/panel split, performance and reduced motion.
tags: [graph, study, layout, animation, keyboard, split, accessibility]
status: stable
generated: { by: Codex/GPT-6, at: 2026-10-02T18:15:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Source: spec workshop rounds 1–3 (2026-10-01/02). Agreed with the user 2026-10-02 (q-r3-review).
Spawn motion refined by the user's 2026-10-02 implementation feedback: sequential
branch growth led by a light dot, breathing light while waiting, settling with particles on completion.

The left side of Study; the reading side is [node-panel](/specs/node-panel.md). It builds on the
PoC `Graph.svelte` and on the final learning-node design `agent_design/learningnode/RECIPE.md`
(design r008-02 *Forward embers*), whose tokens, states and motion numbers are **binding** and
are referenced here, not restated. The graph shows one room visit's tree
([domain-model](/specs/domain-model.md)); the frame is [rooms-spaces](/specs/rooms-spaces.md).

# Layouts

- **GV-10** Two layouts MUST exist: **free** (force simulation, the default) and **tree**
  (left-to-right depth columns, leaves on rows, each parent centred on its children; column
  spacing 240 px, row spacing 96 px as in the PoC).
- **GV-11** A toggle (GV-53) switches layout without reloading; nodes MUST move to their new
  positions (the simulation's targets change) rather than jump, except under reduced motion
  (GV-102).
- **GV-12** The chosen layout MUST be persisted **app-wide** in the app-side UI state (not in the
  subject file, not per subject); the PoC's browser storage key is replaced by it.
- **GV-13** Sibling order in the tree layout and in keyboard navigation is **creation order**
  (`createdAt`, then insertion order). A restored or added node keeps its original place.
- **GV-14** Free layout MUST be reproducible: the initial position of a node is
  derived from a hash of its id around its parent (not `Math.random`), so reopening a subject
  gives the same picture. Node positions are not stored in v0.1.0.
- **GV-15** Free layout: the root is pinned at the origin; repulsion, collision radius and link
  distance are tunable constants (PoC values: charge −900, collide 62, link distance 130).

# Node rendering

Circle nodes, 44 px (`DISC`), the title as the only text (13 px, weight 400, line height 1.5), as
in the RECIPE. All colours are the room tokens of [rooms-spaces](/specs/rooms-spaces.md) RS-31.

| State | Rendering |
|---|---|
| **open** | `--bg` fill, 1 px **dotted** `--node-open` outline, hollow glyph. No glow. |
| **lit** | `--surface-2` fill, `--node-lit` outline and filled glyph, the two-layer `--glow-near` / `--glow-far` shadow of the RECIPE. |
| **understood, demonstrated** | Solid `--node-understood` fill, `--accent-ink` checkmark, no glow (RECIPE). |
| **understood, self-declared** | `--bg` fill, **2 px solid** `--node-understood` ring and a `--node-understood` checkmark. No fill, no glow. |
| **dismissed** | Rendering of the node's underlying look at **at most 35 % opacity** (including its title), no glow, no travelling light, dotted outline. |
| **pending** | Placeholder of GV-90: no glyph, no title, 1.5 px dotted `--path-muted` outline, no glow. |

- **GV-20** Each state MUST be recognisable without colour at **38 px**: *open* by its dotted
  line, *lit* by the filled dot and glow, *demonstrated* by the solid disc, *self-declared* by the
  open disc with a thick ring and check, *dismissed* by faintness, *pending* by its empty
  dotted disc.
- **GV-21** *Self-declared vs demonstrated:* the two MUST differ in fill (hollow vs solid) as well
  as hue, so that they differ for colour-blind users; the legend draws both
  ([rooms-spaces](/specs/rooms-spaces.md) RS-36).
- **GV-22** The `question` kind keeps the PoC's diamond glyph for open/lit; other kinds use the
  circle glyph. Understood nodes show the check regardless of kind.
- **GV-23** Each node MUST expose an accessible name *title · kind · state*, plus *· understood by
  you* or *· demonstrated* for understood nodes, and *· preparing* while busy.
- **GV-24** An untitled node renders *Untitled question* (PoC behaviour). Long titles wrap with
  `overflow-wrap: anywhere` inside a 150 px column; a title is clipped after 3 lines with an
  ellipsis, the full text in the tooltip.
- **GV-25** Hover on a non-open node sets the outline to `--focus` and underlines the title.

# Selection and route

- **GV-30** Exactly one node is focused at any time (single selection; multi-select is Later with
  merge). Clicking a node focuses it; clicking the empty background changes nothing. The focused
  node shows a 1 px `--focus` outline at offset 6 px and `aria-pressed="true"`.
- **GV-31** The **route** is the focused node plus its ancestors up to the root. Route edges use
  `--accent`, other edges `--path-muted`, both 1 px and not glowing; nodes off the route have
  `--ink-mute` titles. Route highlighting is independent of learning state and MUST NOT change
  node data.
- **GV-32** The travelling light, passing glow and ember fans follow the RECIPE exactly (1250
  px/s, 160–650 ms per edge, 15 ms junction pause, 16 embers per crossed node, trail cap 34).
  The effect MUST replay **only on newly highlighted edges**: the initial display, re-selecting
  the focused node and returning to an ancestor already on the route do not play it.
- **GV-33** The effect MUST be cancelled by navigation, a hidden window and a reduced-motion
  change, and MUST NOT run while the Study space is not visible.
- **GV-34** Focusing a node that is off screen MUST pan so the node is visible (animated 300 ms,
  instant under reduced motion) without changing the zoom level.

# Text-link lines

Relations live in the text as `[label](node:<id>)` ([domain-model](/specs/domain-model.md) DM-21).

- **GV-40** For every node whose content or dialogue contains a link to an existing node, a line
  MUST be drawn between the two nodes: **faint, dotted** (`stroke-dasharray 1 5`, 1 px,
  `--path-muted` at 45 % opacity), under the nodes, slightly curved so it does not cover a tree
  edge. A link to a missing id draws nothing; duplicate links and links in both directions draw
  one line; links to the node's own parent or child draw nothing (the tree edge already shows
  them).
- **GV-41** A toggle in the legend (*Text links*) shows or hides these lines. Default on;
  persisted app-wide.
- **GV-42** Text links are **never part of the route**: they are not highlighted, carry no
  travelling light and have no effect on keyboard navigation, tree layout or (by default) the
  force simulation.
- **GV-43** Clicking a text-link line does nothing; the links are followed from the panel
  ([node-panel](/specs/node-panel.md) NP-71).
- **GV-44** *Link preview (v0.1.1 F3).* Hovering (or keyboard-focusing) a node link in the panel's
  text MUST play one subtle light travelling from the node being read to the link's target, to
  show where a click lands, then a soft glow on the target. It follows the tree edge when the
  target is the parent or a child, otherwise a faint temporary curve shaped like the text-link
  line (drawn for the preview even when *Text links* is off). It is not part of the route
  (GV-42 still holds), replays on each new hover, stops when the pointer leaves the link, and does
  not run under reduced motion, while Study is hidden, or for a link to the node itself.

# Controls

- **GV-50** *Removed 2026-10-05 (v0.1.1 I1).* The graph has no navigation cluster: the *Welcome*
  and *Gallery* icons duplicated the header ([rooms-spaces](/specs/rooms-spaces.md) RS-21), and
  *Previous view* (which sat hidden under the layout toggle) went with them. The layout toggle
  (GV-53) and the search button (GV-57) are the only controls at the top of the graph.
- **GV-51** A **zoom cluster** at the **bottom-right**, in this order: zoom out, **recenter** (fit
  all), zoom in (order since v0.1.1 I2).
  Recenter is its own control and no longer changes focus (the PoC reset also jumped to the
  root).
- **GV-52** The legend is bottom-left ([rooms-spaces](/specs/rooms-spaces.md) RS-35).
- **GV-56** *Open (v0.1.1 F2).* An **Open** button sits directly above the *Legend* button, the
  same size. Click opens the folder that holds the subject's file in Explorer, with the file
  selected (as Gallery's *Reveal in Explorer*, [welcome-gallery](/specs/welcome-gallery.md) WG-64);
  right-click copies the full path of that `.json` file to the clipboard. Both give visible
  feedback beside the button (*Path copied* or the error) for about 2.5 s; its tooltip names both
  gestures. In the browser preview, where there is no file, both report that Explorer needs the
  desktop app.
- **GV-53** The **layout toggle** sits at the top-right of the graph, shows the layout it will
  switch to (tooltip *Tree layout* / *Free layout*), and is a toggle button with `aria-pressed`.
- **GV-55** *Node menu (v0.1.1 F1).* Right-click on a node (or the context-menu key / Shift+F10 on
  the focused node) MUST focus it and open a menu beside it with **the same actions, in the same
  order and with the same enabled state, as the end of the node panel** (one shared definition):
  open node: *Light it up*, *Dismiss*, *Delete*; lit or understood node: *More options*, *Add my
  own node*, *Delete*; dismissed node: *Restore*, *Delete*; the root never offers *Delete*
  ([learn-room](/specs/learn-room.md) LR-10 to LR-23). *Add my own node* and *Delete* open the
  panel's own form and confirmation dialog for that node (the panel is uncollapsed if needed).
  The menu follows the node while the view pans; Esc, a press outside it or choosing an action
  closes it and returns focus to the node; arrow keys move between items.
- **GV-57** *Search (v0.1.3).* A **search** button (magnifier, tooltip *Search · Ctrl+F*) sits left of
  the layout toggle. It, or **Ctrl+F** anywhere in Study, opens a search field in its place (the text
  selected when it was already open). The query matches, as a substring ignoring case, accents and
  repeated spaces, a node's title, hook, explanation and dialogue turns; pending bodies never match.
  The query applies after about 150 ms of no typing. With a non-empty query: matching nodes show a
  thin `--accent` ring, the others are dimmed to 30 % (route edges unchanged, GV-31), and a count
  beside the field reads *No matches*, *1 match*, *n matches*, or *k of n* once one is selected.
  **Enter** focuses the next match and **Shift+Enter** the previous one, wrapping, in tree order
  (depth first, children in creation order, GV-70), through `setFocus` (GV-80): the panel follows
  and the view pans (GV-34). Typing alone never moves the focus. **Esc** in the field, or its close
  button, clears the query, closes the field and returns focus to the focused node. The search is
  not saved and is cleared when another subject opens.
- **GV-54** Every control MUST be at least 32 px, have a tooltip and an accessible name, and not
  overlap nodes' hit areas except where the overlay sits.

# Pan, zoom, recenter

- **GV-60** Drag on the background pans; the wheel zooms about the cursor; double-click on the
  background does nothing (the PoC disables the zoom on double-click). Zoom range 0.1–3 *(the
  PoC's lower bound 0.25 is lowered so that recenter can fit 500 nodes)*.
- **GV-61** **Recenter** fits the bounding box of all nodes (including title extents) in the
  viewport with 48 px padding, scale clamped to [0.1, 1], animated over **400 ms** with an
  ease-in-out curve; **instant** under reduced motion. It also runs once when a subject opens.
- **GV-62** Below zoom 0.5 titles MAY be hidden (level of detail) while glyphs stay; the
  threshold is a tunable constant.
- **GV-63** The view transform is kept per session while the subject stays open, and is not
  persisted.

# Keyboard

Active when the graph has focus (Tab reaches the focused node; the graph is one tab stop).

- **GV-70** **Left** moves focus to the parent; **Right** to the first child (creation order);
  **Up** / **Down** to the previous / next sibling in creation order, without wrapping; at a
  boundary nothing happens. The root has no parent or siblings. This is the same in both
  layouts.
- **GV-71** **Enter** on an *open* node lights it (starts the light-up; [node-panel](/specs/node-panel.md)
  NP-30) and moves focus to the panel; on any other state it moves focus to the panel (its
  composer when present). On a *dismissed* node Enter focuses the panel, where Restore is
  offered.
- **GV-72** **Esc** closes the shortcuts overlay, a popover or a dialog first; then it cancels an edit in progress; otherwise it cancels the
  running generation of the subject. It does nothing when none applies.
- **GV-73** **`?`** opens a shortcuts overlay listing all keys of the app; Esc or `?` closes it.
  *(Amended 2026-10-16, spec workshop round 9.)* It also shows *What can I do here?* for the current
  space, the same lines as Amber's guide ([companion](/specs/companion.md) CO-2, CO-22).
- **GV-74** **Home** focuses the root.
- **GV-75** Keyboard moves update the focus, the panel and the route highlight together
  (GV-80), and pan the view if needed (GV-34).
- **GV-76** **The canonical shortcut table.** It is the one place where
  the app's keys are listed; [rooms-spaces](/specs/rooms-spaces.md), [node-panel](/specs/node-panel.md),
  [learn-room](/specs/learn-room.md) and [settings](/specs/settings.md) refer to it and do not restate it. The `?` overlay
  (GV-73) shows exactly this table.

| Keys | Works in | Action |
|---|---|---|
| Arrow keys | graph | Left: parent; Right: first child; Up / Down: previous / next sibling (GV-70) |
| Home | graph | Focus the root (GV-74) |
| Enter | graph, on the focused node | *open* node: light it up, then focus moves to the panel; *lit* or *understood* node: focus the composer; *dismissed* node: focus the panel (GV-71) |
| Ctrl+Enter | composer; an edit field | Send the message; in an edit field, save the edit |
| Esc | anywhere | Close the overlay, popover, dialog or the field's panel; else cancel the edit in progress; else cancel the running generation (GV-72) |
| Ctrl+1 / Ctrl+2 / Ctrl+3 | anywhere, any focus | Welcome / Study / Gallery; Ctrl+2 with no subject open opens the most recent one |
| Alt+A / Alt+N / Alt+D | with a text selection | *Ask about this* / *Make it a node* / *Ask Amber* (the selection popover; Alt+D from 2026-10-16, NP-54) |
| Ctrl+J | anywhere, any focus | Ask Amber: opens Amber's bubble with its field focused, or the Ask box when Amber is off ([companion](/specs/companion.md) CO-41) |
| ? | anywhere outside a text field | Show or hide the shortcuts |
| Ctrl+Shift+1 / Ctrl+Shift+2 | anywhere, any focus | Learn / Choose room, on its Welcome (RS-23, from v0.2.0) |
| Ctrl+K | anywhere, any focus | Open or close the field's panel: this subject's settings and the palette ([rooms-spaces](/specs/rooms-spaces.md) RS-15, from 2026-10-17) |
| Ctrl+, | anywhere | Open Settings |
| Ctrl+F | Study | Search the subject's nodes; in the field, Enter / Shift+Enter: next / previous match, Esc: close (GV-57) |

  Keys that belong to one control only stay in that control's spec: the Gallery grid
  ([welcome-gallery](/specs/welcome-gallery.md) WG-65), the split divider (GV-85) and the legend chip
  ([rooms-spaces](/specs/rooms-spaces.md) RS-37).

# Focus sync

- **GV-80** The focused node is the one the panel shows: `focusId` of the room visit has one
  writer, `setFocus`; the graph, the panel's breadcrumbs, children list and `node:` links, and
  the keyboard all call it. Focus survives space switches and restarts (DM-40).
- **GV-81** Deleting the focused node moves focus to its parent; dismissing it keeps focus on it.

# Split

The graph and the panel share the Study body ([node-panel](/specs/node-panel.md)).

- **GV-82** A vertical **divider** MUST be resizable by dragging. Minimum **graph width 320 px**,
  minimum **panel width 380 px**; the drag clamps to those. **Double-click** on the divider
  resets to the default of **44 %** (the panel's share of the width).
- **GV-83** The split (ratio and collapse state) MUST be **persisted app-wide**, not per
  subject, and restored at start; on window resize the ratio is kept and then clamped to the
  minimums.
- **GV-84** Either side can **collapse**: each side of the divider has a chevron button; dragging
  the divider past half of a minimum snaps that side shut. A collapsed side leaves a 28 px rail
  with a restore chevron; clicking the rail, its chevron, or double-clicking the divider
  restores the previous ratio. At least one side is always visible.
- **GV-85** The divider is a keyboard-operable `role="separator"` with `aria-valuenow`; Left /
  Right move it by 16 px, Home resets to 44 %, Enter toggles collapse of the panel.
- **GV-86** Dragging MUST not start text selection or pan, and the graph recomputes its viewport
  size while dragging (no transform jump).
- **GV-87** When the panel is collapsed and a generation streams, a small pulsing dot on its rail
  indicates activity.

# Spawn animation

Specified in words and tuned in the app; there is no design round. All values live in **one module** (`graphMotion`) as named constants
and nothing else in the code hard-codes them.

| Constant | Start value |
|---|---|
| `SPAWN_COUNT` | 3 |
| `SPAWN_STAGGER_MS` | 120 (gap after each branch finishes) |
| `SPAWN_GROW_MS` | 500, ease-out |
| `PENDING_BREATHE_OPACITY` | 0.5 ↔ 0.8 |
| `PENDING_BREATHE_PERIOD_MS` | 2400 |
| `SPAWN_REVEAL_MS` | 200 (title fade-in) |
| `SPAWN_SHRINK_MS` | 300 (surplus, cancel, error) |
| `BUSY_PULSE_PERIOD_MS` | 1800 |
| `SPAWN_PARTICLES` | 12 per arriving node |
| `SPAWN_PARTICLE_LIFE_MS` | 800 |
| `SPAWN_PARTICLE_SPEED` | 38 px/s maximum |

- **GV-90** When a light-up or *More options* starts, **3 branches** MUST grow from
  the parent one after another. Each branch draws over `SPAWN_GROW_MS`, led by a
  glowing dot at its tip; the next begins after a `SPAWN_STAGGER_MS` gap. Its pending
  circle appears when the tip arrives. Dot and branch follow live layout geometry.
- **GV-91** While waiting, pending nodes MUST breathe between the two opacities
  with the given period, including a soft light glow. The generating parent also breathes.
- **GV-92** When the options block parses, each placeholder becomes the real open node **in
  place** (same element, no jump), settles with a small light-particle burst and its
  title fades in over `SPAWN_REVEAL_MS`. A fast response finishes the branch's growth
  before the settle/reveal/burst. Surplus
  placeholders shrink back into the parent over `SPAWN_SHRINK_MS`. If more nodes arrive than
  placeholders, the extra ones grow from the parent like a placeholder with no waiting.
- **GV-93** On **cancel** or **error**, all placeholders shrink back over `SPAWN_SHRINK_MS`.
- **GV-94** These rules apply in **both layouts**. In free layout the placeholders MUST be real
  simulation bodies so the graph makes room; in tree layout the layout MUST reserve their slots
  as if they were children, relaxing when they go.
- **GV-95** The focus-route travelling light and embers are unchanged (GV-32).
  Spawn tips and completion particles are a separate effect and MUST NOT replay
  the focus-route effect. Cancellation/error MUST NOT emit completion particles.
- **GV-96** Placeholders MUST NOT be persisted, focusable, or counted in stats; they carry
  `aria-hidden`. The graph's live region announces *Lighting <title>* then *3 options ready*.

# Busy pulse

- **GV-97** For **reply** and **check** generations, which add no nodes, there MUST be **no
  placeholders**; the node itself gets a soft pulse (glow breathing at `BUSY_PULSE_PERIOD_MS`)
  while the tutor writes. The pulse stops on completion, cancel or error.
- **GV-98** The pulse applies to the node of the generation even when it is not focused, so the
  user can see which node is working. One generation runs at a time per subject; other nodes stay open for browsing and reading, with their start controls disabled and a tooltip saying why.

# Reduced motion

- **GV-100** Reduced motion is in effect when the OS `prefers-reduced-motion: reduce` is set **or**
  the app's Appearance override is on (*Follow system* by default, *Always reduce*) *(a "never
  reduce" choice is deliberately not offered)*. A change MUST take effect live and cancel
  transient animation.
- **GV-101** In reduced motion: no travelling light, particles or passing glow (RECIPE);
  placeholders appear and disappear with no growth, breathing or stagger; the busy pulse is replaced
  by a static dashed outline (the PoC's busy look); title reveal is immediate.
- **GV-102** Layout switches, recenter and pan-to-focus are instant; the free layout is
  pre-settled (run to rest before display) rather than animated.
- **GV-103** Information MUST NOT depend on motion: every state conveyed by animation (pending,
  busy) has a static equivalent.

# Performance

- **GV-110** A graph of **500 nodes** MUST pan and zoom at 60 fps on a typical laptop: pan and zoom
  change only the transform of the world layer, never per-node styles.
- **GV-111** The force simulation MUST stop when settled and wake only on graph change.
- **GV-112** If the physics cannot hold the budget (frame time over 20 ms for a second while
  settling), tunable fallbacks apply in order: simulate at half rate; hide titles under the GV-62
  threshold and skip glows; above **800 nodes** use the tree layout with a notice *Free layout
  is off for large graphs*. Tree layout is always available.

# Open

None for v0.1.0.

Related: [rooms-spaces](/specs/rooms-spaces.md), [node-panel](/specs/node-panel.md),
[welcome-gallery](/specs/welcome-gallery.md), [domain-model](/specs/domain-model.md),
[latency-masked-not-reduced](/decisions/latency-masked-not-reduced.md).
