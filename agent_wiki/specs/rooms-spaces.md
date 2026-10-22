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
  tone)` (creates the room visit's initial graph). The frame MUST call only these members. *(Amended 2026-10-13, v0.2.0 A2.)* Also: `validate(visit)` (the room's values, DM-66), `summarize(visitSummary)` (its Welcome and Gallery stats from the storage summary, ST-7). *(Amended 2026-10-13, v0.2.0 A3.)* And: `settings` (its settings group's defaults and validation, SE-12), `defaultTone(settings)`, `applySettings(session, settings)` (settings that reach open sessions), `fakeProvider(delay, error)` (IP-71, per room in the browser build), and `subjectMenu` (a component for the room's own fields in the subject menu, RS-15/RS-19: Learn's tone and direction; the frame keeps title, model and effort). *(Amended 2026-10-16, spec workshop round 9.)* And for the companion ([companion](/specs/companion.md) CO-23): `companion` (the room's tips, its *What can I do here?* lines per space, and each space's bottom resting positions, defaulting to the two bottom corners). The room list is `app/src/rooms/index.ts`; development builds opened with `?sampleRoom` add a sample room to test the frame with a third room, and release builds do not contain it.
- **RS-4** v0.1.0 MUST register exactly one room, Learn, with spaces Welcome, Study, Gallery in
  that order, and default space Study. *(Amended 2026-10-12, round 5, for v0.2.0.)* The rooms are registered in one list, in this
  order: Learn, then [Choose](/specs/choose-room.md). The frame MUST NOT name a room anywhere else
  (q-r5-node-model, RS-2). The first release of v0.2.0 is the room-generic frame with Learn alone
  and unchanged; Choose follows (q-r5-release).
- **RS-5** There MUST be no app-level home in v0.1.0. The frame MUST NOT draw a room switcher
  (the room chip is a label, RS-12). *(Amended 2026-10-12, round 5, for v0.2.0.)* Still no app-level home; one may come if a need
  shows up ([decision](/decisions/spaces-per-room-no-home.md)). With two or more rooms registered
  the room chip is the switcher (RS-12).

# Startup

- **RS-10** The app MUST open on the **Welcome of the last used room**. The last used room id is
  stored app-side in the OS config directory ([settings](/specs/settings.md)). With one room it is
  always Learn; if the stored id is unknown the frame MUST fall back to Learn. *(Amended 2026-10-12, round 5, for v0.2.0.)* Confirmed
  with several rooms: the app opens on that room's **Welcome**, not inside a subject (q-r5-open-space);
  the fallback is the first registered room.
- **RS-11** On first run there are no subjects: Welcome shows its first-run state
  ([welcome-gallery](/specs/welcome-gallery.md) WG-12) and the Gallery and Study icons are
  disabled until a subject exists.

# Header

One bar across the full window width. It acts on the whole app and the open subject; it is rarely
touched. The stats stay secondary. The header is the window's title bar: the window has no system
frame, empty header space drags the window, and a double-click on it maximises or restores.
*(Amended 2026-10-16 by the user: frameless window.)* A strip along the top of the bar, above its
controls, drags the window too; the top 3 px stay the resize edge. *(Amended 2026-10-17 by the user: the accepted top bar, `agent_design/top-bar` r005-02.)*

- **RS-12** The header MUST contain, left to right. *(Amended 2026-10-17 by the user: the accepted top bar, `agent_design/top-bar` r005-02.)* The measures, colours and
  timings are the design's `RECIPE.md`.
  1. **Lantern mark**: leads to the current room's Welcome. Tooltip *Welcome*. Drawn with the
     ember favicon of the accepted identity release `lantern-identity-v0.2` (RS-53), not a text glyph.
  2. **The capsule**: one outlined group (never a row of boxed buttons) holding, in order:
     - the **room name** in ink, with a caret. With two or more rooms, clicking it opens a small menu
       of the rooms, each with its name and its lantern colour, the current one marked; choosing one
       opens that room's Welcome (q-r5-switch). Each room keeps its own open subject for the
       session, so coming back to a room's graph space shows it again. *(Room switcher amended
       2026-10-12, round 5, for v0.2.0; the name was in the room accent until 2026-10-17.)* With one
       room it is a label;
     - the **spaces** (RS-20);
     - **settings** (gear glyph): opens Settings; always visible; never hidden by narrow widths;
     - **Ask**, while Amber is off (below).
  3. **The field**, centred in the window: the open subject's title (truncated with an ellipsis, full
     text in the tooltip), or *Open a subject…* when none is open, with *Ctrl+K* at its right. A
     click on it, or Ctrl+K, opens the field's panel (RS-15). While a generation runs, the pulsing
     busy dot of RS-25 sits after the title.
  4. **Compact stats**, just before the window controls: *12 lit · 4 understood · 9 dark*. Hover shows
     the token total (*Tokens spent: 48.3k in / 21.0k out*), computed as in WG-31. Hidden with no
     subject open.
  5. **Window controls**: minimise, maximise/restore and close, Windows-style, flush with the right
     edge. Hovering maximise opens the Windows 11 Snap Layouts, only while the window is in front.
     Close saves first, as the system close did (the close-request flush). The controls fade while
     the window is in the background. *(Amended 2026-10-16 by the user: frameless window.)*

  *(Amended 2026-10-16, spec workshop round 9.)* While Amber is off, an **Ask** button sits just
  after the gear, as the capsule's last segment, styled like the others, and opens Ask Amber ([companion](/specs/companion.md) CO-41). With the accepted top
  bar (`agent_design/top-bar`, r005-02) it is the capsule's last segment, after settings *(user,
  2026-10-17)*. Its menu (right-click, the context-menu key or Shift+F10) offers *Bring Amber back*, which
  turns *Show Amber* on (CO-4; the user, 2026-10-17). While Amber is on, there is no Ask button,
  its rope is tied to the header's bottom edge and it hangs below it (CO-10, CO-11); the header's
  controls are never covered.
- **RS-53** *Identity assets.* The header mark (RS-12) MUST use `ember-on-dark-32.svg` from
  `agent_identity/projects/lantern/final/lantern-identity-v0.2/exports/favicon/`, shown at 26 px
  (28 px until the top bar of 2026-10-17).
  *(Amended 2026-10-16 by the user.)* While the app runs, the flame takes the room accent
  (`--accent`), in the header mark and in the window and taskbar icon (drawn from the same SVG); the
  ink frame is unchanged. The installer and exe icons keep the release's amber flame. The identity
  release records this exception. The Windows app icon MUST be built from
  the same release: ember favicon PNGs for 16, 24, 32 and 48 px and `mark-on-dark` PNGs for 64 and
  256 px, each size taken from its own export rather than downscaled from one image. A new identity
  release replaces these files together; the release's `IDENTITY.md` is the source of the rules.
- **RS-13** The three numbers and the token total MUST use the single definition of
  [welcome-gallery](/specs/welcome-gallery.md) WG-30 and WG-31 (*lit* includes understood, *dark* is the open nodes,
  dismissed nodes are not counted), the same as the Gallery card. This spec does not restate it.
- **RS-14** The stats MUST be rendered in `--ink-mute` at 12 px (13 px until the top bar of 2026-10-17) so that they stay secondary; the
  token total MUST be omitted when "Show token stats" is off (Appearance setting).
- **RS-15** *The field's panel.* *(Amended 2026-10-17 by the user: the accepted top bar, `agent_design/top-bar` r005-02.)* Clicking the field (RS-12) or Ctrl+K MUST open
  one panel, centred under the field just below the bar, in two parts:
  1. **This subject** (the subject menu), with the open subject only: **Title**, renamed in place
     (Enter saves, Esc cancels, an empty title is rejected); **Tone** (ELI5, Curious, Student,
     Engineer, Expert, Custom… with a free-text field); **Direction** (v0.1.1, RS-19); **Model** (the
     model list of [settings](/specs/settings.md) SE-48, or a free-text id); **Effort** (low, medium,
     high, xhigh, max).
  2. **The palette**: a filter field; this room's other subjects, the most recently opened first
     (rooms keep their own subjects, RS-5); the rooms; Settings. Typing filters the list, the arrow
     keys move through it, Enter opens the selection, as a click does.
  With no subject open, only the palette shows. The panel closes on Esc, a second click on the
  field, a press anywhere outside it, or a choice in the palette.
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
  then the stats text hides, then the space words fold to their glyphs, then the field narrows
  (34 % to 28 % of the width). The mark, the whole capsule (room name, spaces, settings, Ask), the
  field and the window controls never disappear; the room name stays whole. *(Amended 2026-10-17 by the user: the accepted top bar, `agent_design/top-bar` r005-02.)*

# Space navigation

Space navigation is not necessarily tabs; it must be intuitive.

- **RS-20** Header navigation MUST show one entry per space in the capsule (RS-12), each a glyph
  and its word, never a boxed button: Welcome (lantern/home glyph), Study (graph glyph), Gallery
  (grid glyph), and each room's own. Each has a tooltip with its name and shortcut. The current
  space is in ink with a 1 px ink underline and an accent dot, and `aria-current="page"`; the others
  are in `--ink-mute`. On a switch the underline and the dot glide to the new space (240 ms); with
  reduced motion they move at once. *(Amended 2026-10-17 by the user: the accepted top bar, `agent_design/top-bar` r005-02.)*
- **RS-21** *Removed 2026-10-05 (v0.1.1 I1).* The graph view no longer repeats the Welcome and
  Gallery icons ([graph-view](/specs/graph-view.md) GV-50); the header icons (RS-20) are the
  only ones.
- **RS-22** Reachability: Welcome → Gallery via *Browse all*; Welcome → Study by submitting a
  subject or choosing a recent card; Gallery → Study by double-click or Enter on a card (a single click only selects it and shows its actions and detailed stats, [welcome-gallery](/specs/welcome-gallery.md) WG-60, WG-68); Study →
  Welcome and Gallery by the header icons; Gallery → Welcome by the header icon or the Lantern mark.
  Every space MUST be reachable from every other in at most one action.
- **RS-23** Space shortcuts (Ctrl+1 Welcome, Ctrl+2 Study, Ctrl+3 Gallery) are listed in the
  canonical shortcut table of [graph-view](/specs/graph-view.md) GV-76, which this spec does not
  restate. They MUST work from any focus, including text inputs. *(Amended 2026-10-12, round 5, for v0.2.0.)* Room shortcuts **Ctrl+Shift+1**, **Ctrl+Shift+2**… follow the
  registration order (RS-4) and open that room's Welcome (q-r5-switch); they are added to GV-76.
  The shortcuts help lists one Ctrl+Shift line per room, built from the room list (amended 2026-10-16).
  Ctrl+1/2/3 address the current room's spaces in its own order (Ctrl+4 and on for a room with more spaces, such as
  Choose's Gallery; v0.2.0 B4). Ctrl+2 with no open subject
  opens the most recently opened subject (from the app-side recents, [subject-storage](/specs/subject-storage.md)
  ST-6), or does nothing when there is none.
- **RS-24** State kept across switching: the open subject and its focused node (`focusId`, DM-40)
  are kept, so returning to Study shows the same node; the graph view transform and layout are
  kept for the session; the Gallery **sort and filter text are kept for the session** (not
  persisted across restarts); the Study split position is persisted app-wide
  ([graph-view](/specs/graph-view.md) GV-83). Welcome's subject field draft is cleared on leaving.
- **RS-25** A running generation MUST continue when the user switches space; the busy state is
  visible in the header (the field shows a small pulsing dot after the title, RS-12) and in Study on return.
- **RS-26** Opening a different subject while another has a running generation MUST NOT cancel
  it; the generation finishes and saves to its own subject.

# Room accent theming

- **RS-30** Each room MUST define its palette as CSS custom properties applied on `:root`, scoped
  by a `data-room="<id>"` attribute on `<html>`; switching room swaps the attribute. Shared
  structure (typography, spacing, radii, layout) MUST NOT vary by room. *(Amended 2026-10-16 by the
  user.)* On a room switch the tokens that differ between rooms and the backdrop crossfade over
  0.45 s (registered colour properties); with reduced motion they change at once. Launch never fades.
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
  except hover/press feedback, the pulses of RS-25, the ambient backdrop of RS-34 and the companion
  Amber ([companion](/specs/companion.md): its gestures and its living flame); the frame
  honours the reduced-motion rules of [graph-view](/specs/graph-view.md) GV-100 to GV-103.
  *Amended 2026-10-08 by the user to admit the backdrop, and 2026-10-16 (spec workshop round 8) to
  admit the companion.*
- **RS-34** *Backdrop.* Behind every space the frame draws one ambient layer, the final `backdrop`
  design (`agent_design/backdrop/RECIPE.md`, r005-03 *Calm orbits, amber only*): five soft lights
  orbit slowly (52–120 s per turn) around an anchor set per space, and fine motes drift upward,
  visible only where light falls. Its colours come only from the room tokens (`--bg`, `--accent`,
  `--node-lit`, `--glow-far`, `--path-muted`, `--line`, `--ink-mute`, and `--code` for the
  vignette), so another room re-tints it. It reacts gently to the space (each has its own anchor
  and strength, eased over about 1.5 s), the pointer (a faint lantern pool and a slight
  parallax), graph pan and zoom (parallax), and a node becoming lit (a soft warm pool for about
  5 s). The header, the Study panel and divider, the graph's controls, the Gallery cards and
  toolbar controls, and thumbnails are frosted glass (`--surface` at 55 % over a 20 px blur, with
  `--ink-mute` hairlines at 16 %) so the lights pass behind them. The backdrop never intercepts
  input, draws at most 30 frames per second and stops while the window is hidden. In reduced
  motion (GV-100) it is one still frame with no pointer, pan or lit-node reaction. *Appearance →
  Backdrop* off ([settings](/specs/settings.md)) removes it: plain `--bg` and solid surfaces.

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
- **RS-54** *(2026-10-16, by the user.)* The window title is *Lantern · <Room>*, shown in Alt-Tab
  and the taskbar. The window's own background is the room `--bg` (`#101827`), so launch never
  flashes white.

# Open

None for v0.1.0. For v0.2.0: whether the room menu shows a room that has no subject yet the same
way (assumed yes).

Related: [welcome-gallery](/specs/welcome-gallery.md), [graph-view](/specs/graph-view.md),
[node-panel](/specs/node-panel.md), [product-scope](/specs/product-scope.md),
[domain-model](/specs/domain-model.md), [rooms-have-spaces](/decisions/rooms-have-spaces.md).
