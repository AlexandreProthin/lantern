---
type: Plan
title: Custom endpoints plan, local version
description: The local phase of custom endpoints - the OpenAI-compatible provider in Rust with Ollama's native chat, routing by model id, Settings → Endpoints, grouped pickers, context windows, the local token line and the new errors - with the order, the Claude Code regression guard, exit checks and risks.
tags: [plan, endpoints, ollama, provider]
status: draft
stale_after: 2027-03-31T00:00:00Z
generated: { by: claude-code/opus-5.5, at: 2026-10-17T16:30:00Z }
---

Written 2026-10-17, after spec workshop rounds 10 and 11. The contract is the
[custom-endpoints](/specs/custom-endpoints.md) spec, local version (CE-3), and the amendments it made,
marked *Amended 2026-10-17*: [inference-provider](/specs/inference-provider.md) (the CLI section's
intro, IP-10, IP-31, IP-63), [settings](/specs/settings.md) (`provider.endpoints`, `/` in model ids,
SE-7, SE-40, SE-46, SE-48), [context-assembly](/specs/context-assembly.md) CA-10 and CA-12,
[choose-room](/specs/choose-room.md) CR-40, [companion](/specs/companion.md) CO-46 and
[welcome-gallery](/specs/welcome-gallery.md) WG-31. The user's words are in
`agent_design/tool/specs_work/data/answers.json`, rounds 10 and 11. This plan orders the work and says
when each part counts as done; it does not restate requirements. The cloud version (keys, NVIDIA)
gets its own plan.

# Ground rules

The rules of the earlier plans still hold: every task cites its spec ids; a spec that turns out wrong
is changed first, then the code, after asking the user; the frame knows no room; strings live in
`app/src/ui/strings.ts` (PQ-4).

**The Claude Code path must not get worse (CE-2).** Only the three agreed touches change it (the
spec's *Touches to the Claude Code path*). Concretely: `provider.rs`'s `args`, `env`, `detect`,
`classify`, the stream parser and their 34 Rust tests stay as they are; every existing TypeScript and
Playwright test passes unchanged, except where a test pins one of the three agreed touches; a Claude
Code call goes through exactly the code it goes through today. A change found to touch the Claude path
in any other way stops the slice and goes to the user first.

**Branch (CE-6).** The work starts in this worktree, on `worktree-lantern-custom-endpoints`, one
commit per slice. When the user judges the implementation good enough (at the latest once a local
endpoint can be tested in the app, after slice 4), it moves to a dedicated feature branch (proposed:
`claude/lantern-custom-endpoints`) to be finished there. Only the user merges it into `master`.

**Version (CE-5).** No version number is chosen here. When slice 8 passes, the agent asks the user
whether to release the local version now or wait and release local and cloud in one bump.

**The user's setup (CE-4).** Gemma 4 E2B (`gemma4:e2b`, Q4_K_M), served by Ollama 0.40.6, set up by the
user, CPU only on this machine. Fixtures are recorded against it first.

# How it fits together

- A model id with an endpoint prefix (`ollama:gemma4:e4b`) names an endpoint model; any other id is a
  Claude Code model (CE-23). The first `:` splits endpoint from model, since Ollama tags hold `:` too.
- The frame wraps the desktop provider in a **routing provider**: an endpoint model is sent to
  `generate` with an `endpoint` field (base URL, preset, context size) and the bare model id; a Claude
  Code model is sent exactly as today. A call with `web` never goes to an endpoint (CE-55): it runs on
  the subject's model if that is a Claude Code model, else on `provider.defaultModel` if that is one,
  else on `opus`. Rooms do not know endpoints exist, except that they ask the frame for their
  context budget (slice 5).
- In Rust, `generate` dispatches on `endpoint`: absent → `ClaudeCliProvider`, untouched; present →
  `EndpointProvider`. The CLI's executable check moves inside the CLI branch, so an endpoint call works
  with no Claude Code installed (CE-26).
- The resolved model stored in the log and on nodes is `<endpointId>:<model as the server reports it>`,
  so the meta line and the stats can tell endpoint tokens apart (CE-25, CE-53).

# Slice 0. Fixtures from the real servers

- The user has Ollama serving Gemma 4 E4B. Record, with a small script under `app/src-tauri/fixtures/`
  (not shipped): Ollama's native `/api/chat` stream (NDJSON, one JSON object per line, not SSE), its
  `/v1/chat/completions` stream (SSE) for the shared parser, `/v1/models`, `/api/show`, and the error
  bodies for a missing model, a server that is down (connection refused, nothing to record) and an
  over-long prompt. If the user has llama.cpp's `llama-server` or LM Studio, the same for them (SSE,
  `/props`); otherwise their fixtures come from their documentation and are marked so.
- Also record a stream with thinking, if the model or another local model emits it
  (`reasoning_content` or inline `<think>`), for CE-51.
- **Exit:** the fixture files and a README line naming the server version each came from.
- **Done 2026-10-17**: 15 cases in `app/src-tauri/fixtures/endpoint/` (`record.py`, `cases.json`,
  `README.md`), from Ollama 0.40.6 and `gemma4:e2b`. llama.cpp and LM Studio were not running; their
  fixtures come from documentation in slice 1. What the recordings showed:
  1. Native thinking is in `message.thinking`; compatible thinking is in `delta.reasoning` (not
     `reasoning_content`). The model **thinks by default** (`/api/show`: `thinking.default: true`);
     `think: false` (native) or `reasoning_effort: "none"` (compatible) turns it off. Thinking roughly
     doubles the reply time here.
  2. A prompt over `num_ctx` is **cut with no error** (`done_reason: stop`, `prompt_eval_count` 1027
     for a prompt of about 3k tokens at 2048): CE-32 and CE-33 confirmed. Without a size, the
     compatible calls ran at the full 131072.
  3. **3 of 6 replies left `<options>` unclosed** after a complete JSON array. Learn's parser
     (`protocol.ts`, TP-31) needs the closing tag, so those light-ups would keep their text and get no
     options (TP-34).
  4. CPU only: about 8–9 output tokens per second, about 15 s to load the model, so a light-up takes
     around 90 s.
  5. Usage: native `prompt_eval_count`, `prompt_eval_cached_count` (cache read), `eval_count` (thinking
     included); compatible `usage` only with `include_usage`. Missing model: 404 with `error` text in
     both shapes.
  **Settled by the user, 2026-10-17:** (a) TP-31 accepts an unclosed final `<options>` array, for every
  provider (a Claude Code path change the user accepted, CE-2), built in slice 2 with the fixture
  replies as tests; (b) thinking is a per-model setting in Settings → Endpoints, *Off* by default
  (CE-52), sent by slice 1 and shown by slice 3.

# Slice 1. The endpoint provider in Rust

- `app/src-tauri/src/provider/endpoint.rs` (new): `EndpointProvider` implementing `InferenceProvider`
  (CE-10, CE-11, CE-13, CE-14). A blocking HTTP client fits IP-8's blocking call: reqwest's blocking client,
  already in the tree through the updater (slice 1, done).
  - Request: `system` as the first message, `prompt` as the user message, `stream: true`; on the
    compatible API `stream_options.include_usage`; on Ollama's native API `options.num_ctx` from the
    endpoint's context size (CE-32); thinking from the model's setting, as `think` (native) or
    `reasoning_effort: "none"` when off (compatible) (CE-52). No tools, ever.
  - Two readers behind one parser: SSE (`data:` lines, `[DONE]`) and Ollama's NDJSON. Text deltas go to
    the callback (IP-4); thinking is removed before the callback, from `reasoning_content` or inline
    `<think>…</think>` split across chunks, and counted as `thinking` (CE-51).
  - Usage from the last chunk (`usage`, or Ollama's `prompt_eval_count` / `eval_count`); none reported
    → `ceil(chars / 3)` estimates and an `estimated` flag on the result for the *≈* (CE-50).
    `costUsd` absent, `resolvedEffort` absent unless the preset takes `reasoning_effort` (CE-52; none of
    the local presets do yet).
  - Errors (CE-40, CE-42): one `classify_http` function with fixture tests; new `ErrorKind`s
    `Unreachable`, `KeyRejected`, `ContextTooLong` (kebab-case on the wire). Details never include
    request headers (the habit CE-73 needs in the cloud version).
  - Cancel: checked between reads, with a short read timeout so a silent socket still sees it; the
    connection is dropped (CE-11). Stall: the 120 s clock starts at the first byte (CE-41).
  - URL rule (CE-80): `http://` only for loopback, or for a LAN address whose endpoint is marked
    `lanConfirmed`; otherwise `https://`. Checked in Rust on every call, not only in Settings.
- Commands in `provider/commands.rs`: `generate` gains the dispatch (the CLI branch keeps its current
  body); new `endpoint_models` (`/v1/models`), `endpoint_context` (`/api/show` or `/props`) and the
  per-model *Test* through `generate` (CE-24).
- **Exit:** Rust tests on every fixture (ok, usage missing, thinking both ways, each error, stall after
  first byte, cancel mid-stream, URL rule); the 34 existing Rust tests unchanged and green; one ignored
  test against the user's real Ollama.
- **Done 2026-10-17**: `provider/endpoint.rs` and `endpoint_tests.rs`. Built as follows:
  1. **HTTP client: reqwest 0.12.28, blocking**, not `ureq`. The updater already builds that reqwest
     with rustls, so the lockfile gains three lines and no second HTTP or TLS stack.
  2. `generate` takes an optional `endpoint` argument beside the unchanged `Request`, so the CLI tests
     compile untouched. Without it, the CLI branch runs exactly as before.
  3. The HTTP read runs on its own thread, like the CLI's stdout reader. Cancel returns at once; the
     reader's next send then fails and dropping the response closes the connection, which stops Ollama.
  4. The stall clock starts at the **first body line**, not at the headers, because headers can come
     before the model has loaded (CE-41).
  5. The resolved model is named in Rust as `<endpointId>:<server's model>` (CE-23, CE-25).
  6. Ollama's input is reported like Claude's: the cached part goes to `cacheRead`.
  7. A web call sent to an endpoint is refused in Rust too (CE-55).
  8. The only CLI-side code changes are three new `ErrorKind`s and the optional `usageEstimated` flag,
     which the CLI parser sets to `None`; its JSON is unchanged.
  9. llama.cpp's `/props` is parsed from its documentation, and LM Studio uses the shared SSE reader;
     neither has a recording yet.
  Checks: 47 Rust tests (the 34 existing ones unchanged, 13 new) and the ignored real-Ollama test, in
  17.6 s on `gemma4:e2b`.

# Slice 2. Contract, routing and the fake endpoint

- `app/src/frame/provider.ts`: `ErrorKind` gains the three types; `Request` gains no field in the room
  API (rooms keep sending `model`). New `RoutingProvider` (above), placed under `ObservedProvider` so
  session health stays per provider: Claude Code health keeps SE-42, each endpoint has its own.
- `app/src/core/models.ts`: `parseModelId`, `isEndpointModel`, display names (*Ollama · gemma4:e4b*),
  `isValidModel` with `/` (settings amendment). `modelName` keeps its Claude behaviour.
- The fake providers (IP-71) gain an endpoint mode: a slow first byte (CE-41), every new error type,
  and a reply with a missing `<options>` block (CE-57 is TP-34).
- Learn's parser (`app/src/rooms/learn/protocol.ts`) accepts an unclosed final `<options>` array
  (TP-31, amended), tested with the three recorded replies that left it open, plus one cut short
  (still invalid). Check whether Choose's parser reads `<options>` the same way, and if so ask the user
  before changing it too.
- **Exit:** unit tests for id parsing, routing (Claude model → unchanged request, endpoint model →
  endpoint field, web call on an endpoint subject → Claude fallback chain), and the fakes.

# Slice 3. Settings → Endpoints

- `provider.endpoints` in the catalogue and `settings.ts` (validation, unknown keys kept, SE-2 to SE-6).
- `SettingsPanel.svelte`: the *Claude Code* section stays as it is and first; the **Endpoints** list
  follows (CE-20): add from a preset (Ollama, llama.cpp, LM Studio, Custom URL, CE-12), rename, remove,
  the LAN confirmation (CE-80); per endpoint the fetched models with pins, each pinned model's context
  size (read from the server, editable, CE-30) and thinking (*Off*, *On*, *Model default*, CE-52), and
  *Test* on one chosen model (CE-24). Nothing calls a
  server until the user presses something (IP-41's rule).
- The frame banner (CE-26): with an endpoint set and no Claude Code installed, *not installed* shows
  only when a Claude Code model is picked or used. With no endpoint, nothing changes.
- **Exit:** settings tests (round trip, validation, no key field); a Playwright pass on the list with
  the fake endpoint; the Claude Code section's existing tests unchanged.

# Slice 4. Pickers, meta line, Amber

- `ModelPicker.svelte` groups models (CE-22): *Claude Code* first with SE-48's list in order, then each
  endpoint's pinned models. With no endpoint it renders exactly as today, pinned by a test. Used by
  Settings' default model, Welcome (WG-2), the subject menu (RS-15) and Amber's model (CO-46).
- Endpoint models are marked *not evaluated* in the picker and the meta line (CE-56); the meta line
  names the endpoint (CE-25).
- Amber can run on an endpoint model (CO-46); its eval bar (CO-48) stays on Haiku 5.5.
- **Exit:** the first real use: a Learn subject lit on Gemma 4 E4B in the desktop build, and an Ask
  Amber question on it. **The point where the user may move the work to the feature branch (CE-6).**

# Slice 5. Context windows

- A frame helper gives a room its map budget for a model: CA-10's setting, capped for an endpoint
  model by its context size, less the system prompt, the dialogue and room for the reply (CE-31).
  Learn's and Choose's `buildContext` callers use it; their context functions do not change.
- A prompt that still does not fit fails as `context-too-long` before it is sent, with how to raise the
  size (CE-33).
- The default context size sent to Ollama: the spec's open point (32k, capped at the model's maximum,
  editable). Confirmed with the user on their first runs, then written into the spec.
- **Exit:** tests for the cap, the over-long refusal, and a Learn subject large enough to need the
  reduced form on a small context size.

# Slice 6. The local token line

- The stats hover and the Gallery show Claude and local tokens on separate lines once a local token
  has been spent; until then they look exactly as today (CE-53, WG-31). Records whose model has an
  endpoint prefix count as local (all endpoints are local in this version). The summary cache (SE-51)
  already keeps output tokens per resolved model; the local split is derived from it, adding the input
  tokens per model if they are missing.
- Amber's token figure in *Settings → Companion* follows the same rule.
- **Exit:** tests for both displays with and without local records; a Claude-only library shows the
  same figures as before.

# Slice 7. Errors and waiting

- The fix-it messages and single actions for `unreachable`, `model-unknown` (with the `ollama pull`
  line for Ollama), `context-too-long` and the HTTP `rate-limited` case, in Settings and on the node
  banner, one vocabulary (CE-40, SE-45).
- *Loading the model…* while an endpoint call waits for its first byte (CE-41), in the node's waiting
  state and in Amber's company line (CO-35).
- Choose: with no Claude Code installed, research tasks say they need it (CE-55); the other tasks run on
  the subject's model.
- **Exit:** each error shown with the fake endpoint in the browser preview; one real `unreachable`
  (Ollama stopped) and one real `model-unknown` in the desktop build.

# Slice 8. Verification and acceptance

- Every check: `npm run check`, the TypeScript tests, the Rust tests, Playwright. The Claude Code
  regression guard: the existing suites green, and in an installed build one Learn light-up, one Choose
  research call and one Ask Amber question on Claude Code, compared with v0.4.0.
- Real use on Gemma 4 E4B: Learn (intro, light-ups, a check answer, a reply), Choose's non-research
  tasks with research through Claude Code, Amber. Optionally the hand eval runner (`app/evals/`) pointed
  at the endpoint for a first impression; eval scores are Later (CE-60), so nothing gates on them.
- Acceptance checklist `app/ACCEPTANCE-ENDPOINTS.md`, passed by the user in an installed build.
- **Exit:** the user passes the checklist; then the agent asks the user whether to release the local
  version or wait for cloud (CE-5).

# Risks to retire early

| Risk | Where it is retired |
|---|---|
| A change leaks into the Claude Code path | The ground rule: CLI code and tests untouched; the routing tests of slice 2; the regression pass of slice 8 |
| Ollama's native stream differs from the compatible one | Slice 0 records both; slice 1 has one reader per format behind one parser |
| Gemma 4 E4B breaks the tagged blocks often | TP-34 already keeps the text; slice 4's first real use shows how often; the repair call stays Later unless it is frequent |
| A default context too large for the machine (slow, out of memory) | Slice 5 confirms the default on the user's first runs; the size is editable per model |
| Cancel does not interrupt a blocking read | Slice 1's short read timeout and its mid-stream cancel test |
| The new HTTP dependency grows the installer or pulls in OpenSSL | Slice 1 picks a rustls client and checks the installer size against v0.4.0 |

# Open

- The context size sent to Ollama by default (slice 5), from the spec's *Open*.
