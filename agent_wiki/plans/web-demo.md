---
type: Plan
title: Web demo plan
description: The Learn room as a free public demo on GitHub Pages - built on branch worktree-web-demo, waiting for the repository to go public before merge, push and first deploy.
tags: [plan, web-demo, github-pages]
status: draft
stale_after: 2027-03-31T00:00:00Z
generated: { by: claude-code/opus-5.5, at: 2026-10-17T16:30:00Z }
---

Written 2026-10-17. The why is in [the decision](/decisions/web-demo-prepared-answers.md); the how in
[Demo runtime](/components/web-demo/runtime.md) and [Demo content](/components/web-demo/content.md).

# Order

1. **Built** on branch `worktree-web-demo` (worktree `.claude/worktrees/web-demo`): the demo build, the
   scripted tutor, the TCP and Blender scripts, the banner, the workflow, unit and end-to-end tests,
   the README link. **Done.**
2. **The user tries it** locally (`npm run build:demo`, then `npx vite preview --mode demo`). **Done**, accepted.
3. **Before going public**: scan the whole history for secrets, and list what becomes public. **Done
   2026-10-17, clear to go public** (see *Pre-public check* below).
4. **Merged into `master` and pushed** on the user's word, 2026-10-17, before going public (the
   workflow only runs on tags and by hand, so nothing deployed).
5. Licence chosen: [GPL-3.0-or-later](/decisions/gpl-3-licence.md), 2026-10-17. **The user** makes the repository public and sets *Settings → Pages → Source:
   GitHub Actions*.
6. Run *Actions → Web demo → Run workflow* once (or wait for the next `v*` tag). Check the site and the
   README link.

# Exit checks

- `npm test`, `npm run check`, `npx playwright test` and `npm run test:demo` pass.
- The deployed site: Welcome prefilled with Blender 3D, TCP among recent subjects, a light, a check and
  its answer, Reset, Ask Amber's demo answer, no console errors.

# Pre-public check (2026-10-17)

Run on all 108 commits, every branch and tag, before any switch. Result: **nothing blocks going public.**

| Checked | Result |
|---|---|
| Secrets in every added line of history: private keys, the Tauri/minisign updater secret key and its password, Anthropic, OpenAI, GitHub, AWS, Google and Slack tokens, bearer tokens, assigned passwords and API keys | none |
| Risky files ever committed (`.env`, `.pem`, `.key`, `id_rsa`, credentials, databases) | only `app/.env.demo` (`VITE_DEMO=true`, not a secret) |
| The identity release archive (`lantern-identity-v0.2.zip`) | no secret patterns |
| Commit identities | name `AlexandreProthin`, e-mail `=`: no personal address in history (commits are not linked to the GitHub profile) |
| E-mail addresses in content | none (only `@pytest` decorators and `@2x` file names) |
| GitHub side: issues, pull requests, Actions secrets | none |
| Release assets | installers and `latest.json` only; the updater public key is public by design |
| History size | 48.6 MB, largest file 3 MB (the README GIF) |

Becomes public with the repository, all judged fine:

- Everything in the tree and its history: `app/`, `agent_wiki/`, `agent_design/` (spec workshop, the user's answers and sketch), `agent_identity/` (identity rounds, the user's requests quoted in French).
- The Windows user name `alexp`, in about 15 local paths inside `agent_identity/` round sources and notes. Harmless; removing it would mean rewriting history, not worth it.
- `.claude/launch.json` (dev server definitions).
- The tags `poc-final` and `v0.1.0` to `v0.4.0`, the releases, and branch `worktree-web-demo` once pushed.

Licence: the open choice is closed. The root `LICENSE` is GPL-3.0-or-later ([decision](/decisions/gpl-3-licence.md)).

# Side effects of going public

Installed builds start updating themselves from GitHub releases (today the channel answers 404 while
the repository is private, UP-45).
