---
type: Decision
title: v0.1.0 gives sign-in instructions; Lantern opening the sign-in is Later
description: When the Claude Code CLI is missing or signed out, v0.1.0 shows step-by-step instructions and a Check again button; it never opens the sign-in itself.
tags: [provider, claude-cli, onboarding, scope]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-02T11:00:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Decided 2026-10-02 (spec workshop round 3, q-r3-signin).

# Context

Round 3 proposed a *Sign in to Claude Code* button that opens a console window running `claude`, so the user would never type a command. The user chose a smaller v0.1.0: the sign-in is a one-time step, and an app that opens consoles is more machinery (the only visible console window in the app) than a one-time step is worth.

# Decision

- When the CLI is not installed or not signed in, **Settings → Provider** and the **frame banner** show clear **step-by-step instructions**: the install link for *not installed*, and how to sign in to Claude Code for *not signed in*.
- Both carry a *Check again* button, which runs the *Test* call.
- There is **no** *Sign in to Claude Code* button in v0.1.0, and the app never opens a console window.
- **Later:** *Lantern opens the sign-in for you*.
- Acceptance AC-6 is reworded to match: install, first run, settings, model choice and library location are done from the UI; the one-time sign-in follows Lantern's instructions.

# Options

| Option | Verdict |
|---|---|
| Button that opens a console running `claude` | Deferred to Later. |
| Instructions plus *Check again* | Chosen. |

Specs: [settings](/specs/settings.md) SE-43, SE-47; [inference-provider](/specs/inference-provider.md) IP-44; [rooms-spaces](/specs/rooms-spaces.md) RS-40; [product-scope](/specs/product-scope.md) AC-6.
