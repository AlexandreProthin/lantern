---
type: Component
title: Choose room
description: The second room - a decision graph of needs, criteria and products, a sourced Compare table, a Gallery of decisions; its session policy, protocol parser and choose-1 prompts.
tags: [choose, room, session, protocol, prompts]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-18T12:00:00Z }
resource: /app/src/rooms/choose
---

# Purpose

Choose helps the user decide what to buy: say what you want, map needs and criteria, let the model find
real products with sources, shortlist them into a Compare table, and ask for a recommendation. It is the
second room (v0.3.0). The frame knows it only through `RoomDefinition` (RS-2); `rooms/index.ts` lists it
beside Learn in release builds.

Contracts: [choose-room](/specs/choose-room.md) (CR-*) for behaviour,
[choose-protocol](/specs/choose-protocol.md) (CP-*) for data, prompts and blocks, built on
[domain-model](/specs/domain-model.md) and [rooms-spaces](/specs/rooms-spaces.md). Landed as Part B of
the [v0.2.0 plan](/plans/v0-2-0.md) (deprecated); web research follows
[choose web tools](/decisions/choose-web-tools.md).

# Modules

All under `app/src/rooms/choose/`.

| Module | For | Contract |
|--------|-----|----------|
| `definition.ts` | `chooseRoom: RoomDefinition` | Spaces Welcome, Survey (default), Compare, Gallery; node kinds and states; wires settings, session, fake provider, summary and companion |
| `rules.ts` | Room-owned data and its rules | Kinds `subject/concept/need/criterion/family/product/own`; states per kind; six source kinds (CP-4); cells; status `exploring/decided/bought`; state transitions; one chosen product; the user's value kept beside the model's; `validateChoose` on load and before save (DM-66) |
| `protocol.ts` | Parsing replies, pure | Per task, only its allowed tagged blocks count (`options`, `products`, `cells`, `facts`, `need`, `branch`, `recommend`; TP-30); sources are checked against `today` and `web` (CP-31); a fact with no usable source is dropped and a cell value becomes null; `fresh` and `placeProducts` dedupe against every node in any state |
| `prompts.ts` | Prompt version `choose-1` | System prompt with `{{WEB_LINE}}` and `{{TONE_LINE}}` slots and one template per task, each ending as TP-12 requires; text copied from the approved protocol |
| `context.ts` | What each call sees | Needs card, criteria by rank, shortlist and rejected, one line per stored cell; fill targets; fitted to the context budget (CP-50 to CP-53). `today` is an argument, never the clock |
| `session.ts` | `ChooseSession`, the policy over the core graph | Tasks `intro`, `light`, `more`, `reply`, `find`, `fill`, `check`, `recommend`. A main lane runs one call at a time; a research lane fills Compare cells from a queue (CP-40, CP-41). Web only for `find`, `fill`, `check` and only when *Use the web* is on (CP-10). Results apply to a copy and swap in only on success, and every outcome is logged with `choose-1`, tone and web (LR-1 to LR-3). Also the user actions: shortlist, rank, answer, reject, choose, mark bought, edit and revert a cell |
| `settings.ts` | `choose.*` settings | `country`, `currency`, `defaultTone`, `useWeb`; country from the system region, currency from the country, EUR fallback (CR-90) |
| `stats.ts`, `summary.ts` | Board and cards | `board()` counts needs, criteria and shortlist and lists what is missing before a decision (CR-14, CR-61); `chooseSummary` reads the room-neutral summary for Welcome and Gallery cards (ST-7) |
| `companion.ts` | Amber's lines for this room | About line, eight tips, a waiting line per task, a guide per space, resting spots in Survey ([Amber](/components/amber-companion.md)) |
| `fake-provider.ts` | Browser build and tests | Deterministic answers per task, canned web results with tool events, configurable delay, injected errors (IP-71) |

| Files | Space | Contents |
|-------|-------|----------|
| `Welcome.svelte`, `Gallery.svelte`, `library/` | Welcome and Gallery | Recent decisions; status tabs and sorts (`arrange.ts`, CR-12); countries and formats |
| `Survey.svelte`, `survey/` | Survey | The graph with the recipe's pictograms and looks (`kinds.ts`), node actions (`actions.ts`), the board rail and what is missing (`missing.ts`), the reading panel |
| `Compare.svelte`, `compare/` | Compare | Product columns by criterion rows grouped Must / Nice / Irrelevant; cell status and sources (`model.ts`); cards; fold and resize motion |

# Behaviours worth knowing

- **Two lanes.** The research lane runs beside the main lane, so a fill does not block a reply.
  Cancelling research drops its queue.
- **Research stays on Claude Code.** A web call never goes to an endpoint (CE-55). On an endpoint
  model the prompt is also fitted to the model's context size (CE-31).
- **Honest cells.** The model's value and the user's value live side by side; a check refreshes facts
  and cells but never the user's values (CP-13). Cells whose criterion is gone are pruned on save (CP-5).
- **Pick and history.** Choosing records a `pick` with the price source; the status history feeds the
  Gallery timeline (CP-2).

# Verification

Unit tests sit beside `context`, `prompts`, `protocol`, `rules`, `session`, `summary`,
`compare/model`, `library/arrange` and `survey/actions|kinds|missing`. Browser specs:
`app/tests/choose-survey.spec.ts`, `choose-compare.spec.ts`, `choose-library.spec.ts`. Prompt evals:
`app/evals/choose.ts`. Hand acceptance: `app/ACCEPTANCE-CHOOSE.md`.
