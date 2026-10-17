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
   the README link. Committed locally, **not pushed**.
2. **The user tries it** locally (`npm run build:demo`, then `npx vite preview --mode demo`) and asks for changes.
3. **Before going public**: scan the whole history for secrets, and list what becomes public
   (`agent_wiki/`, `agent_identity/`, `agent_design/`, commit e-mail addresses). The user signs off.
4. **The user** makes the repository public and sets *Settings → Pages → Source: GitHub Actions*.
5. **On the user's word**: merge the branch into `master`, push, then run *Actions → Web demo → Run
   workflow* once (or wait for the next `v*` tag). Check the site and the README link.

# Exit checks

- `npm test`, `npm run check`, `npx playwright test` and `npm run test:demo` pass.
- The deployed site: Welcome prefilled with Blender 3D, TCP among recent subjects, a light, a check and
  its answer, Reset, Ask Amber's demo answer, no console errors.

# Side effects of going public

Installed builds start updating themselves from GitHub releases (today the channel answers 404 while
the repository is private, UP-45).
