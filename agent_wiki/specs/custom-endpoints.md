---
type: Spec
title: Custom endpoints
description: Models beyond Claude Code through one OpenAI-compatible provider - local servers first (Ollama, llama.cpp, LM Studio, any URL), then cloud APIs with keys (NVIDIA first) - endpoints in Settings, pinned models in every picker, context windows, Choose's web research, errors, usage and thinking, API key safety, and what must not change for the Claude Code path.
tags: [llm, provider, endpoints, ollama, llama-cpp, nvidia, api-keys, security]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-17T15:30:00Z }
verified: { by: "human:alex", at: 2026-10-17T16:00:00Z }
---

Source: spec workshop rounds 10–11 (2026-10-17, answers revisions 36 and 37). **Agreed by the user
2026-10-17**; the touched specs are amended (*Touches to other specs*). The implementation plan for
the local version is [custom-endpoints-local](/plans/custom-endpoints-local.md). Builds on the
[inference-provider](/specs/inference-provider.md) contract (IP-1 to IP-13), which stays as it is:
an endpoint is a second implementation of it, as [pluggable-inference-provider](/decisions/pluggable-inference-provider.md)
planned.

# Why

- **CE-1** Custom endpoints are for every reason offered in round 10: spending fewer Claude tokens,
  working offline, keeping subjects on the machine, using Lantern **without a Claude subscription**,
  trying other models, and lower latency (no CLI start-up, [llm-latency](/issues/llm-latency.md)).
- **CE-2** **The Claude Code path must not get worse.** Any change that touches how Claude Code calls
  behave, look or are counted is listed under *Touches to the Claude Code path* and agreed with the
  user before it is built (the user's round 10 note).

# Phases

- **CE-3** **The local version**: the provider, *Settings → Endpoints*, endpoint models in every
  picker, the Ollama, llama.cpp and LM Studio presets, a custom URL, and Amber on an endpoint model.
  **The cloud version**: API keys (CE-70) and the NVIDIA preset. **Later** ([backlog](/plans/backlog.md)):
  the Codex CLI provider (CE-58), Lantern's own web tools (CE-55), *Check this model* (CE-60), other
  cloud presets (OpenRouter, Groq, Mistral, DeepSeek, Together), the Anthropic API with a key, hand-run
  eval scores, the protocol repair call (CE-57, if ever needed), and models per task.
- **CE-4** The user's first model is **Gemma 4 E2B** (`gemma4:e2b`, Q4_K_M), served by Ollama; the user
  sets up Ollama and the model, and may try other models. Fixtures are first recorded against it.
  *(2026-10-17: E2B, not E4B as first said in round 11.)*
- **CE-5** **Versions** (the user, round 11): one version for the local phase, then one for the cloud
  phase, for now. The numbers are not fixed and need not be consecutive minor versions. When the local
  version is ready, the agent **asks the user** whether to release it or to wait and release local and
  cloud in the same version bump.
- **CE-6** **Branches** (the user, round 11): the work starts in a worktree. When the user judges the
  implementation good enough (at the latest once the local endpoint can be tested), it moves to a
  dedicated feature branch to be finished there. Only the user decides when that branch merges into
  `master`.

# The endpoint provider

- **CE-10** One provider, `OpenAiCompatProvider`, implements the contract over HTTP:
  `POST {baseUrl}/chat/completions` with `stream: true` and `stream_options.include_usage: true`,
  reading server-sent events. `system` becomes the first message (role `system`), `prompt` the user
  message (IP-2).
- **CE-11** Every request is made **from Rust**, never from the webview: no CORS or content-security
  change, cancel drops the connection (IP-28's equivalent), and keys never reach the UI (CE-71).
- **CE-12** A **preset** fills in an endpoint: base URL, whether a key is needed, how models are listed,
  how the context window is read (CE-30), and whether `reasoning_effort` is accepted (CE-52).

| Preset | Base URL | Key | Phase |
|---|---|---|---|
| Ollama | `http://localhost:11434/v1` | no | local |
| llama.cpp (`llama-server`) | `http://localhost:8080/v1` | no | local |
| LM Studio | `http://localhost:1234/v1` | no | local |
| Custom URL | entered | optional (cloud version) | local |
| NVIDIA | `https://integrate.api.nvidia.com/v1` | yes | cloud |

- **CE-13** Calls carry **no tools** (IP-60's spirit): an endpoint call can only return text.
- **CE-14** Each call has its own `request_id` and cancel token; the one-generation-per-subject rule
  stays the app's (IP-50 to IP-52).

# Endpoints and models

- **CE-20** *Settings → Provider* gains an **Endpoints** list: add (from a preset), rename, test,
  remove. *Claude Code* stays the first entry and keeps its section (SE-40 to SE-47).
- **CE-21** An endpoint's models are fetched from `GET /v1/models` on *Test* and when a picker opens,
  cached per endpoint. The user **pins** the models they use; pickers show only pinned models. A model
  that is not listed can still be typed in, as with SE-48.
- **CE-22** Every model picker (Settings' default model, Welcome WG-2, the subject menu RS-15, Amber's
  model CO-46) groups models by endpoint: *Claude Code · Opus 5.5*, *Ollama · gemma4*,
  *NVIDIA · …*. A subject or Amber can use any pinned model.
- **CE-23** A model on an endpoint is stored as `<endpointId>:<modelId>` (for example
  `ollama:gemma4`). A value with no endpoint prefix is a Claude Code model, so existing subjects and
  settings keep their meaning with no migration.
- **CE-24** **Test** works on **one model at a time**, chosen in the endpoint's row, which matters for
  NVIDIA's long catalogue. It lists the models, then makes one tiny call on the chosen model, and shows
  the result like IP-41. Nothing runs automatically.
- **CE-25** The node meta line names the endpoint: *Ollama · gemma4 · 4.1k in / 900 out · 6 s*.
- **CE-26** **Lantern works with no Claude Code installed** once an endpoint is set: the *not installed*
  banner shows only when a Claude Code model is picked or used.

# Context window

- **CE-30** Each pinned model has a **context size**, read from the server when it reports one (Ollama
  `/api/show`, llama.cpp `/props`) and editable in Settings.
- **CE-31** Before sending, Lantern fits the map budget (CA-10) inside the context size, less the
  system prompt, dialogue and room for the reply. The map shrinks through the existing reduced form
  (CA-1), never by cutting the prompt.
- **CE-32** Ollama silently drops the start of a prompt that does not fit, so Lantern **sets the size**
  on each Ollama request. Ollama's OpenAI-compatible endpoint cannot, so the Ollama preset sends its chat
  calls to the native `POST /api/chat` with `options.num_ctx` (round 11); the model list, errors and
  everything else stay on the shared provider. This is the provider's only per-server exception, with
  its own fixtures.
- **CE-33** A prompt that still does not fit fails as **context-too-long** (CE-40) before it is sent,
  with how to raise the size.

# Errors

- **CE-40** Endpoint failures map to the IP-10 vocabulary, with these types and messages:
  | Type | Detected from | What the user sees |
  |---|---|---|
  | `unreachable` | connection refused, DNS failure | Local: "Ollama isn't running at localhost:11434. Start it, then *Check again*." Cloud: the `network` message. |
  | `key-rejected` | 401, 403 | "NVIDIA rejected the API key." *Replace key* (cloud version). |
  | `model-unknown` | 404, or the model is not on the server | For Ollama: "Run `ollama pull gemma4` first." |
  | `rate-limited` | 429 | The wait, when `Retry-After` gives one; *Try again*. |
  | `context-too-long` | CE-33, or the server's error | How to raise the context size. |
  | `protocol` | unreadable event stream, stall | as IP-10 |
  | `cancelled` | the user | as IP-10 |
- **CE-41** **Loading a model** can take a minute on a local server: the stall timeout (IP-31, 120 s)
  starts only after the first byte, and a generation that waits for its first byte says *loading the
  model…*.
- **CE-42** Detection lives in one function with recorded-fixture tests, as IP-11; raw responses are
  shown under *Details* only, with the `Authorization` header and any key removed (CE-73).

# Usage, thinking and effort

- **CE-50** Usage comes from the stream's last chunk. When the server reports none, it is estimated
  (CA-11's rule) and shown with *≈*. `costUsd` stays absent.
- **CE-51** Thinking (`reasoning_content`, or inline `<think>…</think>`) is **removed before the text
  reaches the parser or the UI**, and counted as `thinking` tokens.
- **CE-52** `effort` maps to `reasoning_effort` when the preset says the server accepts it, otherwise
  it is ignored and reported as such (IP-3). *(Amended 2026-10-17, slice 0, by the user.)* On a local
  endpoint, thinking is **set per pinned model in Settings**, an advanced control: *Off*, *On* or
  *Model default*, default *Off* (Gemma 4 thinks by default, which roughly doubled reply time on the
  user's CPU). Lantern sends it as `think` (Ollama native) or `reasoning_effort: "none"` when off
  (compatible API). A subject's effort is then ignored on that model (`resolvedEffort` absent, IP-3).
- **CE-53** Once a local token has been spent, the stats hover and the Gallery show **Claude** and
  **local** tokens on separate lines; cloud endpoints count with Claude. Until then they look exactly
  as today (CE-2).

# Rooms

- **CE-55** **Choose's web research** (CR-40) runs on a **CLI provider with web tools**: Claude Code
  now, Codex once it exists (CE-58). Choose's other tasks follow the subject's model, and the log shows
  both. With no such CLI installed, Choose says research needs one. NVIDIA's API has no hosted search
  (to be confirmed against its docs in the cloud phase), so research on NVIDIA or a local model needs
  **Lantern's own web tools**: a search API, page fetching in Rust and a tool-calling loop. The user
  wants them eventually; they are Later and get their own spec round.
- **CE-56** **Any model** can be picked; an endpoint model is marked *not evaluated* in the picker
  and the meta line, since no endpoint model is eval-gated in the local or cloud version.
- **CE-57** **When an endpoint model breaks the tagged-block protocol** (a light-up or *More options*
  with no, or a malformed, `<options>` block), the explanation is **kept**, the node is lit with no new
  children, and a note says the model gave no options, with *More options* to try again. This is
  already every provider's behaviour ([tutor-protocol](/specs/tutor-protocol.md) TP-34,
  [learn-room](/specs/learn-room.md) LR-66), so nothing changes for Claude Code and nothing new is
  built; endpoint models will meet it more often. A repair call is Later, if ever needed.
- **CE-58** **Codex** (the user's round 10 note): a second CLI provider beside Claude Code, using a
  ChatGPT plan (`codex exec --json`), with its own detection, flags, event stream, errors and fixtures.
  It has its own version, scheduled once the user has a Codex plan to test with ([backlog](/plans/backlog.md)).

# Check this model (Later)

- **CE-60** Later (round 11): **Check this model** would run the rooms' code-checked eval cases (Learn,
  Choose's non-research cases, Amber) on a pinned model and show a score per room, replacing *not
  evaluated* (CE-56). Until then the eval runner in `app/evals/` stays the way to measure a model by
  hand.

# API keys (cloud version)

The user asked for the safest way. These rules are the security spec IP-63 requires.

- **CE-70** A key is entered **once, in the app**, in a password field, and sent straight to Rust,
  which stores it in **Windows Credential Manager**, one entry per endpoint (target
  `Lantern/endpoint/<endpointId>`). It is never written to `settings.json`, a subject file, a log or
  the state file (SE-7).
- **CE-71** **The key never goes back to the webview.** After saving, Settings shows only that a key is
  set, with its last 4 characters, *Replace* and *Remove*. Rust reads the key at each call and adds the
  `Authorization` header itself.
- **CE-72** A key is only ever sent over **`https://`**, to the host it was saved for. Changing an
  endpoint's host removes its key.
- **CE-73** Keys and `Authorization` headers are removed from every error, *Details* text and
  diagnostic before it leaves Rust. Tests check this with a planted key.
- **CE-74** The key's memory is cleared after use where Rust allows it, and the key is never put in a
  prompt, a URL or an environment variable of a child process.
- **CE-75** Removing an endpoint removes its key from the credential store.
- **CE-76** Replacing or removing a key asks for confirmation. A saved key is never shown again, by
  design: no control in the UI can read it back.

# Network and privacy

- **CE-80** `http://` is allowed for this machine (localhost, 127.0.0.1, ::1) and for a **LAN address
  the user confirms once**; every other endpoint needs `https://`.
- **CE-81** Adding a cloud endpoint says once, before saving, that subject text goes to that host.
- **CE-82** Lantern never starts, installs or updates a model server.

# Testability

- **CE-90** Stream parsing and error detection are tested against **recorded SSE fixtures** (ok, usage
  missing, `reasoning_content`, inline `<think>`, each error type, a stall, a cancel), as IP-70.
- **CE-91** The fake provider (IP-71) can play an endpoint, including a slow first byte (CE-41).

# Touches to the Claude Code path

Agreed by the user in round 11 (CE-2). Someone who never adds an endpoint sees no change.

1. The model pickers group models by endpoint (CE-22); with no endpoint there is only the *Claude
   Code* group, in today's order.
2. A *local* token line appears only once a local token is spent (CE-53).
3. With an endpoint set and no Claude Code installed, the *not installed* banner shows only when a
   Claude model is picked or used (CE-26).

Refused: the protocol repair call on Claude (CE-57). Stored ids (CE-23), the CLI provider, its
errors, its timeouts and Choose's research stay as they are.

# Touches to other specs

Applied 2026-10-17, each marked *Amended 2026-10-17* in place:

- [inference-provider](/specs/inference-provider.md): IP-10's taxonomy gains `unreachable`,
  `key-rejected` and `context-too-long` for endpoints (CE-40); IP-31's stall clock starts at the first
  byte on endpoints (CE-41); IP-63 points to CE-70 to CE-76 as its security spec.
- [settings](/specs/settings.md): *Settings → Provider* gains the Endpoints list (CE-20, CE-21, CE-24);
  SE-7 points to CE-70; SE-46 and SE-48's pickers group models by endpoint and accept
  `<endpointId>:<modelId>` (CE-22, CE-23), with `/` allowed in ids; SE-40 is the Claude Code entry and
  the *not installed* banner follows CE-26; a new `provider.endpoints` key, with no key ever (CE-70).
- [context-assembly](/specs/context-assembly.md): CA-10's budget is also capped by the model's context
  size (CE-31).
- [choose-room](/specs/choose-room.md): CR-40's research runs on a CLI provider with web tools (CE-55).
- [learn-room](/specs/learn-room.md) and [tutor-protocol](/specs/tutor-protocol.md): no change; TP-34
  and LR-66 already give CE-57's behaviour.
- [companion](/specs/companion.md): CO-46's model picker offers endpoint models.
- [welcome-gallery](/specs/welcome-gallery.md): WG-31's *tokens spent* gains the local line (CE-53).

# Open

Implementation-time only:

- *(Settled 2026-10-17, slice 5.)* A size read from Ollama starts at **32k tokens**, capped at the
  model's maximum and editable per model. Ollama reports the maximum (131072 for Gemma 4 E2B), not what
  the machine can hold, and ran compatible-API calls at that full size when none was sent. A size read
  from llama.cpp is its launch size, kept as is. The first real runs on Gemma 4 E2B at 32k worked
  (slice 4).
- Each server's exact error wording and events, captured as fixtures (CE-42, CE-90); Ollama's are in
  `app/src-tauri/fixtures/endpoint/` (slice 0).
- Slice 0's two questions are settled: TP-31 accepts an unclosed final `<options>` array for every
  provider (the user accepted this change to the Claude Code path, CE-2); thinking is a per-model
  setting (CE-52).

Related: [inference-provider](/specs/inference-provider.md), [settings](/specs/settings.md),
[context-assembly](/specs/context-assembly.md), [choose-room](/specs/choose-room.md),
[companion](/specs/companion.md), [platform-quality](/specs/platform-quality.md).
