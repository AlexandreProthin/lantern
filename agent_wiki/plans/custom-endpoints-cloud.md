---
type: Plan
title: Custom endpoints plan, cloud version
description: The cloud phase of custom endpoints, on top of the accepted local version - API keys in Windows Credential Manager and never in the webview, the NVIDIA preset, the consent step, cloud tokens counted with Claude, real use on NVIDIA's Gemma 4 - then one release for local and cloud together.
tags: [plan, endpoints, nvidia, api-keys, security]
status: draft
stale_after: 2027-03-31T00:00:00Z
generated: { by: claude-code/opus-5.5, at: 2026-10-17T21:00:00Z }
---

Written 2026-10-17, after the local version passed its acceptance
([custom-endpoints-local](/plans/custom-endpoints-local.md)). The contract is the cloud part of
[custom-endpoints](/specs/custom-endpoints.md): CE-3 (API keys and the NVIDIA preset), CE-70 to CE-76
(keys), CE-72 and CE-80 (https), CE-81 (consent), CE-53 (cloud tokens count with Claude), CE-40
(`key-rejected`, rate limits) and CE-55 (confirm that NVIDIA has no hosted web search). This plan orders
the work and says when each part counts as done; it does not restate requirements.

# Ground rules

The local plan's rules hold. In particular:
- **The Claude Code path must not get worse (CE-2).** The local version's behaviour must not change either:
  a keyless endpoint calls exactly as it does now.
- **Branch:** the work continues on `claude/lantern-custom-endpoints`, one commit per slice. Only the user
  merges into `master`.
- **Version (CE-5, decided 2026-10-17):** local and cloud ship in **one version bump**, its number chosen
  by the user at slice 6. Nothing is released before that.
- **Keys are the user's.** The agent never types, reads, prints or stores a real key. The user enters
  theirs in the app, or sets it in their own terminal for the recording script. Tests use planted fake
  keys.

# Slice 0. Fixtures from NVIDIA

- The user runs `app/src-tauri/fixtures/endpoint/record.py` against
  `https://integrate.api.nvidia.com/v1`, with the key in an environment variable set in their own
  terminal. The script gains a `--key-env NAME` option: it reads the key from that variable, sends it as
  `Authorization: Bearer …`, and writes response bodies only, never headers.
- Record:
  - the model list (long);
  - a streamed reply on the user's Gemma 4 model, with and without `stream_options.include_usage`;
  - whatever thinking the model emits;
  - a request carrying `reasoning_effort` (accepted, ignored, or refused?);
  - the 401 for a bad key (the user passes a made-up key);
  - a 404 for an unknown model;
  - an over-long prompt;
  - a 429 if the free tier gives one.
- After recording, a check that no fixture contains the key: the script compares every body against the
  variable's value and refuses to save a match.
- Read NVIDIA's API documentation for a hosted web search, to settle CE-55's *to be confirmed*.
- **Exit:** the fixtures, the README table extended, CE-55's note settled in the spec.
- **Script ready 2026-10-17**: `record.py` gains `--preset nvidia`, `--key-env`, `--list` and the leak
  check: a body or header containing the key is not saved. It refuses to send a key over http. The two
  bad-key cases use a made-up key, and only safe headers are kept. Checked offline against a simulated
  server that echoes the key; Ollama mode is unchanged. The user's commands are in
  `app/src-tauri/fixtures/endpoint/README.md`. Waiting for the user's run.
- **First runs 2026-10-17 (partial)**:
  - The user's key works for the model list. `google/gemma-4-31b-it` never answered: NVIDIA's queue for
    it was very long. The user switched to `nvidia/nemotron-3.5-super-vl-120b-a12b` and keeps it from now
    on.
  - That model answered every chat case at once with **HTTP 500** *Failed to generate completions*.
  - Recorded anyway, and they change slice 2:
    1. The model list is public (a made-up key gets 200), so *Test* must make a chat call to check a key.
    2. A bad key is a **403** problem+json, not a 401. The classification already treats 403 as
       `key-rejected`.
    3. An unknown model is a plain-text **404** `404 page not found`. Today's rule calls a 404 that names
       no model `unreachable`, so NVIDIA needs its own rule: 404 on the chat route means `model-unknown`.
    4. The 500 maps to `process-crashed`, *NVIDIA reported a server error*.
  - **CE-55 checked**: NVIDIA's API documentation and a web search found no hosted web search, only
    OpenAI-style tool calling, where the caller runs the tool. Research on NVIDIA therefore stays with
    *Lantern's own web tools*, Later.
  - **The probes, the same evening**: all three answered (200, `Nvcf-Status: fulfilled`, 19 to 41 s),
    the system message included, so the 500s were transient. What they show, for slice 2:
    1. Thinking is on by default and heavy: in `delta.reasoning_content` (already stripped), about 75 % of
       output tokens (`reasoning_tokens` reported).
    2. Usage comes in the stream even without `include_usage`.
    3. The `<options>` block is closed.
    4. **The response names another model**, `private/nvidia/nemotron-3.5-super-120b-a12b`. Lantern
       stores the server's name today (`<endpointId>:<server's model>`), which would match no pinned model,
       so lookups (context size, labels, pickers) would miss it. The NVIDIA preset must keep the id it asked
       for.
- **Done 2026-10-17**, with the user's full run. There are 13 NVIDIA fixtures, none holding anything
  key-shaped. Beyond the probes:
  1. **Thinking cannot be turned off on this model.** `reasoning_effort: "none"` and
     `chat_template_kwargs.enable_thinking: false` are both refused at once with the 500, while plain calls
     answer in about 8.5 s. So the NVIDIA preset sends neither: its thinking choice is *Model default* only,
     and Settings says so.
  2. About 200k tokens of prompt were accepted (window about 1M), so there is no over-long fixture. The
     *context-too-long* path rests on Lantern's own check (CE-33) and the classification's text rules.
  3. **The model name**, decided with the user: Lantern stores the id the user picked (so pins, context
     size and labels keep working), logs the name the server answered with beside it (`servedModel`), and
     **warns** when they differ: on *Test*, in the node meta line, and in the endpoint's row in Settings.
     This is for slice 2.

# Slice 1. Keys in Rust

- `provider/keys.rs` (new) stores keys in Windows Credential Manager through `windows-sys`
  (`CredWriteW`, `CredReadW`, `CredDeleteW`, feature `Win32_Security_Credentials`; no new crate). There
  is one generic credential per endpoint, target `Lantern/endpoint/<endpointId>`, whose comment holds the
  host the key was saved for (CE-70, CE-72).
- Commands:
  - `set_endpoint_key(endpointId, baseUrl, key)` refuses a non-`https` URL;
  - `endpoint_key_status(endpointId)` returns `{ set, last4, host }`, never the key (CE-71);
  - `remove_endpoint_key(endpointId)`.
  A key in memory is wiped after use with `zeroize`, already in the tree through rustls (CE-74).
- The endpoint provider reads the key at each call. It adds `Authorization` itself, only when the call's
  host is the stored host and the scheme is `https`. Otherwise the call fails before sending, saying the
  key belongs to another address (CE-72).
- Redaction (CE-73): every error, *Details* text and diagnostic leaving Rust has `Authorization` headers
  and the key's value replaced by `[key]`. Tests plant a fake key and look for it in every error path
  (HTTP error bodies that echo it, transport errors, stream errors).
- **Exit:** unit tests for the host binding, the https refusal and redaction; one ignored test against
  the real credential store with a fake key, which it removes again. The local version's tests are
  unchanged.
- **Done 2026-10-18**, on its own branch `claude/custom-endpoints-keys-71080d` (cut from
  `claude/lantern-custom-endpoints`; the user decides when it merges back).
  - `provider/keys.rs`: one generic credential `Lantern/endpoint/<endpointId>` (`CRED_PERSIST_LOCAL_MACHINE`,
    so it does not roam), the host in its comment. Read with `CredReadW`, copied into a `Zeroizing` buffer,
    and the system's copy zeroed before `CredFree`. `zeroize = "=1.9.0"` is a direct dependency now, and
    `windows-sys` gained `Win32_Security_Credentials`. There is a non-Windows stub with no store.
  - Commands `set_endpoint_key`, `endpoint_key_status` (`{ set, last4, host }`) and `remove_endpoint_key`,
    registered in `lib.rs`. The id follows the frontend's rule.
  - The provider reads the key at each call (stream, `models`, `model_info`), for the URL it is about to
    call, and adds `Authorization: Bearer …` itself. The header value is marked sensitive. An endpoint with
    no key sends exactly what it did; a test checks that no `Authorization` goes out.
  - Redaction: the stream and `get_json` each have a single exit that rewrites `details` and `model`. It
    replaces the key's value (as is, and percent-encoded in upper and lower hex), any `Authorization`
    value, and any `Bearer` token with `[key]`.
  - Decisions to review:
    1. The bound host is `host`, or `host:port` when the port is not the default one.
    2. A key saved for another host, or a call that is not https, fails as `key-rejected`, so slice 3's
       *Replace key* applies. The text says the key was saved for another address.
    3. Keys must be RFC 6750 `b64token`s (letters, digits, `-._~+/`, trailing `=`, at most 2560). Such a
       key reads the same inside JSON, so every echo of it is found.
    4. `last4` is withheld for a key under 8 characters.
    5. If the store cannot be read, an http endpoint goes on keyless, since no key could be sent anyway,
       while an https call fails.
    6. Tests never touch Credential Manager: under `cfg(test)` the store is an in-memory map. A
       `cfg(test)`-only thread flag lets a test send a planted key to its own `127.0.0.1` server over http
       (no TLS offline). The shipped build cannot do this.
  - Limits: copies inside reqwest/hyper and Tauri's IPC buffers cannot be wiped from here (CE-74's
    "where Rust allows it"). A server that writes the key into the **reply text** is not redacted: the
    text streams out chunk by chunk, and only errors and model names are covered.
  - Tests: 10 new in `provider/keys_tests.rs`. They cover the id and key rules, the https-only save,
    status never holding the key, the host binding and http refusal before any connection opens, keyless
    calls sending no header, the bearer header, and planted keys absent from every error path: a 401 that
    echoes the header, a 403 problem+json echoing the key raw and percent-encoded, a stream error and a
    served model name holding it, a refused connection, a cut stream. Redaction also has its own table.
    The ignored `real_credential_store_round_trip` was run once: it passed, and `cmdkey` shows the entry
    gone. `cargo test --offline --lib`: **58 passed, 9 ignored** (48 and 8 before, unchanged).

# Slice 2. The NVIDIA preset and per-preset capabilities

- A preset table in one place, in Rust and its mirror in `frame/endpoints.ts`. For each preset: base URL,
  whether a key is needed, how models are listed, how the context size is read, and **whether
  `reasoning_effort` is accepted** (CE-12, CE-52). Today the thinking setting sends `reasoning_effort:
  "none"` to every compatible server, and NVIDIA may refuse it (slice 0 says). Ollama, llama.cpp and LM
  Studio keep their current requests byte for byte, which a test pins.
- NVIDIA: `https://integrate.api.nvidia.com/v1`, key required, models from `/v1/models`. The context size
  is entered by the user unless the list reports one.
- Custom URL: a key is optional, and only allowed with `https` (CE-72).
- `classify_http` gets NVIDIA's wording from the fixtures: 401 `key-rejected`, 404, 429 with its
  `Retry-After`, and the over-long prompt.
- **Exit:** fixture tests for NVIDIA's stream, usage and errors; the local presets' request bodies
  unchanged.
- **Done 2026-10-18**, on the same branch as slice 1, after the user said in the session to go on with the
  slices that need nothing from them.
  - Rust `caps(preset)` (`provider/endpoint.rs`) holds each preset's format, key need (`No`, `Optional`,
    `Required`), the source of model facts, whether thinking *Off* may be sent as
    `reasoning_effort: "none"`, and NVIDIA's rule that a 404 on the chat route is `model-unknown`
    (`classify_chat`). `frame/endpoints.ts` mirrors what the frontend needs as `PRESET_CAPS`: the key need
    and the thinking choices.
  - NVIDIA: `https://integrate.api.nvidia.com/v1`, models from `/v1/models`, the context size entered by
    the user (the list reports none). `reasoning_effort` is never sent. Thinking offers *Model default*
    only, and Settings says NVIDIA cannot turn it off. A stored *Off* reads as *Model default*. A chat call
    without a saved key fails before sending (`key-rejected`). `Retry-After` was already kept in *Details*.
  - CE-27: `Completion.model` is now always `<endpointId>:<the id asked for>`, and `servedModel` holds a
    different name the server answered with. Learn, Choose and Amber's log store it. The node meta line,
    *Test* and the endpoint's row say *answered as …*. This applies to every endpoint, since a local
    server answering with the asked name changes nothing. The CLI path only gains `served_model: None`,
    which never serializes.
  - The local presets' request bodies are pinned byte for byte, `reasoning_effort` included, so Ollama,
    llama.cpp, LM Studio and Custom URL send exactly what they did.
  - Tests: Rust 64 passed, 9 ignored. There are 6 new endpoint tests: the preset table, the pinned bodies,
    NVIDIA's stream and usage (95 in, 1006 out, 744 thinking), its errors (403, the bare 404, 500, 429, the
    81 models), the missing key, and the served name. Keys tests now cover a served name holding the key.
    TS 207 passed. Playwright's endpoints and settings specs pass; one endpoints test timed out on its
    first, cold run, then passed twice alone.

# Slice 3. Settings: keys, consent, the long catalogue

- Adding a cloud endpoint (NVIDIA, or a Custom URL whose address is not this machine) shows once, before
  saving, that subject text goes to that host, with *Add* and *Cancel* (CE-81).
- The key field is a password field with *Save key*, which sends the key straight to Rust and clears the
  field. Afterwards the row shows only *Key set · …ab12*, with *Replace* and *Remove*, each confirmed
  (CE-70, CE-71, CE-76). No API returns the key to the webview, so no control can show it. Changing the
  URL's host removes the key, after saying so (CE-72). Removing the endpoint removes its key (CE-75).
- NVIDIA lists over a hundred models, so the model list gains a filter field. Nothing is pinned by
  default (CE-21 already pins nothing above 20).
- `key-rejected` offers *Replace key* (CE-40).
- **Exit:** Playwright with a fake key admin (the key never stored by the fake either), and unit tests
  that `settings.json` never holds a key, whatever the user types where.

# Slice 4. Cloud tokens count with Claude

- `isLocalModel` (frame/token-split.ts) looks at the endpoint's preset: NVIDIA, and a Custom URL that is
  not this machine or a confirmed LAN address, count with Claude (CE-53). Local endpoints and Claude-only
  figures are unchanged.
- The rate-limit message names NVIDIA and the wait when `Retry-After` gives one (CE-40).
- **Exit:** token-split tests with all three kinds of record.

# Slice 5. Real use on NVIDIA

- The user enters their key in the desktop build (from this branch). The agent then runs, through the
  app: *Test*, a Learn subject on NVIDIA's Gemma 4 (intro, light-up), Choose's non-research tasks, and Ask
  Amber.
- The key search: a script the agent writes and the user runs in their own terminal, with the key in an
  environment variable, looks for the key in `settings.json`, the subjects, `amber-log.jsonl`,
  `state.json`, the app's logs and the webview's storage folder. It prints only *found* or *not found*
  per file, so no part of the key ever reaches the chat.
- **Exit:** the runs and the search recorded here, like the local plan's slice 4.

# Slice 6. Verification, acceptance, the release

- Every check. The regression pass covers Claude Code as in v0.4.0, and the local endpoints as accepted
  (`app/ACCEPTANCE-ENDPOINTS.md` stays valid).
- An acceptance checklist `app/ACCEPTANCE-CLOUD.md`: keys, consent, NVIDIA in Learn, Choose and Amber,
  tokens, errors (bad key, rate limit), the key search, and removal.
- Then, on the user's word: the version number for local and cloud together, the version bump, the signed
  installer, the update launch over v0.4.0, `master`, the tag and the release, as for v0.4.0.

# Risks to retire early

| Risk | Where it is retired |
|---|---|
| A key leaks into a file, a log, an error or the webview | Slice 1's planted-key tests; slice 3's settings tests; slice 5's search |
| NVIDIA refuses a parameter the local presets send (`reasoning_effort`) | Slice 0 records it; slice 2's per-preset capabilities |
| The key is sent to the wrong host after a URL change | Slice 1's host binding, checked in Rust at every call |
| The long catalogue makes the list unusable | Slice 3's filter; nothing pinned by default |
| Free-tier rate limits make NVIDIA feel broken | Slice 4's message with the wait; slice 5 measures it |
| The local version regresses | Its tests and request bodies pinned; slice 6's regression pass |

# Open

- *(Settled, slice 0.)* The NVIDIA model is `nvidia/nemotron-3.5-super-vl-120b-a12b`, the user's choice.
- The version number for the joint release (slice 6, the user).
