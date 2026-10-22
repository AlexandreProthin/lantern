---
type: Plan
title: Serve over the network plan
description: A Settings toggle that serves Lantern over HTTPS on the local network, with QR pairing, use-not-administer rights for remote devices, a self-signed certificate and a phone layout.
tags: [plan, network, remote, mobile, https]
status: stable
stale_after: 2027-03-31T00:00:00Z
generated: { by: claude-code/opus-5.5, at: 2026-10-22T12:00:00Z }
---

Written 2026-10-22, on branch `worktree-serve-over-network` (worktree `.claude/worktrees/serve-over-network`).
The goal is to use Lantern from a phone or another PC on the same network through a browser, with
nothing to install there. The desktop app stays the only install: it serves itself.

Decided with the user (2026-10-22):

- **A toggle in the desktop app only.** A headless or Docker server goes to the [backlog](backlog.md).
- **Self-signed certificate now.** Tailscale, for HTTPS without a warning and access away from home,
  goes to the [backlog](backlog.md).
- **Pairing by QR code plus a one-time code.** A paired device keeps its own token in a cookie. One
  button revokes every device.
- **Remote devices can use Lantern but not administer it**, see NW-20.
- **The phone layout is part of this pass.**

# Shape

```
phone / other PC (browser)           desktop app (Tauri)
  same Svelte build ── HTTPS ──▶   Rust server (axum on hyper + tokio-rustls, ring)
  ipc.ts: invoke → POST /api/…           │  same functions the Tauri commands call
  Channel → NDJSON stream                │  library, keys, Claude CLI, endpoints
                                         ▼
                                  files in the library and config folders (unchanged)
```

- The frontend calls `invoke` and `Channel` through `frame/ipc.ts`. Inside Tauri these are Tauri's own;
  when the page was served by Lantern they become `fetch` calls. Call sites change only their import.
- `frame/host.ts` says where the page runs: `native` (the Tauri window), `remote` (served by Lantern,
  marked by a `<meta name="lantern-remote">` the server adds to `index.html`) and `backend` (either of
  the two: real files and a real provider). The old `desktop` flag splits into these two meanings.
  The plain browser build (fakes, localStorage) and the web demo are unchanged.
- There is no database. Subjects stay JSON files. Two devices writing the same subject already meet
  the file stamp check (`save_subject`'s `expected`), which saves a conflict copy and reloads. The
  one-second refresh brings one device's edits to the other.

# Requirements

## Server

- **NW-1** Off by default. *Settings → Network* turns it on and off; the choice and port persist in
  `<config>/Lantern/network/config.json`, owned by Rust, and the server starts with the app when on.
- **NW-2** HTTPS only, on `0.0.0.0:<port>` (default 4317). A connection from outside private,
  loopback, link-local or CGNAT (100.64.0.0/10) ranges is closed before TLS.
- **NW-3** Self-signed certificate (rcgen, ring) in `<config>/Lantern/network/`, valid for this PC's
  name, `localhost`, and its LAN addresses. A new one is made when the LAN address is no longer covered.
  Settings shows its SHA-256 fingerprint so it can be compared with the phone's warning.
- **NW-4** Static files: the app's embedded frontend (Tauri's asset resolver); in a debug build, the
  `dist/` folder. Its own CSP: `connect-src 'self'`.
- **NW-5** Stopping the server or quitting the app cancels the remote generations.

## Pairing

- **NW-10** *Pair a device* shows a QR code and a link: `https://<lan-ip>:<port>/#pair=<code>`. The
  code is single-use and expires after 10 minutes. The fragment is never sent in a request; the page
  reads it and posts it to `/api/pair`.
- **NW-11** A good code gives the device a random 256-bit token in a `Secure; HttpOnly; SameSite=Strict`
  cookie, kept a year. Only the token's SHA-256 is stored (`devices.json`), with its creation time
  and last use.
- **NW-12** Every `/api` call except `/api/pair` needs a known token. An unpaired page shows a
  *Pair this device* screen instead of the app.
- **NW-13** *Forget all devices* drops every token. Settings lists the paired devices (when paired,
  last seen, browser).
- **NW-14** Failed pairing attempts are limited (5 per minute per address).

## Rights (use, not administer)

- **NW-20** Allowed from a remote device: subjects (load, save, list, delete, thumbnails), recents,
  Amber state and log, settings read and save, generation and its cancel, provider status, an endpoint's
  models and model info, key status (never a key).
- **NW-21** Refused: endpoint keys (set, remove), library choice or switch, reveal in Explorer, file
  paths, window state and snapping, updates, the network settings, `import_poc` (a no-op).
- **NW-22** The server never takes a path from a remote device: every `library` argument is replaced
  by the library in `settings.json`.
- **NW-23** A remote settings save keeps the file's `library`, `provider.endpoints` and `developer`;
  the rest is taken from the device.
- **NW-24** A remote endpoint call names an endpoint of `settings.json`: id, preset, base URL and LAN
  confirmation must match the stored entry, or the call is refused. Model, context size and thinking
  come from the device.

## Frontend

- **NW-30** `ipc.ts` maps `invoke(cmd, args)` to `POST /api/invoke/<cmd>` (JSON in, JSON out, an error
  as status 400 with the error body) and `generate` to `POST /api/generate`, which streams NDJSON
  lines: chunks, then one `result` or `error` line. A closed connection cancels the call on the server.
- **NW-31** On a remote device, the window controls, window memory, close handling, updates, library
  picker, *Reveal* and *Copy path*, endpoint keys and network settings are hidden or shown as
  "on the desktop app only". External links open in a new tab.
- **NW-32** A token that stops working (devices forgotten) brings back the pairing screen.

## Phone layout

- **NW-40** Below 720 px wide: one column. The top bar collapses to the mark, the room and space menu,
  and the panel button. The node panel becomes a full-height sheet over the graph, with a close button.
  Settings, galleries and dialogs fill the screen.
- **NW-41** Touch: pan and pinch on the graph (d3-zoom's own touch handling), tap to open a node; no
  action depends on hover alone.
- **NW-42** Inputs stay 16 px or more (no zoom on focus in iOS Safari); the viewport uses
  `width=device-width, initial-scale=1, viewport-fit=cover` and respects safe areas.
- **NW-43** The desktop app at 1024 px and up is unchanged.

# Order

1. **Plan** (this page) and the backlog entries. *Done 2026-10-22.*
2. **Rust server**: `network/` module (config, certificate, devices, pairing, dispatcher with NW-20..24,
   NDJSON generation), the `network_*` Tauri commands, start at launch. `generate`'s body moves into a
   function that takes a chunk callback, shared by the Tauri command and the server. Unit tests for
   the rights, the library override, the settings merge, the endpoint match and pairing.
3. **Frontend transport**: `host.ts`, `ipc.ts`, imports switched, `desktop` split into `native` and
   `backend`, the pairing screen.
4. **Settings → Network**: the toggle, port, address, fingerprint, QR code, devices, *Forget all*.
5. **Phone layout** (NW-40..43).
6. **Checks**: `cargo test`, `npm test`, `npm run check`, `npx playwright test`; the API with `curl -k`;
   the app in the built-in browser at phone width, against the running server.
7. **Wiki**: a component page, the specs touched (settings, platform quality), the roadmap.
8. **The user tries it** on the phone and the other PC. Then merge, on the user's word.

# Exit checks

- With the toggle off, nothing listens (checked with `netstat`).
- From another device: pair by QR, open a subject, generate with Claude Code and with an endpoint,
  edit; the desktop shows the edit within a second or two.
- An unpaired request gets 401; a refused command gets 403; a `library` argument from a device is ignored.
- *Forget all devices* sends a paired phone back to the pairing screen.
- Every existing test passes; the desktop window looks the same.

# Not in this pass

- Headless or Docker server, Tailscale: [backlog](backlog.md).
- A generation that survives the phone's screen locking: today the call is cancelled when the
  connection drops (NW-30). Backlog.
- Installing as an app (PWA): needs a trusted certificate for service workers, so it waits for Tailscale.
