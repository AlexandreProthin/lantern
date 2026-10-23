---
type: Spec
title: Debug console
description: A hidden developer mode that docks a terminal-style console at the bottom of every screen, tracing each model call (system prompt, context blocks, prompt, tool uses, reply, usage), the user actions that started it and app events, with save to a Markdown log and live recording.
tags: [developer, debug, trace, prompts, observability]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-10-23T15:00:00Z }
---

Source: the user's decisions of 2026-10-23. They want to control and review the system prompts and
the context Lantern sends: what the model really received, round by round, from any screen. Their
choices: a bottom console revealed from the hidden Developer section; save to a chosen folder, plus
an optional live *record*; Markdown logs; model calls, user actions and app events all traced. Moving
the prompt text into separate `.md` files was considered and **dropped**: the console is the review
tool.

# Turning it on

- **DC-1** The hidden **Developer** section ([updates](/specs/updates.md) UP-60) gains a *Debug
  mode* switch (`developer.debug`, boolean, default `false`). The switch keeps the section shown, as a
  set update folder does.
- **DC-2** While debug mode is on, the console is docked at the bottom of the window, full width: the
  spaces, panels and graph shrink to make room, and dialogs (Settings, Ask Amber) still open on top.
  Turning it off removes the console and clears its entries.
- **DC-3** Desktop app and the dev browser build only. A remote device ([network-serving](/specs/network-serving.md))
  never sees the console, the switch or the log commands. The web demo build does not include it.
- **DC-4** While debug mode is off, nothing is captured and nothing is written: the tracing hooks
  return straight away.

# The console

- **DC-10** Terminal style but easy to read: monospace, a dark surface in both themes, one line per
  entry, a colour per kind (call, action, event, warning, error) and per outcome. The time comes first
  (`HH:MM:SS.mmm`).
- **DC-11** The console height can be resized by dragging its top edge, between 120 px and 70 % of
  the window. It can be collapsed to its header bar. Height and collapsed state persist
  (`developer.consoleHeight`, `developer.consoleCollapsed`).
- **DC-12** It follows the newest entry. Scrolling up pauses following, and a *Follow* control
  resumes it.
- **DC-13** A model call is one entry that starts collapsed. Its header line shows the origin, the
  model and effort, `web` if tools were allowed, a live status (running, ok, cancelled, error), then
  the input → output tokens and the duration once finished. Expanding it shows the sections of DC-21.
  Each section can be expanded on its own, and long texts start folded to their first lines.
- **DC-14** Side actions, on the right of the console: **Save**, **Record** (on/off), **Folder** (pick
  or show the log folder), **Clear**, **Filter**, **Copy** (the selected entry as Markdown) and
  **Expand/Collapse all**.
- **DC-15** **Filter**: show or hide each kind; restrict to one or more origins; free-text search
  over the summaries and the expanded texts. The header bar shows how many entries match.
- **DC-16** Memory: the console keeps the last 2,000 entries. Older ones are dropped, and a line says
  how many. Streamed text is applied at most once per animation frame.

# What a model call records

- **DC-20** Every call through the app's inference provider is traced at one place, the outermost
  provider wrapper. No call can skip it: Learn and Choose tasks, subject suggestions, Amber (chat,
  greeting, selection), provider checks and the Settings *Test* button.
- **DC-21** Each call records, in this order:
  1. **Origin**: who asked, as `area·task` (for example `learn·light`, `choose·find`, `amber·ask`,
     `frame·health`), and the subject and node ids when there are some.
  2. **Request**: the requested and the resolved model, effort, `web`, the request id and
     `promptVersion`.
  3. **System prompt**: the exact `system` string.
  4. **Context**: the context blocks the caller assembled (`SUBJECT`, `DIRECTION`, `MAP`, `PATH`,
     `PARENT`, `FOCUS`, `DIALOGUE`, and so on), each with its size in characters and estimated
     tokens, plus the caller's context statistics (for example the map's full or reduced form,
     omitted turns).
  5. **Prompt**: the exact `prompt` string.
  6. **Stream**: the reply as it arrives, with each tool use (WebSearch query, WebFetch host) placed
     where it happened.
  7. **Parsed**: what the caller kept from the reply (visible text, options, branch, understood, the
     Choose blocks…) and anything it rejected.
  8. **Result**: outcome, error kind and details, usage (input, output, thinking, cache read/write;
     *estimated* when CE-50 applies), cost, tool counts, duration.
- **DC-22** Exactness: the system prompt and the prompt shown are the strings handed to the provider,
  never rebuilt. The context blocks are a second view of the same prompt. If a block's text cannot be
  found in the prompt, the console shows a warning on the call instead of hiding the gap.
- **DC-23** Secrets never enter the trace: endpoint keys stay in Rust (SE-7, CE-70), and no header
  or key field is ever recorded.

# User actions and app events

- **DC-30** **Actions**: the user step that starts work or changes state. Opening a room or a space,
  creating, opening or deleting a subject, lighting a node, *More*, *Test me*, sending a reply,
  *Rewrite*, dismissing or editing, a Choose step, asking Amber, a selection ask, cancelling a
  generation, a settings change (name of the setting, not its value when that is a path or a key).
  The call an action starts appears just below it.
- **DC-31** **Events**: things the app does on its own. Subject saves and conflicts, settings saves,
  provider status and health changes, update checks, the library switch, plus recoverable errors and
  warnings (what today goes to `console.warn`/`console.error` from the app's own code).
- **DC-32** An action or event is one line, with a short summary and optional details that can be
  expanded.

# Saving and recording

- **DC-40** The log folder (`developer.logFolder`, absolute path, default empty) is picked with the
  folder picker and shown in the Developer section and in the console's *Folder* action.
- **DC-41** **Save** writes the console's current entries (all of them, not only the filtered ones)
  to `lantern-debug-YYYY-MM-DD-HHMMSS.md` in the log folder. Without a folder, Save asks for one
  first.
- **DC-42** **Record** (`developer.record`, default `false`) appends each entry to
  `lantern-debug-<session start>.md` once it is complete: a call when it finishes, an action or event
  straight away. Each launch records to a new file. A failed write turns Record off and shows an
  error line in the console.
- **DC-43** Format: Markdown that reads like the console. A header with the app version and the date.
  Then one `##` heading per entry (time, kind, origin, summary), with the DC-21 sections as `###`
  headings and long texts in fenced blocks. A fence is longer than any run of backticks inside the
  text.
- **DC-44** Rust writes the files: only `.md` names of the DC-41/DC-42 shapes, only inside the log
  folder, never at a remote device's request. The folder must exist.

# Later

- Raw provider events (the CLI's `stream-json` lines, an endpoint's HTTP payloads) in the trace.
- Re-running a traced call with an edited prompt from the console.

# Open

- Whether calls a remote device starts should appear in the desktop console with a `remote` mark.
