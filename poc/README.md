# Lantern PoC: the Learn room

Throwaway code. Its only job is to show that the loop works: **a conversation with a
tutor grows a persistent graph of the subject**.

## Run

Needs Node 20+, Rust, and the Claude Code CLI (`claude`) logged in.

```bash
npm install
npm run tauri dev
```

`npm run dev` alone opens the UI in a browser with a canned fake tutor and
localStorage, for UI work without the CLI.

Set `LANTERN_MODEL` (e.g. `opus`, `sonnet`, `haiku`) to pick the model; the CLI default
is used otherwise.

## The loop

1. Name a subject (or ask for 3 suggestions). The tutor introduces it and proposes
   **3 axes**: they appear as dark, **open** nodes.
2. Pick a node, then **Light it up**: the tutor explains that node only, streamed into
   the panel, and ends with **3 ways to go deeper**, which become new open nodes.
3. On any lit node, talk: ask a question, or press **Test me** to get a check question
   and answer it. When your answer shows you understand, the tutor marks the node
   **understood**. A question that opens a new direction can add a **branch** node
   (blue outline).
4. Everything is saved as you go, one JSON file per subject in
   `Documents/Lantern/subjects/`. Reopen it later from the home screen.

The method comes from the `learning-session` skill (never dump everything, cover only
the chosen node, always exactly 3 distinct teasers).

## Where things are

| | |
|---|---|
| `src-tauri/src/provider.rs` | `InferenceProvider` trait + `ClaudeCliProvider` (`claude -p --output-format stream-json`, no tools, safe mode, prompt on stdin) |
| `src-tauri/src/lib.rs` | Tauri commands: `infer` (streams `llm-chunk` events), subject list/save/delete |
| `src/lib/prompts.ts` | Learn room system prompt, per-task prompts, parsing of `<options>`, `<branch>`, `<understood/>` |
| `src/lib/session.svelte.ts` | Actions that turn tutor replies into graph changes |
| `src/lib/Graph.svelte` | d3-force graph, pan/zoom |
| `src/lib/Panel.svelte` | Focused node: explanation, next options, dialogue |

## Context sent on each turn

The whole map as an indented outline (titles, hooks, open/lit/understood, "current node"
marker), the path to the node, the parent's explanation (clipped), and for dialogue the
node's explanation plus its dialogue so far. Fine for a PoC; it won't scale to big
subjects (see *Open work* in the main README).
