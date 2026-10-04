---
type: Spec
title: Rooms, spaces and the app frame
description: The frame every room lives in - Room definitions, startup, header, space navigation, room accent theming, the mandatory legend, frame-level error states and window rules.
tags: [frame, rooms, spaces, header, navigation, legend, theming]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-04T19:30:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Source: spec workshop rounds 1–3 (2026-10-01/02). Agreed with the user 2026-10-02 (q-r3-review).

The frame is what stays the same when the room changes: window, header, space navigation,
settings entry, banners. A room fills the frame with its spaces. Lantern's room → space mirrors
Prism's lens → view (`prism/agent_wiki/architecture/lens-model.md`), but a room owns its spaces
outright and a space is not a filter or a zoom level
([decision](/decisions/rooms-have-spaces.md), [room replaces lens](/decisions/room-replaces-lens.md)).
Data side: [domain-model](/specs/domain-model.md). The three Learn spaces are specified in
[welcome-gallery](/specs/welcome-gallery.md) (Welcome, Gallery) and
[graph-view](/specs/graph-view.md) + [node-panel](/specs/node-panel.md) (Study).

# Definitions

| | Owns | Is not |
|---|---|---|
| **Room** | An AI role and prompts, node kinds and states, an accent, a set of spaces, a settings submenu. Built into the app, never stored. | A subject, a mode toggle, or a theme. A room cannot be "closed"; the app is always inside one. |
| **Space** | One screen layout of its room (Welcome, Study, Gallery). It shows data of the room; it holds only view state (sort, filter, split). | A tab of a document, a filter, or a different data set. Switching space never changes which subject is open. |
| **Subject** | The user's data: one JSON file with its room visits and graphs ([subject-storage](/specs/subject-storage.md)). | Part of a room's code. Rooms can read a subject, but a subject does not list rooms' behaviour. |

- **RS-1** A *Room definition* MUST provide to the frame: `id`; `name`; accent tokens (RS-30); the
  ordered list of spaces with their icons and labels; the default space (the one opened first for
  a subject: Study in Learn); a settings submenu; the prompts (system prompt, task prompts,
  versions); and the node kinds and states with their labels, glyphs and legend entries.
- **RS-2** Rooms MUST be code modules behind one interface; adding a second room MUST NOT change
  the frame, the storage format or another room (PS-3 in [product-scope](/specs/product-scope.md)).
- **RS-3** The interface MUST have these members: identity (`id`, `name`, accent tokens); `spaces`
  (each with a component, icon, label, shortcut index); `defaultSpace`; `settingsMenu` (a
  component rendered under Settings → the room's name); `prompts` (builders and versions);
  `nodeKinds` and `nodeStates` (labels, glyphs, legend rows); `statsSummary(subject)` (the
  header's compact stats text and hover); `legend` (legend rows, RS-35); and `newSubject(title,
  tone)` (creates the room visit's initial graph). The frame MUST call only these members.
- **RS-4** v0.1.0 MUST register exactly one room, Learn, with spaces Welcome, Study, Gallery in
  that order, and default space Study.
- **RS-5** There MUST be no app-level home in v0.1.0. The frame MUST NOT draw a room switcher
  (the room chip is a label, RS-12).

# Startup

- **RS-10** The app MUST open on the **Welcome of the last used room**. The last used room id is
  stored app-side in the OS config directory ([settings](/specs/settings.md)). With one room it is
  always Learn; if the stored id is unknown the frame MUST fall back to Learn.
- **RS-11** On first run there are no subjects: Welcome shows its first-run state
  ([welcome-gallery](/specs/welcome-gallery.md) WG-12) and the Gallery and Study icons are
  disabled until a subject exists.

# Header

One bar across the full window width, below the native OS title bar. It acts on the whole app and
the open subject; it is rarely touched. The stats stay secondary.

- **RS-12** The header MUST contain, left to right:
  1. **Lantern mark**: leads to the current room's Welcome. Tooltip *Welcome*.
  2. **Room chip**: the room name (*Learn*) in the room accent. A label with no action in
     v0.1.0; it becomes the room switcher when a second room ships.
  3. **Space navigation** (RS-20): icon buttons for the room's spaces, the active one marked.
  4. **Subject title**: the open subject's title, truncated with an ellipsis, full text in the
     tooltip. Absent when no subject is open (Welcome and Gallery before any choice).
  5. **Compact stats**: *12 lit · 4 understood · 9 dark*. Hover shows the token total
     (*Tokens spent: 48.3k in / 21.0k out*), computed as in WG-31. Hidden with no subject open.
  6. **Settings gear**: opens Settings; always visible; never hidden by narrow widths.
- **RS-13** The three numbers and the token total MUST use the single definition of
  [welcome-gallery](/specs/welcome-gallery.md) WG-30 and WG-31 (*lit* includes understood, *dark* is the open nodes,
  dismissed nodes are not counted), the same as the Gallery card. This spec does not restate it.
- **RS-14** The stats MUST be rendered in `--ink-mute` at 13 px so that they stay secondary; the
  token total MUST be omitted when "Show token stats" is off (Appearance setting).
- **RS-15** *Subject menu.* Clicking the title MUST open a compact menu
  next to it holding, for the open subject: **Rename**; **Tone** (ELI5, Curious, Student,
  Engineer, Expert, Custom… with a free-text field); **Direction** (v0.1.1, RS-19); **Model** (opus, sonnet, haiku, or a free-text
  id); **Effort** (low, medium, high, xhigh, max). The menu is a pop-over anchored under the title,
  closed by Esc, a click outside or choosing Rename (which turns the title into an input;
  Enter saves, Esc cancels, an empty title is rejected).
- **RS-16** Changing tone, direction, model or effort in the menu MUST affect new generations only and MUST
  show a toast *Applies to your next message* once per session. It MUST NOT trigger a
  generation. The values are stored on the room visit (`tone`, `model`, effort; DM-40).
- **RS-19** *(v0.1.1)* **Direction** in the subject menu MUST be a multi-line text field holding the subject's
  direction ([domain-model](/specs/domain-model.md) DM-41), with the Welcome placeholder *Where should it start, or
  head? (optional)* and the 500-character limit and counter of [welcome-gallery](/specs/welcome-gallery.md) WG-9.
  It is saved when the field loses focus (an over-limit value is not saved and shows the reason); emptying it
  removes the direction. RS-16 and RS-17 apply.
- **RS-17** While a generation runs, the menu MUST stay usable; the running call keeps the values
  it started with.
- **RS-18** Narrow-width collapse order (window ≥ 1024 px): stats lose the token hover first,
  then the stats text hides, then the room chip shrinks to its first letter. The mark, space
  navigation, title and gear never disappear.

# Space navigation

Space navigation is not necessarily tabs; it must be intuitive.

- **RS-20** Header navigation MUST show one icon button per space: Welcome (lantern/home glyph),
  Study (graph glyph), Gallery (grid glyph). Each has a tooltip with its name and shortcut. The
  current space is marked with the room accent and `aria-current="page"`.
- **RS-21** Study MUST also hold, at the **top-left of the graph view**, a Welcome icon (taking
  the place of the PoC's "reset graph" icon) and, next to it, a Gallery icon
  ([graph-view](/specs/graph-view.md) GV-50). These are shortcuts to the same spaces; they MUST
  behave exactly like the header icons.
- **RS-22** Reachability: Welcome → Gallery via *Browse all*; Welcome → Study by submitting a
  subject or choosing a recent card; Gallery → Study by double-click or Enter on a card (a single click only selects it and shows its actions and detailed stats, [welcome-gallery](/specs/welcome-gallery.md) WG-60, WG-68); Study →
  Welcome and Gallery by the icons; Gallery → Welcome by the header icon or the Lantern mark.
  Every space MUST be reachable from every other in at most one action.
- **RS-23** Space shortcuts (Ctrl+1 Welcome, Ctrl+2 Study, Ctrl+3 Gallery) are listed in the
  canonical shortcut table of [graph-view](/specs/graph-view.md) GV-76, which this spec does not
  restate. They MUST work from any focus, including text inputs. Ctrl+2 with no open subject
  opens the most recently opened subject (from the app-side recents, [subject-storage](/specs/subject-storage.md)
  ST-6), or does nothing when there is none.
- **RS-24** State kept across switching: the open subject and its focused node (`focusId`, DM-40)
  are kept, so returning to Study shows the same node; the graph view transform and layout are
  kept for the session; the Gallery **sort and filter text are kept for the session** (not
  persisted across restarts); the Study split position is persisted app-wide
  ([graph-view](/specs/graph-view.md) GV-83). Welcome's subject field draft is cleared on leaving.
- **RS-25** A running generation MUST continue when the user switches space; the busy state is
  visible in the header (the title shows a small pulsing dot) and in Study on return.
- **RS-26** Opening a different subject while another has a running generation MUST NOT cancel
  it; the generation finishes and saves to its own subject.

# Room accent theming

- **RS-30** Each room MUST define its palette as CSS custom properties applied on `:root`, scoped
  by a `data-room="<id>"` attribute on `<html>`; switching room swaps the attribute. Shared
  structure (typography, spacing, radii, layout) MUST NOT vary by room.
- **RS-31** The mandatory token set is: `--bg --surface --surface-2 --ink --ink-mute --line
  --accent --accent-ink --focus`; plus node tokens `--node-open --node-lit --node-understood
  --glow-near --glow-far --path-muted`; plus `--code`. Learn's values are the final learning-node
  design, binding: `--bg #101827`, `--surface #172132`, `--surface-2 #302b2a`, `--ink #f3e9dc`,
  `--ink-mute #aeb3bf`, `--line #3b4558`, `--accent #e8b66e`, `--accent-ink #211b14`,
  `--focus #ffe0ab`, `--node-open #969ca7`, `--node-lit #ffe1aa`, `--node-understood #e8b66e`,
  `--glow-near rgba(255,199,118,.34)`, `--glow-far rgba(255,182,88,.15)`, `--path-muted #6f5c42`
  (`agent_design/learningnode/RECIPE.md`).
- **RS-32** Components MUST read colours only from tokens; a raw hex outside the room palettes
  is a defect. Status colours not in the token set (error) MUST be tokens too (`--error`,
  `#d86a5a`, text `#f0a598`, as in the PoC).
- **RS-33** The look is a calm, warm light in a peaceful place: no animation runs in the frame
  except hover/press feedback and the pulses of RS-25; the frame honours the reduced-motion rules
  of [graph-view](/specs/graph-view.md) GV-100 to GV-103.

# The legend

- **RS-35** The legend is **mandatory**. It MUST be a small overlay in a corner of the graph
  (bottom-left), collapsible to a single *Legend* chip, and MUST NOT be removable by any setting
  or shortcut. Its collapsed state is remembered app-wide; its default is expanded.
- **RS-36** Content (rows come from the room definition, RS-3): the node states **open**, **lit**,
  **understood: demonstrated**, **understood: self-declared**, **dismissed**; the **branch** kind
  glyph (question diamond); and the **text-link line** (faint dotted) with its on/off toggle
  ([graph-view](/specs/graph-view.md) GV-41). Each row draws the real node glyph at 14 px, not an
  approximation.
- **RS-37** The legend MUST NOT intercept pan/drag on the graph outside its own box. Keyboard:
  the chip is focusable, Enter toggles it.

# Frame-level error and empty states

- **RS-40** *CLI missing or not logged in.* When the Provider status ([settings](/specs/settings.md))
  is not ready, the frame MUST show a non-modal banner under the header: *The Claude Code CLI is
  not ready.* followed by the clear **step-by-step instructions** for the current cause (not
  installed: the install link and steps; not signed in: how to sign in to Claude Code), a
  *Check again* button and a link that opens Settings → Provider, which repeats them
  ([settings](/specs/settings.md) SE-47, [inference-provider](/specs/inference-provider.md) IP-44). Lantern does
  not open the sign-in for the user in v0.1.0 ([decision](/decisions/cli-signin-instructions-only.md)). The
  banner persists until the status becomes ready; browsing, reading and editing stay available,
  and every control that would start a generation is disabled with the tooltip *Claude CLI not
  ready*. No terminal command needs to be typed by the user beyond the one-time Claude Code sign-in the instructions describe.
- **RS-41** *Library folder missing.* If the configured library folder does not exist or is not
  writable at startup, the frame MUST show a banner *Your library folder is unavailable:
  <path>.* with actions **Choose another folder**, **Retry**, and **Create it** (when merely
  absent). Until resolved, Welcome shows no recent cards and Gallery shows its empty state with
  the same message; creating a subject is disabled. The app MUST NOT silently create a different
  folder.
- **RS-42** Banners stack at most two high; each has a dismiss control that hides it until the
  condition changes, and never covers the header.
- **RS-43** A subject file that fails to parse MUST appear in the Gallery as a card marked
  *Cannot be read* with only *Reveal in Explorer* ([subject-storage](/specs/subject-storage.md)).

# Window

- **RS-50** Minimum window size 1024×640 px; the layout MUST NOT overflow horizontally at 1024.
- **RS-51** Size and position MUST be remembered app-side and restored at start; a restored
  position outside all connected monitors MUST fall back to centred on the primary one; a
  maximised window restores maximised.
- **RS-52** Interface language is English; every string comes from one module
  (q-ui-language).

# Open

None for v0.1.0.

Related: [welcome-gallery](/specs/welcome-gallery.md), [graph-view](/specs/graph-view.md),
[node-panel](/specs/node-panel.md), [product-scope](/specs/product-scope.md),
[domain-model](/specs/domain-model.md), [rooms-have-spaces](/decisions/rooms-have-spaces.md).
