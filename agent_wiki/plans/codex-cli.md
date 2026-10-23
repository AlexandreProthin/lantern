---
type: Plan
title: Codex CLI provider
description: Codex as a second CLI provider beside Claude Code (CE-58), built from OpenAI's published docs and event schema without a Codex plan to test with - what was built, what is assumed, and what a first real run must check before release.
tags: [plan, provider, codex, cli]
status: draft
stale_after: 2027-04-30T00:00:00Z
generated: { by: claude-code/opus-5.5, at: 2026-10-22T22:30:00Z }
---

Started 2026-10-22 at the user's request, on branch `claude/codex-cli-provider`. The user has no Codex plan
to test with, so everything below was built from OpenAI's documentation and source (October 2026) and
checked only with unit tests, written fixtures and the browser fake. Contract:
[custom-endpoints](/specs/custom-endpoints.md) CE-58 and CE-55. Code: [endpoint provider](/components/endpoint-provider.md).

# What was built

- **Rust, `provider/codex.rs`**: `CodexCliProvider` runs `codex exec --json` with the prompt on stdin
  (`-`). The flags are `--ephemeral --skip-git-repo-check --ignore-user-config --ignore-rules --color never
  --sandbox read-only`. The config overrides are `approval_policy="never"`, `features.shell_tool=false`,
  `project_doc_max_bytes=0`, `web_search="disabled"` (or `"live"` for a web call, CE-55),
  `model_reasoning_effort` from the subject's effort, and `model_instructions_file` pointing at a temp
  file that holds the system prompt (removed after the call). `--model` is sent only when a model is picked.
- The spawn, stdin, read, stall and cancel loop moved out of `ClaudeCliProvider` into `run_cli`, shared
  by both CLIs; Claude Code's arguments and parsing did not change (CE-2).
- **Parser**: `agent_message` items are the answer, streamed from `item.updated` when Codex sends them;
  a `web_search` item is one *WebSearch* tool use that starts the text over (IP-13); `turn.completed`
  gives the usage (cached tokens apart from input, reasoning as thinking); `turn.failed` fails the call;
  an `error` event fails it only when no turn completes (Codex sends them for retries it recovers from).
  The pre-0.44 names (`item_type`, `assistant_message`) are read too.
- **Commands**: `generate` takes `cli: "codex"`; `codex_status` reports found or not, the version and
  `codex login status`. Codex is looked for only when asked, never at start-up.
- **Frame**: Codex models are `codex:<model>` (`codex:default` lets Codex choose); no endpoint may take
  the `codex` id. `provider.codex` (absent means off; *Reset* keeps it) adds a *Codex* group to every
  picker: *Codex default*, GPT-6.1 Sol, GPT-6 Astra, GPT-6 Luna, from OpenAI's model page. Routing sends
  Codex models, web calls included, to Codex; results keep the model as picked and report to Codex's own
  health. Codex tokens count with Claude (cloud). The meta line keeps the effort. Settings → Provider →
  *Codex*: the switch, found, version, signed in, *Test*, install and sign-in instructions.
- Errors read in Codex's words (`strings.codex.errors`); the Claude Code banner stays down while a Codex
  model is in use (CE-26 extended).
- Tests: 6 Rust (2 written fixtures, `fixtures/provider/codex-*.jsonl`, plus one ignored real call),
  5 Vitest, 2 Playwright against the fake (`?codexError=`).

# Assumptions a real run must check

1. The flags and config keys above are accepted by the installed Codex (`--ignore-user-config` and
   `--ignore-rules` are recent; an older Codex refuses unknown flags).
2. `--ignore-user-config` keeps the ChatGPT sign-in working (the docs say auth still uses `CODEX_HOME`);
   a user with `cli_auth_credentials_store = "keyring"` may need it kept.
3. `model_instructions_file` replaces Codex's coding-agent instructions well enough for the tutor protocol.
4. Whether `agent_message` text streams through `item.updated` or arrives whole at the end.
5. The wording of not-signed-in, usage-limit and unknown-model failures (the classifier guesses).
6. The model ids offered on the user's plan, and the efforts each accepts (`max` is not on every model).
7. Web search with `web_search="live"` in a read-only sandbox, for Choose's research.

# Before release

- Record real fixtures (a plain call, a web call, a not-signed-in run, an unknown model) and replace the
  written ones; run `cargo test real_codex_call -- --ignored`.
- Run the eval runner on a Codex model for Learn and Choose; the models stay *not evaluated* until then.
- Only the user decides when the branch merges into `master` (CE-6).
