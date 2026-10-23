---
type: Component
title: Endpoint provider and API keys
description: Calls to local and cloud OpenAI-compatible servers and Ollama, the key store in Windows Credential Manager, the frame's endpoint config, routing by model id, and Settings → Endpoints.
tags: [provider, endpoints, keys, routing, rust, settings]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-18T12:00:00Z }
resource: /app/src-tauri/src/provider
---

# Purpose

Besides Claude Code, a call can go to an endpoint the user added: Ollama, llama.cpp, LM Studio, NVIDIA
or any custom URL (v0.5.0). The Rust side is a second implementation of the provider trait; the frame
decides per call which one runs. The Claude Code path is unchanged (CE-2).

Contracts: [custom-endpoints](/specs/custom-endpoints.md) (CE-*) and
[inference-provider](/specs/inference-provider.md) (IP-*); settings keys in
[settings](/specs/settings.md). Landed in the [local](/plans/custom-endpoints-local.md) and
[cloud](/plans/custom-endpoints-cloud.md) plans (both deprecated). The earlier
[inference provider](/components/inference-provider.md) page is the PoC's CLI provider.

# Rust: `app/src-tauri/src/provider/`

| Module | For | Contract |
|--------|-----|----------|
| `endpoint.rs` | `EndpointProvider` | Blocking, streamed, no tools. `caps(preset)` is the one table of preset differences: wire format (Ollama's native NDJSON, everything else SSE), key need (`No` / `Optional` / `Required`), where model facts come from, whether `reasoning_effort` may be sent, whether a bare chat 404 means an unknown model. The request body carries system and prompt as two messages, the context size and thinking (CE-10, CE-13, CE-32, CE-52). Inline `<think>` text is filtered even across chunks (CE-51). One place maps HTTP and stream failures to `ErrorKind` (CE-40, CE-42). A 120 s stall clock starts at the first body line (CE-41). The model reported back is the one asked, with a different served name kept as `servedModel` (CE-27). Also `models()` and `model_info()` for the listing and a model's context size and thinking |
| `endpoint.rs` URL rule | `check_url` | `http://` only for this machine or a LAN address the user confirmed; `https://` everywhere else; no credentials in the URL (CE-80) |
| `keys.rs` | API keys | One generic credential per endpoint in Windows Credential Manager, local to this user and machine, with the host in the comment (CE-70, CE-72). `authorize` returns the key for one call only if the call is https and its host is the one the key was saved for; otherwise the call fails before anything is sent. `status` yields `{ set, last4, host }` and never the key (CE-71). `redact` replaces the key, its percent-encodings, `Authorization` values and bearer tokens with `[key]` in every error (CE-73). Buffers are zeroed (CE-74). Off Windows no key can be saved. Tests use an in-memory store, never the real one |
| `codex.rs` | `CodexCliProvider` | CE-58: `codex exec --json` with no shell, user config, rules or AGENTS.md, a read-only sandbox, live web search only for web calls, the system prompt in a temp `model_instructions_file`, the prompt on stdin. Its parser reads `agent_message`, `web_search`, `turn.completed` usage and `turn.failed`. `detect`, `signed_in` (`codex login status`), `classify_codex`. Shares `run_cli` (in `provider.rs`) with Claude Code. Built from docs; see the [Codex plan](/plans/codex-cli.md) |
| `process.rs` | CLI child processes | Starts the CLI hidden, wrapping `.cmd` shims, and puts it in a Windows job object so that cancel or exit kills the whole tree |
| `stream.rs` | Claude Code stream parser | Reads the CLI's JSON lines into text, tool uses (one count per tool id), usage and the result (IP-13, IP-19) |
| `commands.rs` | Tauri commands | `generate` runs an `EndpointProvider` when the request carries an `endpoint`, a `CodexCliProvider` for `cli: "codex"`, else `ClaudeCliProvider`; a registry of cancel flags per request id (CE-26). `cancel_generation`, `provider_status`, `codex_status`, `endpoint_models`, `endpoint_model_info`, and the key commands `set_endpoint_key`, `endpoint_key_status`, `remove_endpoint_key` |

# Frame: `app/src/frame/`

| Module | For | Contract |
|--------|-----|----------|
| `endpoints.ts` | The stored config | `provider.endpoints` read leniently (a malformed entry is skipped); `PRESET_CAPS` mirrors Rust's `caps` (thinking choices, key need); preset URLs; new-endpoint ids (`ollama`, `ollama-2`); model merge (short lists are pinned); `wireEndpoint` builds what Rust receives; `isCloudEndpoint` says whether subject text leaves the local network (CE-53, CE-81); the key host and LAN rules mirror Rust |
| `routing.ts` | `route`, `RoutingProvider` | A model id `<endpointId>:<model>` (CE-23, `core/models.ts`) goes to that endpoint with its bare id; any other id is a Claude Code call, unchanged. A web call never goes to an endpoint: it runs on Claude Code (CE-55). A `codex:<model>` id goes to Codex, web calls included (CE-58). An unknown endpoint is a `model-unknown` error. A prompt that cannot fit the model's set context size is refused before sending (CE-33). Each endpoint reports its own health |
| `provider.ts` | `DesktopProvider` | The `generate` invoke; adds `endpoint` only for endpoint calls, `cli: "codex"` only for Codex calls |
| `endpoint-keys.ts` | `KeyAdmin` | The key goes from the password field straight to Rust and the webview keeps only the status; a fake with the same refusals serves the browser build |
| `EndpointsSettings.svelte` | Settings → Endpoints | Add by preset, edit URL (a new LAN address needs confirmation; a cloud preset or a host change states where subject text goes, and a host change drops the key), list and filter models, per-model context size and thinking, *Test*, key save / replace / remove with confirmation. Nothing contacts a server until a button is pressed (IP-41) |
| `fake-endpoint.ts` | Browser build and tests | Stands in for the Rust commands (IP-71) |

# Behaviours worth knowing

- **The key never reaches the webview** after it is saved, and is read from the store at each call.
- **Errors are redacted at the source**, in `EndpointProvider::stream`, so no layer above sees a key.
- Extra error kinds for endpoints: `unreachable`, `key-rejected`, `context-too-long`; a 429 is
  `usage-limit` (CE-40).
- Amber and every room go through `RoutingProvider`, so any of them can use an endpoint model
  ([Amber](/components/amber-companion.md), [Choose](/components/choose-room.md)).

# Verification

Rust tests in `endpoint_tests.rs`, `keys_tests.rs` and `tests.rs`. Frame tests: `endpoints.test.ts`,
`endpoint-keys.test.ts`, `routing.test.ts`. Browser specs: `app/tests/endpoints.spec.ts`,
`endpoint-keys.spec.ts` (a planted key must never appear in the DOM or storage). Hand acceptance:
`app/ACCEPTANCE-ENDPOINTS.md` and `ACCEPTANCE-CLOUD.md`.
