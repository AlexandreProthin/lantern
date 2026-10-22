---
type: Component
title: Web demo runtime
description: The demo build (vite --mode demo) - Learn alone, a scripted tutor with a model-like wait, the TCP subject seeded as a recent project, Blender 3D prefilled on Welcome, a banner with Reset, and the Pages workflow.
tags: [web-demo, build, provider, github-pages]
status: stable
resource: /app/src/demo/
generated: { by: claude-code/opus-5.5, at: 2026-10-17T16:30:00Z }
---

# What it is

The ordinary browser build of the app, built with `--mode demo` (`app/.env.demo` sets `VITE_DEMO=true`).
Every demo difference sits behind `import.meta.env.VITE_DEMO`, which the normal builds replace with
`undefined`: the desktop app and the normal web build are unchanged, and none of the demo's content
ends up in them (checked on the built files: only the demo strings are there).

| Command (in `app/`) | Does |
|---|---|
| `npm run dev:demo` | the demo on the dev server, port 1432 |
| `npm run build:demo` | the static site in `app/dist-demo/` (relative paths, served at any folder) |
| `npm run test:demo` | `demo/demo.spec.ts` against the built site (`playwright.demo.config.ts`, port 1433) |

# Pieces

| File | Role |
|---|---|
| `app/src/demo/tutor.ts` | `ScriptedTutor`: reads the task, subject and node from the prompt (as the fake provider does, IP-71), waits **2 to 4 s** like a model, then streams the prepared text. Unprepared requests get an honest fallback (strings `demoNo*`). Answers to a check are never graded: no `<understood/>`. |
| `app/src/demo/scripts.ts` | The tutor with every prepared subject, loaded on the first generation. `?demoFast` skips the wait. |
| `app/src/demo/start.ts` | Before the shell mounts: puts the TCP subject in browser storage as a recent project opened yesterday, once per app version; mounts the banner. `resetDemo()` clears every `lantern.*` key. |
| `app/src/demo/DemoBanner.svelte` | Top-left pill: *Web demo* (tooltip: prepared answers, nothing leaves the browser), *Reset*, *Get Lantern ↗* (latest release). |
| `app/src/demo/prefill.ts` | Welcome opens with *Blender 3D* and its direction filled in, until that subject exists. |

# Hooks in the app (one line each, all behind the flag)

| Where | Change |
|---|---|
| `src/main.ts` | runs `startDemo()` before mounting the shell |
| `src/rooms/index.ts` | the room list is Learn alone, its fake provider replaced by the scripted tutor |
| `src/ui/Welcome.svelte` | applies the prefill once the capsule exists |
| `src/rooms/learn/Welcome.svelte` | no *Suggest subjects* (nothing prepared to suggest) |
| `src/rooms/learn/actions.ts` | no *More options* (nothing prepared beyond each node's three) |
| `src/frame/amber/fake-provider.ts` | *Ask Amber* answers that free questions need the app |
| `src/frame/Shell.svelte` | the seeded subject does not count as a past visit, so Amber says its first-launch hello |
| `vite.config.ts` | `base: './'`, `outDir: dist-demo`, a page title and description |

# Publishing

`.github/workflows/web-demo.yml`: build, install Chromium, run `test:demo`, then deploy to GitHub Pages.
A failing test deploys nothing and the previous demo stays online. It runs on every `v*` tag and by
hand (*Actions → Web demo → Run workflow*, GitHub's `workflow_dispatch`). The site is
`https://alexandreprothin.github.io/lantern/`. It never runs on a push to `master`.

One-time setup, both on GitHub:

- *Settings → Pages → Source: GitHub Actions*.
- *Settings → Environments → github-pages → Deployment branches and tags*: branch `master` (for a run
  by hand) and tag `v*` (for releases). GitHub creates the environment allowing `master` only, so a
  tag run fails at *deploy* with *Tag "v…" is not allowed to deploy to github-pages* until the tag
  rule is added (it was, 2026-10-18, after the first `v0.5.0` run failed).

# Limits

- Second-level nodes (those born from a prepared light) light up with the fallback text.
- Subjects other than the two prepared ones get the fallback intro, with no axes.
- Visitor progress lives in their browser's storage only; a new release re-seeds the TCP subject.
