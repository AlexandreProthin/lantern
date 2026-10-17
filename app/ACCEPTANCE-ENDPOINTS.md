# Custom endpoints acceptance (local version, plan slice 8)

The user goes through this list in an installed build, with the real Claude Code CLI and a real local server.
Automated checks (unit tests, Playwright with the fake endpoint, the Rust fixture tests) do not sign these off.
The contract is `../agent_wiki/specs/custom-endpoints.md` (CE-1 to CE-91, local version) and the specs it amended
(marked *Amended 2026-10-17*); the order of work is `../agent_wiki/plans/custom-endpoints-local.md`.

**Build:** a preview installer from the feature branch (`npm run installer:preview`, see `README.md`). The version
number is not chosen yet (CE-5): after this list passes, the agent asks whether to release the local version or wait
and release local and cloud together.

**Before you start:** Ollama is running and serves `gemma4:e2b` (`ollama list`); Claude Code is installed and signed
in. Your settings already hold the Ollama endpoint from the first real run (slice 4); the steps below start by
removing it, so you see the empty state once.

## Settings → Provider → Endpoints

- [x] Provider shows *Claude Code* first, as before (found, version, *Test*), then *Endpoints* (CE-20).
- [x] Remove the Ollama endpoint (*Remove*, then *Remove this endpoint*). Every model picker now looks exactly as in
  v0.4.0: no groups, the Claude list only (CE-22). Welcome, the subject menu and *Amber's model* included.
- [x] *Add endpoint* with *Ollama*: the URL reads `http://localhost:11434/v1`; nothing is called until you press a
  button (IP-41).
- [x] *Fetch models*: `gemma4:e2b` appears pinned, its context size reads 32768 and thinking *Off* (CE-21, CE-30).
- [x] *Test* on `gemma4:e2b`: *Ready · Ollama · gemma4:e2b · n s* (the first call includes loading the model)
  (CE-24).
- [x] Rename the endpoint, then change its URL to a LAN address such as `http://192.168.1.20:11434/v1`: the
  local-network confirmation appears. Without ticking it, *Test* fails, saying Lantern sends plain http:// only to
  this computer or a confirmed local-network address (CE-80). Put the URL back to `http://localhost:11434/v1`.
- [x] *Reset to defaults* in Provider keeps the endpoint.

## Pickers and Learn on Gemma 4 E2B

- [x] Every picker groups models: *Claude Code* first, in v0.4.0's order, then *Ollama* with `gemma4:e2b · not
  evaluated` (CE-22, CE-56).
- [x] In Learn's Welcome, pick `gemma4:e2b` and start a subject. While no words have come, the panel says *Ollama is
  loading the model and reading the prompt…* and Amber's waiting line adds that a local model may take a minute
  (CE-41).
- [x] The intro streams, the root lights with its axes, and the meta line reads *Ollama · gemma4:e2b · not evaluated
  · n in / n out · n s*, with no effort (CE-25, IP-3).
- [x] Light a child, reply to the tutor, and use *Test me* then answer: each works, or keeps its text with *More
  options* when the model gives no options (CE-57, TP-34). Note how often options were missing.
- [x] Press Esc during a generation: it stops at once, the node returns to its previous state, and Ollama stops too
  (`ollama ps` shows it idle a moment later, or the CPU drops) (CE-11).
- [x] Judge the explanations: correct enough to learn from? (CE-56: the model is not evaluated.)

## Context size and thinking

- [x] On a subject with many nodes, set the model's context size to 8192 in Settings, then light a node: it still
  works, on a shorter map. Set it to 2048: the node says the prompt is too long and how to raise the size, and no call
  reaches Ollama (CE-31, CE-33). Put it back to 32768.
- [x] Set thinking to *On*: a light-up takes longer, and no thinking text appears in the panel (CE-51, CE-52). Put it
  back to *Off*.

## Choose on Gemma 4 E2B

- [x] In Choose, start a subject on `gemma4:e2b` with *Use the web* on. Research tasks (finding products, filling
  Compare) still run, on Claude Code; the other tasks run on Gemma. The Gallery's *Models used* lists both (CE-55).
- [x] Ask Amber with *Amber's model* set to `gemma4:e2b`: it answers, more slowly. (Known from slice 4: it may miss
  its category tag and show it as text.) Set *Amber's model* back to Haiku 5.5.

## Tokens

- [x] A subject used only with Claude shows the same figures as in v0.4.0: header hover, Gallery card and details.
- [x] A subject with local calls shows *Claude … · local …* in the header hover, the Gallery card and its details;
  Settings → Companion splits Amber's tokens the same way once it has answered on Gemma (CE-53).

## Errors

- [x] Stop Ollama (quit it from the tray) and light a node on a Gemma subject: *Ollama is not answering at
  localhost:11434. Start it, then try again.*, with *Details* and *Retry*. Start Ollama again: *Retry* works
  (CE-40).
- [x] In a picker choose *Other…* and type `ollama:llama-not-pulled`: a generation says to run *ollama pull
  llama-not-pulled* first (CE-40).
- [x] *(Optional, only if you can hide Claude Code from Lantern, for example by renaming `claude.exe` for a moment.)*
  With the endpoint set and a Gemma subject open, no *Claude Code is not installed* banner shows; Welcome lets you start
  a subject on `gemma4:e2b`; a Choose research call says research needs Claude Code (CE-26, CE-55). Put `claude.exe`
  back.

## Claude Code, as in v0.4.0 (CE-2)

- [x] Settings → Provider → Claude Code → *Test*: *Signed in · claude-opus-5-5 · n s*.
- [x] A Learn subject on Opus: intro and a light-up, meta line *Opus 5.5 · medium · … in / … out · n s*, no *not
  evaluated*.
- [x] A Choose research call (with *Use the web*): progress shows *Searching… / Reading…*, sources are kept.
- [x] Ask Amber on Haiku 5.5: an app question gets an app answer, as before.
- [x] Nothing else differs from v0.4.0 that you notice. Note anything that does.
