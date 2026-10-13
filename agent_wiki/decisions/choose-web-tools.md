---
type: Decision
title: Choose research calls may search the web, and nothing else
description: The Choose room's research tasks run the CLI with WebSearch and WebFetch only; every other call keeps no tools. Based on a 6-call spike.
tags: [llm, claude-cli, provider, choose, web]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-13T19:00:00Z }
verified: { by: "human:alex", at: 2026-10-13T19:00:00Z }
---

Decided 2026-10-13 with the user, after the v0.2.0 plan's step A4 spike. Amends
[claude-cli-provider-flags](/decisions/claude-cli-provider-flags.md) for the Choose room only.

# Context

[choose-room](/specs/choose-room.md) CR-40 lets research tasks use the web, because product facts
go stale and the model's knowledge stops at its training date. The provider runs the CLI with
`--tools ""` (IP-20, IP-60). The spike (`app/evals/web-spike.mjs`, CLI 2.1.290, the provider's
exact flags with `--tools "WebSearch,WebFetch"` and the matching `--allowedTools`) made 6 calls.

# Evidence

| Call | Model | First text | Total | Web calls | API-equivalent cost |
|---|---|---|---|---|---|
| Find 3 printers around €500 | Opus 5.5, medium | 6 s | 49 s | 3 searches, 5 fetches | $0.29 |
| Same | Haiku, low | 50 s | 55 s | 8 searches, 3 fetches | $0.25 |
| Build volume from the maker's site | Opus 5.5, medium | 11 s | 40 s | 2 searches, 7 fetches | $0.19 |
| Same | Haiku, low | 61 s | 64 s | 6 searches, 4 fetches | $0.24 |
| Read a file and run `dir` | Opus / Haiku | 3–6 s | 8–10 s | none | $0.02 / $0.006 |

- Only WebSearch and WebFetch were available; asked to read a file and run a shell command, both
  models said they had no such tool and never tried one.
- Opus gave dated, sourced prices from shop pages, marked opinions, and said when a page blocked it.
  Haiku answered "around €500" with €210–400 printers, used eBay and deal sites, and claimed to have
  read a spec PDF that could not be read. It was not faster or cheaper: more web calls, no text until
  the end, and WebFetch already uses Haiku 4.5 internally, even in Opus calls.
- The CLI's own `server_tool_use.web_search_requests` stays 0; web use is visible only as tool-use
  events in the stream. `modelUsage` lists every model a call used, the WebFetch helper included.
- Opus writes a short sentence before it starts searching, so the first streamed text is not the
  answer.

# Decision

1. The Choose room's research tasks (CR-40) run the CLI with `--tools "WebSearch,WebFetch"` and
   `--allowedTools WebSearch WebFetch`; all other flags as IP-20. Every other call, Learn's
   included, keeps `--tools ""`.
2. The provider counts tool-use events per tool name into the record's `toolCalls` (DM-64), and the
   log keeps every model the call used.
3. The wait is masked, not hidden: the stream's tool events drive a visible progress line
   (*Searching… / Reading eu.store.bambulab.com…*), the text before the first tool call is kept apart
   from the answer, and Cancel works as for any call.
4. **No cheaper-model setting** for web searches (CR-45 withdrawn): in the spike Haiku was slower,
   not cheaper and broke the source rules.
5. The Choose eval cases (v0.2.0 plan B2) test the source rules (CR-42) on real answers.

# Consequences

A research call is 40–65 s and about ten times the cost of a plain call, so Choose uses the web only
where CR-40 says, and *Use the web* can be turned off (CR-44). Specs amended:
[inference-provider](/specs/inference-provider.md) IP-20 and IP-60, [choose-room](/specs/choose-room.md)
CR-43, CR-45 and CR-90.
