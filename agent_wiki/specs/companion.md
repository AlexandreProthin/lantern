---
type: Spec
title: Companion
description: How Amber, the little lantern of the identity, lives in the app - hanging from the header and moved by hand, resting positions, a bubble that keeps clear of the panel and tools, tips, the guide, greetings, rare nudges, keeping you company during a generation, Ask Amber (a temporary chat and a selection action on Haiku 5.5), gestures, reactions and motions, calm in Study, reduced motion, and how it is turned off without losing any feature.
tags: [companion, amber, identity, frame, settings]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-17T16:00:00Z }
verified: { by: "human:alex", at: 2026-10-16T22:45:00Z }
---

Opened 2026-10-16 from the [backlog](/plans/backlog.md) entry *Companion behaviour spec*. The
companion is the animated actor of the identity release `lantern-identity-v0.2`
(`agent_identity/projects/lantern/final/lantern-identity-v0.2/`: IDENTITY.md for the motion rules,
IMPLEMENTATION.md for the runtime API) under the identity contract
(`agent_identity/projects/lantern/CONTRACT-v2.md`, clauses C07 to C10 and C13). Rules marked
*(user)* were given when the workshop opened; *(r8)* and *(r9)* were settled in spec workshop rounds 8
and 9, the same day. Every rule here is in the first version (r9: nothing was left for later).

# Name

- **CO-0** The companion is called **Amber** in the interface (labels, menu, *Ask Amber*). *(r8)*

# Optional, never required

- **CO-1** Amber MUST be optional: *Settings → Companion → Show Amber* (on by default) turns it off,
  and then it shows up nowhere. *(user; section r9)*
- **CO-2** No feature may depend on Amber. Everything it gives access to MUST stay reachable and working
  when Amber is off, through its own entry point; this holds for any present or future feature.
  *(user; r8)* The entry points without Amber are:
  - tips and the guide: the guide's list is also under *?* (the shortcuts overlay gains a
    *What can I do here?* part for the current space); tips have no other entry and are not needed;
  - Ask Amber: **Ctrl+J**, and an **Ask** button in the header's capsule, after settings, shown only
    while Amber is off (CO-41);
  - Ask Amber on a selection: the selection popover's button and **Alt+D** (CO-45);
  - release notes: the update notice's link to the release page (UP-13);
  - the generation state: the busy state the app shows today.
- **CO-3** Amber MUST never be the only place a piece of information or an action appears. *(r8)*
- **CO-4** *Hide* in Amber's menu turns the same setting off and says, in a toast, where to turn it back
  on. Amber comes back only when the user asks, never on its own (C09): from Settings, or from the menu of the
  capsule's *Ask* button (right-click, the context-menu key or Shift+F10), whose one item is *Bring Amber back*.
  *(r8; the menu added by the user, 2026-10-17, after acceptance)*
- **CO-5** Amber never speaks or moves unless the user did something: a click, hover, grab, question,
  a generation the user started, or opening the app (the greeting, CO-30). *(r8, r9)*
  *(Amended 2026-11-17.)* Two exceptions, both rare and both following the user's own work: a room's nudge
  (CO-37 to CO-39) after a quiet moment, and the reactions of CO-59 (a flare, a glance or a look when the user
  changes the subject, a doze after a long idle).

# Where it lives

- **CO-10** By default Amber **hangs from the header** by its loop, on a rope, on the right side.
  *(r8)* *(Amended 2026-11-17.)* Unless the user moved it in that space, it hangs at the **rightmost position
  clear of what the space keeps uncovered** (its room's `companion.avoid`, CO-20): in Study and Choose's
  Survey, the right of the graph, left of the graph's tools and the reading panel; where nothing is clear
  (a phone), at the rightmost position as before.
  *(Amended 2026-11-18.)* On a **phone** (NW-40) the two-row header leaves no room to hang over the graph:
  unless moved there, Amber **rests** by default, on the rightmost resting position whose box is clear of what
  the space keeps uncovered (in Study and the Survey, the bottom right of the graph, above the zoom buttons).
  While the panel sheet covers the space (three quarters of it or more), Amber is not drawn; it comes back to
  its spot when the sheet closes.
- **CO-11** Hanging, Amber sits at one of **10 predefined positions**, equally spaced along the header's
  width; it snaps to the nearest one and never hangs over the window controls. The rope is 0 to 160 px
  long. *(r9)*
  *(Amended 2026-11-18.)* The rope ties on the header's **bottom line as laid out**, measured (56 px on the
  desktop, the two-row header's on a phone): a hanging Amber is never drawn under the header nor over its
  controls, and a tap on it reaches it.
- **CO-12** The user can **grab Amber and move it**. While it is dragged within the top quarter of the
  window height, the rope extends and retracts to follow it until it snaps back to hanging; let go
  there, it settles with a simulated swing. The rope is drawn and simulated, never a straight static
  line. *(r8, r9)*
  *(Amended 2026-11-18.)* Held, Amber stays under the measured header and inside the window.
- **CO-13** Amber can also rest at the **bottom**. Each space gets its bottom resting positions from its
  room definition (RS-3); the default is the two bottom corners of the space. Study has three: left and
  right of the graph view, and the bottom right of the reading panel. *(r8, r9)*
- **CO-14** While Amber is grabbed, the resting positions are hinted. Dropped away from one, Amber
  **flies** (*heat and lift*) or **falls** (*descent and landing*, landing on its feet smoothly) to the
  nearest. *(r8, r9)*
- **CO-15** Its spot is remembered **per space** and kept across restarts, in the app state file
  (SE-50). *(r9)* *(Amended 2026-11-18.)* A phone layout keeps its own spot per space (`learn/study:phone`),
  apart from the desktop's, since a paired phone shares the desktop's state file.
- **CO-16** Amber's menu has **Move to…**, listing the hanging and resting positions of the current
  space, with the same result as dragging. *(r9)*
- **CO-17** Clicks outside Amber's drawn shape and rope pass through to what is underneath; it never
  blocks a control, and popovers and dialogs draw above it. *(r9)*
- *Agreed 2026-10-17 (v0.4.0 slice 6), on CO-11 to CO-16:* Choose's Survey has Study's three resting positions
  (the same graph and panel frame). Each resting position sits just above the controls in its corner (the graph's
  legend and *Open*, its zoom buttons, the panel's composer). Settled, the rope hangs straight; it bows and moves
  while Amber moves. A hanging spot keeps the rope length it was dropped at; *Move to…* uses the default length. A
  throw is a gentle push at most, and a swing settles within 6 s. Esc while holding Amber puts it back. Flights
  arc and falls accelerate. The bubble and the menu open above a resting Amber and under a hanging one.
- *Added 2026-10-17 by the user, after seeing the motions (v0.4.0 slice 7):* Amber can be grabbed while it swings or
  flies, and is held where it is; a move need not finish first. After landing, or after its few steps in, Amber folds
  its feet in and sits on its base: resting is sitting, not standing (amends CO-14's "landing on its feet").

# The bubble

- **CO-20** A click on Amber (or Enter on it) opens its **speech bubble**: a **tip**, then *Next tip* and
  *What can I do here?* under it, and an **Ask Amber** field at the bottom (Enter asks). Esc or a click
  outside closes it. *(r9)*
  *(Amended 2026-11-17.)* The bubble, the greeting and every line Amber says **never cover the reading
  panel, the graph's tools (layout and zoom buttons, the legend and *Open*) or Choose's rail**: each room
  lists them per space (`companion.avoid`). The bubble opens under a hanging Amber (above a resting one),
  slid sideways if needed; else **beside** it, level with it, its tail on that side; else at the clear place
  nearest to Amber. Its real height is measured, and the header's height is an input of the placement (56 px
  today). Phone widths keep the previous placement (not solved there).
  *(Amended 2026-11-18.)* The header's height is measured (two rows on a phone). On a phone the bubble is at
  most the screen's width less 8 px on each side (the greeting too) and, Amber resting above the zoom
  buttons, opens above it, clear of the graph tools.
- **CO-21** **Tips** are predefined, never generated, written in the strings module (PQ-4). Each click
  of *Next tip*, or each new opening, shows the next one, tips not yet seen first; the seen ones are
  remembered in the app state file. *(user; r8)*
  *(Amended 2026-11-17.)* *Settings → Companion → Tips and nudges* (on by default) turns tips and nudges
  (CO-37) off: the bubble then opens on *What can I do here?* without *Next tip*, and no nudge is said.
- **CO-22** **What can I do here?** replaces the tip with a short predefined list for the current space,
  each line naming an action and its key. *(user; r8)*
- **CO-23** Each room contributes its own tips, guide entries and bottom resting positions through the
  room definition, as it does its Settings section (SE-12). *(r8, r9)*

# Greetings

- **CO-30** At each launch Amber greets the user with **one short line** in its bubble, from a small
  predefined pool, which fades after about **6 seconds**. Hovering the bubble pauses the timer. The
  first launch after a fresh install has its own line. *(r8, r9)*
  *Agreed 2026-10-17 (slice 8):* the launch line never repeats the previous launch's. With Amber off at
  launch nothing is said and nothing counts as greeted, so a pending update's notes wait for the next
  launch with Amber on.
- **CO-31** The first launch **after an update** shows the **release notes** in the bubble, taken from
  the release's `notes` (`latest.json`, UP-42). Long notes are cut, and a click expands them to the
  full text. A link to the release page ends them. Like every greeting, hovering pauses the fade.
  *(r9; amends UP-13 for this bubble only)*
  *Agreed 2026-10-17 (slice 8):* the notes are kept when *Install* is pressed and cut at a word near 280
  characters; the bubble stays 6 s plus 30 ms per character shown (at most 15 s), and at least 15 s after
  *Show all*. An update from a version older than Amber (subjects exist, no version saved) gets the update
  line and the link without notes.
- **CO-32** A greeting waits while a frame banner is up (RS-40, RS-41), so it never covers a real
  problem. *(r9)*

# Nudges

- **CO-37** *(Added 2026-11-17.)* A room may give Amber a few **nudges**: rare lines with a real role, each a
  rule on the open subject and a predefined line (`companion.nudges`), never generated. Learn, in Study:
  *Three nodes lit, none tested yet. **Test me** asks you a question about the one you're reading.* (three
  or more lit, no *Test me* asked, none demonstrated). Choose, in the Survey: *Two needs are still
  unanswered, so a recommendation would have to guess them. Answer them in the panel.* (two or more open
  needs once products are shortlisted, chosen, searched for or recommended); in Compare: *Six cells in
  Compare are still empty. **Fill Compare** looks them up.* (three or more empty cells). The count is
  written as a word up to ten. A nudge shows in Amber's say-bubble with a *Dismiss* button, fades after
  15 s (hovering pauses it), and goes at once when its rule stops holding (the user did it) or the space
  or subject changes. The frame says when; the room says what (rooms-spaces RS-3).
- **CO-38** *(Added 2026-11-17.)* **Rate limits.** At most **one nudge per opening of a subject**, and at most
  one in 10 minutes. Never while a generation runs, never while the user types (a key in the last 8 s, or
  a field with text in it), never while Amber's bubble or menu is open, it is saying something else, it is
  moving or dozing; it waits for 8 s without a change to the subject.
- **CO-39** *(Added 2026-11-17.)* A nudge said (or dismissed) is **seen**: remembered per rule and subject in
  the app state file (`seenNudges`, the last 200, SE-50) and never said again for that subject. Off with
  *Tips and nudges* (CO-21) or with Amber.

# Keeping you company during a generation

- **CO-35** While a generation the user started is waiting for its first words, Amber plays a calm
  **working** motion (it tends its flame) and its bubble shows a short line saying what is happening
  (*Lighting up Tides…*, *Looking for products…*), from the strings module. *(r8, r9)*
- **CO-36** It stops when the text starts to stream: the user is reading again (C10). The busy state
  the app already shows stays as it is (CO-3). *(r9)*
- *Agreed 2026-10-17 (slice 8):* the waiting line wins over a greeting, which shows once the text streams.
  It is for the open subject of the current room, and only for tasks that have a line of their own (the
  room's `companion.waiting`): no line for an answer to *Test me* (a reply) nor for Welcome's subject
  ideas (Welcome already says so); Choose's *more* uses *Looking for more directions…*.

# Ask Amber

- **CO-40** **Ask Amber** is a temporary chat answered by Amber's own model calls. Only Ask Amber calls
  the model: tips, the guide, greetings and the waiting lines are predefined. *(r8, r9)*
- **CO-41** It opens from the bubble's field, from **Ctrl+J** anywhere (with Amber on: the bubble with the
  field focused), and, while Amber is off, from an **Ask** button in the header (RS-12): with the top bar of
  `agent_design/top-bar` (r005-02), it is the capsule's last segment, after settings *(user,
  2026-10-17)*. With Amber off
  the same box opens on its own, with no character beside it. *(r9)*
- **CO-42** **One call per question.** Amber's reply first names, silently, what the question is about:
  the **app**, the **current subject**, or a **general** question; then answers in the way the prompt
  sets for that category. The category is not shown; a **thinking** motion runs until the answer starts
  streaming. *(r8: the user's two-step idea; r9: in one call)*
- **CO-43** **Context.** Every call is sent the three category guides, the app's help (tips, the guide
  lists and the shortcut table, GV-76), and, when a subject is open, its title and the focused node's
  title and explanation (clipped as CA-30). No web tools. *(r9)*
- **CO-44** **A short conversation** until the chat is closed: follow-up questions see the earlier
  ones; on close it is forgotten. Nothing is saved to the subject. *(r9)*
- **CO-45** **On a selection**: the selection popover (NP-50) gains **Ask Amber** (Alt+D), for a
  definition or more information about the selected words. The answer appears in a small **card
  anchored to the selection**; Amber, when shown, leans toward it. The card offers *Ask the tutor*,
  which continues as *Ask about this* (NP-51). Esc closes it; it is not saved. With Amber off, the same
  card appears on its own. *(r8, r9)*
- **CO-46** *(Amended 2026-10-17, [custom-endpoints](/specs/custom-endpoints.md) Amber's model can be any pinned endpoint model, marked *not evaluated*: CO-48's eval bar stays on the default model, CE-22, CE-56.)* **Model.** *Settings → Companion → Amber's model*, default **Haiku 5.5**
  (`claude-haiku-5-5`), from the model list (SE-48), effort low. *(r8, r9)*
- **CO-47** **Log.** Amber's calls go to an **app-level log**, not a subject's generation log, and do not
  count in any subject's tokens. *Settings → Companion* shows the tokens Amber has spent. *(r9)*
- **CO-48** **Evals.** Amber's prompt passes the eval bar (PQ-33) on its default model before it
  ships, with cases for app, subject and general questions and for selections. *(r9)*
- **CO-49** **Errors.** A failure shows the usual fix-it message (SE-45) in the bubble or the card. *(r9)*

# Gestures and motion

- **CO-50** Hover or focus on Amber plays **attention**; a click plays **curiosity** as the bubble
  opens. When it appears it **hangs** (suspension) or, at a bottom position, **takes a few steps** in.
  *Heat and lift* and *descent and landing* are its flight and fall (CO-14). There are no milestone
  reactions. *(r8, r9)* *(Amended 2026-11-17.)* Small reactions through the moods replace that last
  sentence: CO-59.
- **CO-51** When the pointer comes close, Amber's eyes follow it. *(r8)*
- **CO-52** Between gestures the flame lives (the accepted 1.2 s contour and 2.4 s inner layers); the
  body stays still. No other idle motion. *(r8)* *(Amended 2026-11-17.)* After a long idle Amber dozes
  (CO-59): its eyes close and the flame stops living until the user is back.
- **CO-53** In Study, while the user reads, Amber stays still: it moves only when hovered, clicked,
  grabbed, asked, or while waiting for a generation's first words (CO-35). *(r8, r9)*
  *(Amended 2026-11-17.)* Also for a reaction (CO-59), which lasts under 1.5 s.
- **CO-54** **New motions** (grabbed and dangling, the rope, the swing, thinking, working, eyes
  following) are designed directly in the app and judged there by the user; if the feeling is off, a
  proper identity round follows. They keep the identity's invariants (silhouette, face, flame tokens).
  *(r9)*
- **CO-55** Amber keeps the identity's warm flame and body in every room; its halo and the light on its
  frame take the room's tokens. *(r8)* *(Amended 2026-11-17.)* The frame's colour comes from the identity's
  token set for the **current room's surface** (`companion.surface`; Learn and Choose share the navy
  surface), no longer a fixed `learn`; a room without one gets the neutral set.
- **CO-56** Reduced motion (GV-100): static poses, no gestures, swing, flight or fall; a move goes
  straight to the spot. The bubble and every action still work. *(r8, r9)*
- **CO-57** Nothing runs while the window is hidden; a gesture in progress is cancelled and not
  replayed. *(r8)* *(Amended 2026-11-17.)* Amber is drawn **once** per surface; a pose then sets only the
  attributes it moves (no SVG string rebuilt, no filter re-created), and a living flame redraws at most
  about 30 times a second.
- **CO-58** Amber is a real button: focusable, named, opened with Enter; its menu (*Move to…*, *Hide*)
  opens with right-click, the context-menu key or Shift+F10. *(r8)*
- **CO-59** *(Added 2026-11-17.)* **Reactions to the learner**, through the moods, never a new gesture:
  a **flare** (the halo swells and brightens, the eyes open wide, a small lift, about 1.4 s) when a node
  reaches one of the room's flare states (Learn: *understood*; Choose: *chosen*); a **glance** at a node
  newly added to the graph; a **look** toward the node the focus moved to (a near pointer wins over both);
  a **doze** after 3 minutes without the pointer, a key or a change to the subject (the eyes close slowly,
  the flame rests; any of them wakes it, never while it is busy, asked or working). Nothing on opening a
  subject. The subject is read at most about four times a second, whatever its revisions. None with
  reduced motion (CO-56); none with Amber off.

# From the identity (already agreed)

- One companion across rooms, with light adaptations (C08). Calm when the context needs it, above all
  while learning (C10). A static version; nothing useful depends on animation (C13, GV-103).
- Six accepted gestures: attention, curiosity, a few steps, suspension, heat and lift, descent and
  landing. Pause freezes; an interrupt stabilises over 180 ms. Shown at 64 px or more.

# Touches to other specs

- [rooms-spaces](/specs/rooms-spaces.md): RS-33 admits Amber (r8); RS-3 adds tips, guide entries and
  resting positions to the room definition; RS-12 adds the *Ask* button while Amber is off.
- [settings](/specs/settings.md): a **Companion** section (show Amber, Amber's model, tokens spent);
  `claude-haiku-5-5` joins the model list; the app state file holds Amber's spots and seen tips.
  *(Amended 2026-11-17.)* The section gains *Tips and nudges* (`companion.tips`, CO-21); the state file
  also holds the seen nudges (CO-39).
- [node-panel](/specs/node-panel.md): NP-50 and NP-53 gain *Ask Amber* and Alt+D.
- [graph-view](/specs/graph-view.md): GV-76 gains Ctrl+J and Alt+D; the `?` overlay gains *What can I do
  here?*.
- [updates](/specs/updates.md): UP-13 allows the notes inline in Amber's update greeting.

# Open

Implementation-time only: the tip pool, the guide lines per space, the greeting lines and the waiting
lines (drafted in the strings module and reviewed by the user); the prompt text and its eval cases.
