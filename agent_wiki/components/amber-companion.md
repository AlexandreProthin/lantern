---
type: Component
title: Amber, the companion
description: The optional lantern character in the frame - placement, a drawing updated in place, motion and reactions, rare nudges, Ask Amber's one-call chat with its category gate, greetings, and the app-level log.
tags: [amber, companion, frame, chat, motion]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-18T12:00:00Z }
resource: /app/src/frame/amber
---

# Purpose

Amber is the frame's small companion (v0.4.0). It hangs from the top bar or rests at the bottom of a
space, greets at launch, shows tips and per-space guide lines, keeps the user company while a generation
waits, and answers short questions in a temporary chat (*Ask Amber*). Nothing depends on it (CO-2); it
is switched off by *Settings → Companion → Show Amber*. The frame names no room: rooms hand Amber their
words, resting spots, the parts to keep uncovered (`avoid`), its surface, its reactions and its nudges
through `RoomCompanion` (`app/src/frame/room.ts`; for example the
[Choose room's](/components/choose-room.md) `chooseCompanion`).

Contract: [companion spec](/specs/companion.md) (CO-*). Landed in the [v0.4.0 plan](/plans/v0-4-0.md)
(deprecated); the drafted lines are in [Amber lines](/plans/v0-4-0-amber-lines.md).

# Modules

All under `app/src/frame/amber/`.

| Module | For | Contract |
|--------|-----|----------|
| `Amber.svelte` | The character: pointer drag, bubble, menu, greeting, waiting lines and nudges | Mounted by `Shell.svelte`; props carry room, space, `AmberState`, the chat, mood flags (`thinking`, `working`, `lean`), and *(2026-11-17)* the open `session` with its `subjectRevision`, `generating` and the `tips` setting |
| `drawing.ts` | *(2026-11-17)* The drawing updated in place | `companionTemplate(uid, surface)` (the identity port in `assets/identity/companion/lantern.ts`) is put in once per surface; `CompanionDrawing.apply(companionParts(pose))` sets only the attributes that changed (CO-57) |
| `react.ts` | *(2026-11-17)* Reactions, pure | `glimpse` of the subject's node states and focus; `reaction(before, after, flareStates)`: flare, then glance at a new node, then look at a moved focus; `flareAt`, `DOZE_AFTER` (CO-59) |
| `nudge.ts` | *(2026-11-17)* Nudges, pure | `NudgeRule` (id, space, line); `mayNudge` and `pickNudge` hold the rate limits (one per opening, 10 min apart, never generating, typing or busy), `nudgeKey` the seen id per rule and subject (CO-37 to CO-39) |
| `place.ts` | Where Amber can be, pure | Ten hanging spots along the bar, never over the window controls (CO-11); *(2026-11-17)* `defaultHang` (the rightmost spot clear of the avoided parts, CO-10) and `bubbleBox(spot, {width, height, bar}, size, avoid)`: under or above Amber, else beside it with a side tail, else the nearest clear place (CO-20); bottom resting spots from each space's `RestSpec` anchors, or the space's two bottom corners (CO-13); rope 0 to 160 px; `dropTarget` hangs within the top quarter of the window, else the nearest rest (CO-12, CO-14); a saved spot id may carry its rope (`hang-3:42`) |
| `rope.ts` | The rope physics | Small Verlet chain at a fixed 120 Hz step; held, the end follows the hand with slack; released, Amber swings and settles; also the arc of a flight and the accelerating fall (CO-12, CO-14, CO-54) |
| `motion.ts` | Amber's pose at a moment | Composes the identity release's six gestures with the new moods: thinking, working, eyes following the pointer within about 240 px, dangling from the hand, retract (feet fold in), and *(2026-11-17)* `flare` and `doze`. Reduced motion gives a still pose (CO-50 to CO-57, CO-59) |
| `state.ts` | Amber's slice of the app state file, under `companion` | `spots` per `room/space`, `seenTips`, `seenNudges` (the last 200), `lastVersion`, `lastGreeting`, release `notes`; parsing drops anything malformed; `nextTip` shows unseen tips first, then cycles (CO-15, CO-21; SE-50) |
| `greeting.ts` | The launch line | First launch, first launch after an update (the release notes kept at install, cut near 280 characters), or a pool line never repeated twice in a row (CO-30, CO-31) |
| `help.ts` | The app's help for the chat | `amberHelp(rooms)` builds the about line, shortcut table, per-space guide lines and all tips from `strings` and each room's `companion`; `amberContext` gives room, space, and the open subject's title and focused node (core fields only) (CO-43) |
| `prompt.ts` | The prompt, version `amber-1` | `AMBER_SYSTEM` plus the help block as system; where the user is, subject context, earlier turns and the question as prompt; ends with a reminder to begin with the category tag |
| `gate.ts` | The reply's category tag | Holds text until `<category>app|subject|general</category>` closes, then releases the rest; a missing or broken tag reads `general` with `tagOk` false (CO-42) |
| `chat.ts` | `AmberChat`, the temporary chat | One provider call per question at low effort, no web; earlier turns go with each follow-up; closing cancels and forgets; a failure stays in place with *Retry* (CO-40 to CO-49) |
| `log.ts` | The app-level Amber log | One line per call in `amber-log.jsonl` beside the state file (Rust commands `append_amber_log`, `amber_log_totals`); never a subject's log or tokens; totals per model for *Settings → Companion* (CO-47, CE-53); a `localStorage` surrogate serves the browser build |
| `AskBox`, `AskChat`, `SelectionCard`, `GuideLines`, `Emphasis` | Bubble and card UI | Ask field, chat view, the selection card (*Ask Amber* on selected text, CO-45), guide list, inline emphasis |
| `fake-provider.ts` | Browser build and tests | Deterministic answers that name their category; `[no tag]` in a message omits it, `failNext` injects an error, the delay is configurable (IP-71) |

# Behaviours worth knowing

- **Category gate.** The tag comes first so the app can tell app questions from subject and general
  ones; its text never reaches the user. The log records `category` and `tagOk`. The closing reminder
  line exists because Haiku sometimes skipped the tag without it.
- **Model.** `settings.companion.model` (default Haiku 5.5, effort low, CO-46) goes through the shared
  routing provider, so it can also be a pinned endpoint model, marked *not evaluated*
  ([endpoint provider](/components/endpoint-provider.md); CE-22, CE-56). `Shell.svelte` builds one
  `AmberChat` for the bubble and one per selection card.
- **Quiet by default.** Amber never speaks or moves unless the user acted (CO-5); calm spaces and
  reduced motion stop the living flame (CO-53, CO-56). *(2026-11-17)* The exceptions are a room's nudge
  after a quiet moment and the reactions; the subject is read through a 220 ms throttle, so a streaming
  generation costs a few node passes a second. `?amberQuiet=` and `?amberIdle=` (ms, DEV only) shorten
  the nudge's quiet moment and the doze for the browser tests.
- **Update notes.** `UpdateController.notes` is stored by `keepNotes` at install, then shown once by
  the first greeting after the update ([update channel](/components/update-channel.md); CO-31, UP-13).

# Verification

Unit tests sit beside the pure modules (`chat`, `greeting`, `motion`, `nudge`, `place`, `react`, `rope`, `state`;
the drawing's template plus parts equals the identity's string in `lantern.test.ts`).
`app/tests/amber.spec.ts` drives it in the browser build with the fake provider (the waiting-line and
eyes tests use `?wait=`). `app/evals/amber.ts` is the prompt's eval gate (CO-48, PQ-33); hand acceptance
is `app/ACCEPTANCE-AMBER.md`.
