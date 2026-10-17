---
type: Spec
title: Inference provider contract
description: The technology-neutral provider contract, the Claude Code CLI implementation, its error taxonomy, detection, concurrency, timeouts, security and testability.
tags: [llm, provider, claude-cli, errors, testing]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-17T16:00:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Source: spec workshop rounds 1–3 (2026-10-01/02). Agreed with the user 2026-10-02 (q-r3-review).

Builds on [pluggable-inference-provider](/decisions/pluggable-inference-provider.md),
[claude-cli-provider-flags](/decisions/claude-cli-provider-flags.md) and the PoC implementation in
[inference-provider](/components/inference-provider.md). The generation log it feeds is in
[domain-model](/specs/domain-model.md); the Settings status UI is in [settings](/specs/settings.md).

# The provider contract

Everything the rest of the app knows about an LLM is this contract. It is technology-neutral: an
API, local or other provider MUST fit without changing callers.

## Request

- **IP-1** A request MUST carry: `system` (string), `prompt` (string), `model` (alias or free-text id, optional), `effort` (`low`|`medium`|`high`|`xhigh`|`max`, optional), `web` (boolean, optional, false when absent) and a `cancel` token. *(Amended 2026-10-15, v0.2.0 B3, [decision](/decisions/choose-web-tools.md).)* `web` lets the call search the web and read pages and nothing else (IP-20, IP-60); only the Choose room's research tasks set it (CR-40, [choose-protocol](/specs/choose-protocol.md) CP-10), and every other call, Learn's included, runs with no tool at all.
- **IP-2** The provider MUST NOT interpret the prompt: assembly is the caller's job ([context-assembly](/specs/context-assembly.md)). Prompt text MAY reach the provider only through the channel it defines (for the CLI: stdin).
- **IP-3** A provider that does not support `effort` MUST ignore it and report that in its result (`resolvedEffort` absent).

## Streaming

- **IP-4** The provider MUST call a text callback with each streamed text chunk, in order, on the calling thread. Chunks MUST concatenate to the final text; in a call that used tools, the chunks after the last tool use do (IP-13).
- **IP-13** *(Amended 2026-10-15, v0.2.0 B3, [decision](/decisions/choose-web-tools.md).)* A call with `web` MUST report each tool use, in stream order and once per use, through a tool callback `{name, detail}`: `detail` is the search query for WebSearch and the page's host for WebFetch, so the caller can show progress (*Searching… / Reading eu.store.bambulab.com…*). A tool use closes the text before it: that text (the model's *I'll search…*) is not part of the final text, and a caller showing chunks starts over at each tool use ([choose-protocol](/specs/choose-protocol.md) CP-32).
- **IP-5** If the provider produced no chunks but a final text exists, it MUST emit that text once through the callback so the UI still shows something (PoC behaviour).

## Result

- **IP-6** A completed call MUST return `{text, model, usage, durationMs, costUsd?, toolCalls?, outcome}`:
  - `model`: the **resolved** model id reported by the provider, not the alias asked for.
  - `usage`: `{input, output, thinking, cacheRead, cacheWrite}`, all integers, 0 when unknown for a field the provider cannot report.
  - `durationMs`: wall time as reported by the provider, else measured by the app.
  - `costUsd`: optional, API-equivalent; stored in the log, never shown ([domain-model](/specs/domain-model.md)).
  - `toolCalls`: optional, the number of tool uses per tool name (`{"WebSearch": 1, "WebFetch": 1}`), copied into the record (DM-64); absent when the call used no tool. *(Amended 2026-10-15, v0.2.0 B3, [decision](/decisions/choose-web-tools.md).)*
  - `outcome`: `ok` | `cancelled` | `error`.
- **IP-7** An unsuccessful call MUST return a typed error (below) carrying the same `usage`, `durationMs`, `model` and `toolCalls` fields wherever known, so that failed and cancelled calls can be logged (DM-32).
- **IP-8** The call is synchronous from the provider's point of view (blocking); callers run it off the UI thread and relay chunks as events.
- **IP-9** The CLI's own baseline (about 13k tokens, reported in `usage` as cache creation or read) MUST be reported in `usage` and logged like any other figure, but it sits **outside** Lantern's context budget, which covers only Lantern's own prompt ([context-assembly](/specs/context-assembly.md) CA-12). It is not part of *tokens spent* either ([welcome-gallery](/specs/welcome-gallery.md) WG-31).

## Error taxonomy

- **IP-10** *(Amended 2026-10-17, [custom-endpoints](/specs/custom-endpoints.md) Endpoints add `unreachable`, `key-rejected` and `context-too-long` and map HTTP failures to this vocabulary, CE-40. The CLI types are unchanged.)* Every failure MUST map to exactly one of the types below. Messages shown to the user come from the app, not from raw CLI output; the raw output MUST be available under *Details* for diagnosis.

| Type | Detected from the CLI | What the user sees |
|---|---|---|
| `not-installed` | `spawn` fails with *not found*; no `claude` in PATH or common install paths | "Claude Code is not installed." Step-by-step install instructions with a link to the install page, and a *Check again* button (IP-44). |
| `not-logged-in` | `result` with `is_error` whose text mentions login / authentication / `/login`; or 401-type text | "Claude Code is installed but not signed in." Step-by-step sign-in instructions (IP-44) and *Check again*. No sign-in button. |
| `rate-limited` / `usage-limit` | `is_error` result with limit / quota / overloaded / 429 text; a reset time is shown when the text gives one | "Your Claude usage limit was reached." Reset time if known; the node returns to its previous state; *Try again*. |
| `model-unknown` | `is_error` result mentioning an unknown / invalid / unavailable model | "The model 'x' is not available." Open the model picker. |
| `network` | `is_error` result mentioning connection / timeout / DNS / fetch failed, or no `init` line and stderr naming a network failure | "Could not reach Claude. Check your connection." *Try again*. |
| `process-crashed` | Non-zero exit or killed by a signal with no `result` line; stderr kept | "Claude Code stopped unexpectedly." *Try again*, *Details*. |
| `protocol` | Stream ends without a `result` line, or stdout lines are not valid JSON events, or the stall timeout fires (IP-31) | "Claude Code gave an answer Lantern could not read." *Try again*, *Details*. |
| `cancelled` | The user pressed Esc / Cancel; the app killed the process | No error banner; the node returns to its previous state; the log notes *cancelled*. |

- **IP-11** Detection by text match MUST live in one function with recorded-fixture tests, because the CLI wording can change; an unrecognised `is_error` result MUST become `process-crashed` with the text in *Details*, never be dropped.
- **IP-12** A failed or cancelled generation MUST NOT leave a half-written node: partial text is discarded and the node returns to its previous state (see [learn-room](/specs/learn-room.md)).

# The ClaudeCliProvider

Implementation of the contract for v0.1.0. *(Amended 2026-10-17.)* It is no longer the only provider: endpoints (local servers, then cloud APIs) implement the same contract over HTTP, as [custom-endpoints](/specs/custom-endpoints.md) specifies. Everything in this section stays specific to the CLI.

## Process

- **IP-20** The call MUST run `claude -p --output-format stream-json --verbose --include-partial-messages --safe-mode --strict-mcp-config --no-session-persistence --tools "" --system-prompt <system>`, plus `--model <model>` when a model is set and `--effort <level>` when an effort is set. *(Amended 2026-10-13, v0.2.0 A4, [decision](/decisions/choose-web-tools.md).)* A call that allows web tools (the Choose room's research tasks, CR-40) runs `--tools "WebSearch,WebFetch" --allowedTools WebSearch WebFetch` instead of `--tools ""`; the provider counts the stream's tool-use events per tool name into `toolCalls` (DM-64) and reports them as progress while the call runs. *(Amended 2026-10-15 by the user: no Haiku 4.5.)* A web call also sets the environment variable `ANTHROPIC_DEFAULT_HAIKU_MODEL=claude-opus-5-5`, so the CLI's WebFetch helper runs on Opus 5.5 instead of Haiku 4.5; checked with CLI 2.1.290, the `result` line's `modelUsage` then lists only `claude-opus-5-5`. Calls without `web` leave the environment as it is.
- **IP-21** The prompt MUST be written to stdin and stdin closed; it MUST NOT be passed as an argument.
- **IP-22** The working directory MUST be the OS temp directory; on Windows the child MUST be created with `CREATE_NO_WINDOW`.
- **IP-23** The executable MUST be the one located by detection (IP-40), not a bare `claude` lookup at every call, once detection has found it.

## Stream parsing

One JSON object per stdout line. Lines that are not JSON MUST be ignored but counted; if the whole stream had no valid event, the error is `protocol`.

- **IP-24** `system` with `subtype: "init"` supplies the resolved `model`.
- **IP-25** `stream_event` lines with `event.delta.type == "text_delta"` supply streamed text.
- **IP-19** *(Amended 2026-10-15, v0.2.0 B3, [decision](/decisions/choose-web-tools.md).)* `assistant` lines whose `message.content` holds a `tool_use` block supply tool uses (`name`, `id`, `input`); each `id` counts once. Text streamed before such a line is the text a tool use closes (IP-13).
- **IP-26** The final `result` line supplies `usage` (including `output_tokens_details.thinking_tokens`), `duration_ms`, `total_cost_usd`, `is_error` and the result text. The call is successful iff this line exists and `is_error` is not true.
- **IP-27** Errors MUST be read from the `result` line (`is_error`), not from the exit code: the CLI can exit with 0 and `is_error: true`. The stream MUST be read to the end before success is judged.

## Cancel

- **IP-28** Cancelling MUST kill the whole process tree (on Windows `taskkill /T /F` or a Job Object), not only the direct child, then return `outcome: cancelled`.
- **IP-29** The cancelled result carries the usage from a `result` line only if one arrived. It is often unknown, since the CLI reports usage at the end; the log then stores zeros and the record is still written (DM-32).

# Detection

Used by the Settings status and by the first-call error path.

- **IP-40** The app MUST locate `claude` by searching `PATH` and then common install locations (for example `%USERPROFILE%\.local\bin`, `%APPDATA%\npm`, `%LOCALAPPDATA%\Programs`), trying `claude.exe`, `claude.cmd` and `claude`. The found path and version (`claude --version`, fast, no network) are shown in Settings.
- **IP-41** The login check MUST be a *Test* call: a tiny prompt on `opus` (Opus 5.5, the default model) with `--effort low` *(Amended 2026-10-15 by the user: no Haiku 4.5.)* through the normal provider path. It MUST run only when the user presses *Test* / *Check again* (or as a side effect of a real generation), never automatically at startup or when Settings opens.
- **IP-42** Cost and timing of the check: about 13k cache tokens of the CLI baseline plus a few output tokens, 3–6 s typically; it counts against the user's usage like any call. The result (ok, error type, model resolved, duration) is shown in the status area.
- **IP-44** v0.1.0 MUST NOT open the Claude Code sign-in for the user, and no console window is ever opened by the app ([decision](/decisions/cli-signin-instructions-only.md)). When detection yields `not-installed` or `not-logged-in`, Settings → Provider and the frame banner MUST show clear step-by-step **instructions** (the install link; how to sign in to Claude Code) plus *Check again*, which runs the *Test* call of IP-41. The user does the one-time sign-in outside Lantern, following the instructions ([settings](/specs/settings.md) SE-47). *Lantern opens the sign-in for you* is Later.
- **IP-43** Installed-but-not-tested is a valid status ("not tested yet"); the app MUST NOT block first use on the check — a failing first generation yields the same typed error and fix-it message.

# Concurrency

- **IP-50** The app MUST allow at most **one generation in flight per subject** (per room visit) in v0.1.0; this rule belongs to the app ([learn-room](/specs/learn-room.md) LR-40), not to the provider.
- **IP-51** The provider contract MUST still allow concurrent calls (each call owns its process and its cancel token), so parallel generation, which is Later, needs no provider change.
- **IP-52** Each call MUST have its own `request_id`, used to route chunks and the result to the right generation.

# Timeouts

- **IP-30** There MUST be no limit on total time: latency is accepted ([latency-masked-not-reduced](/decisions/latency-masked-not-reduced.md)).
- **IP-31** *(Amended 2026-10-17, [custom-endpoints](/specs/custom-endpoints.md) On endpoints the stall clock starts at the first byte, since loading a local model can take a minute, CE-41.)* A stall timeout MUST apply: if no stream event of any kind arrives for 120 s, the app kills the process tree and fails with `protocol` (stalled). Extended thinking emits events while it works, so a quiet stream really is a stall.

# Security

- **IP-60** The CLI MUST run with no tools, in safe mode, with strict MCP config and from a temp directory, so it can read nothing of the user's files and runs no user configuration. *(Amended 2026-10-13, v0.2.0 A4, [decision](/decisions/choose-web-tools.md).)* The one exception is IP-20's web tools for the Choose room's research tasks: WebSearch and WebFetch only, never a file, shell or MCP tool.
- **IP-61** Prompts MUST NOT contain secrets: they hold only the subject content and the app's own prompt text. The app MUST NOT put the display name or paths into prompts beyond what the room specs define.
- **IP-62** Raw stderr and results MUST NOT be sent anywhere; they are shown locally under *Details* only.
- **IP-63** API keys get their own security rules before any API provider ships. *(Amended 2026-10-17.)* Those rules are [custom-endpoints](/specs/custom-endpoints.md) CE-70 to CE-76 (Windows Credential Manager, never in settings.json or subject files, never sent back to the webview), built in the cloud version.

# Testability

- **IP-70** Stream parsing and error detection MUST be tested in Rust against **recorded stream fixtures** (one file per case: ok, thinking, no-delta, each error type, truncated stream, cancelled, and a web call with a search and a blocked fetch). Building the arguments is a pure function, tested to give `--tools ""` without `web` and exactly WebSearch and WebFetch with it (IP-20, IP-60).
- **IP-71** A **fake provider** implementing the same contract MUST exist for the web build and the Playwright tests: deterministic streamed text, configurable delays, and injectable errors of every type.
- **IP-72** One ignored Rust test MAY call the real CLI (`cargo test -- --ignored`); prompt evals use the real CLI by hand ([platform-quality](/specs/platform-quality.md)).

# Open


- Whether the *Test* call also confirms the effort flag is accepted by the installed CLI version (a `model-unknown`-style message would name the flag): an implementation-time question.
- The exact CLI wording per error type must be captured as fixtures during implementation; the match patterns above are placeholders until then.

Related: [settings](/specs/settings.md), [domain-model](/specs/domain-model.md), [learn-room](/specs/learn-room.md), [tutor-protocol](/specs/tutor-protocol.md), [platform-quality](/specs/platform-quality.md).
