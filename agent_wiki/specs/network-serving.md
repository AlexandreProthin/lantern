---
type: Spec
title: Serve over the network
description: A Settings toggle that serves Lantern over HTTPS on the local network to a phone or another PC's browser - self-signed certificate, QR pairing with a device cookie, use-not-administer rights, the browser transport and the phone layout.
tags: [network, remote, mobile, https, pairing, security]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-23T12:00:00Z }
---

Source: the user's decisions of 2026-10-22, recorded in the [plan](/plans/serve-over-network.md), and the
requirements as they landed on branch `worktree-serve-over-network`. Code:
[network server](/components/network-server.md).

The desktop app stays the only install: it serves its own frontend, and a browser on the same network
uses it with nothing to install. The library stays files in the library folder; there is no database.
Two devices writing the same subject meet the existing file stamp check (`save_subject`'s `expected`).

# Server

- **NW-1** Off by default. *Settings → Network* turns it on and off; the choice and the port persist in
  `<config>/Lantern/network/config.json` (not `settings.json`), owned by Rust. The server starts with the
  app when on.
- **NW-2** HTTPS only, on `0.0.0.0:<port>` (default 4317). A connection from outside private, loopback,
  link-local or CGNAT (100.64.0.0/10) ranges is closed before TLS.
- **NW-3** Self-signed certificate (rcgen, ring) in `<config>/Lantern/network/`, valid for this PC's
  name, `localhost`, `127.0.0.1` and its LAN address; a new one is made when the LAN address is no longer
  covered. Settings shows its SHA-256 fingerprint to compare with the browser's warning.
- **NW-4** Static files come from the app's embedded frontend (in a debug build, `dist/`). Unknown paths
  fall back to `index.html`, which the server marks with `<meta name="lantern-remote">` and serves with
  its own CSP (`connect-src 'self'`).
- **NW-5** Stopping the server or quitting the app cancels the remote generations.

# Pairing

- **NW-10** *Pair a device* shows a QR code, a link `https://<lan-ip>:<port>/#pair=<code>` and the code.
  The code is single-use and expires after 10 minutes. The fragment is never sent in a request: the page
  reads it, clears it and posts it to `/api/pair`.
- **NW-11** A good code gives the device a random 256-bit token in the `lantern_device` cookie
  (`Secure; HttpOnly; SameSite=Strict`, one year). Only the token's SHA-256 is stored, in `devices.json`,
  with its creation time, last use and browser.
- **NW-12** Every `/api` call except `/api/pair` needs a known token, and every POST must be same-origin.
  An unpaired page shows *Pair this device* instead of the app.
- **NW-13** *Forget all devices* (after a confirmation) drops every token. Settings lists the paired
  devices: when paired, last seen, browser.
- **NW-14** Failed pairing attempts are limited to 5 per minute per address.

# Rights: use, not administer

- **NW-20** Allowed from a remote device: subjects (load, save, list, delete, thumbnails), recents, Amber
  state and log, settings read and save, generation and its cancel, provider status, an endpoint's models
  and model info, key status (never a key).
- **NW-21** Refused (403): endpoint keys (set, remove), library choice or switch, reveal in Explorer, file
  paths, window state and snapping, updates, the network commands, `import_poc`.
- **NW-22** The server never takes a path from a remote device: every `library` argument is replaced by
  the library in `settings.json`.
- **NW-23** A remote settings save keeps the stored `library`, `provider.endpoints` and `developer`; the
  rest comes from the device.
- **NW-24** A remote endpoint call names an endpoint of `settings.json`: id, preset, base URL and LAN
  confirmation must match the stored entry, or the call is refused (400). Model, context size and
  thinking come from the device.

# Browser transport

- **NW-30** `frame/ipc.ts` maps `invoke(cmd, args)` to `POST /api/invoke/<cmd>` (JSON in and out, an error
  as a 4xx with the error body) and `generate` to `POST /api/generate`, which streams NDJSON lines: chunks,
  then one `result` or `error` line. A closed connection no longer cancels the call (NW-50); *Cancel*
  still does, through `cancel_generation`.
- **NW-31** On a remote device the window controls, window memory, close handling, update check, library
  picker, *Open file*, *Reveal* and *Copy path*, endpoint editing and keys, and *Settings → Network* are
  hidden, or shown with a hint that they live on the desktop app. External links open in a new tab.
- **NW-32** A 401 (devices forgotten) reloads the page, which brings back the pairing screen.

# Phone layout

- **NW-40** Below 720 px wide (`ui/phone.svelte.ts`):
  - the top bar takes two rows, the subject field spanning the second; shortcuts, stats and the drag
    strip are hidden, and safe areas are respected;
  - the graph fills the screen and the node panel is a sheet over it, opened by tapping a node or the
    *Details* button in the bottom bar, and closed by *‹ Graph* or Esc;
  - the field panel, Settings (tabs in a row) and every dialog use the whole width; the graph legend
    starts folded; the Choose rail is a horizontal bar; the compare grid is one column.
- **NW-41** Touch: pan and pinch on the graph (d3-zoom), tap to open a node, a long press opens the node
  menu that a right-click opens on the desktop; graph controls are 40 px. No action depends on hover alone.
- **NW-42** Inputs are 16 px or more (no zoom on focus in iOS Safari); the viewport is
  `width=device-width, initial-scale=1, viewport-fit=cover`.
- **NW-43** The desktop window (1024 px and up) is unchanged.

# Generations that survive a dropped connection

- **NW-50** The server keeps each remote generation as a job, keyed by its `requestId`, with every line it
  has sent. The call runs to its end whatever happens to the connection. A `POST /api/generate` with the
  same `requestId` and `from: n` replays the lines from the n-th and then follows the job until its last
  line, instead of starting another call.
- **NW-51** A finished job is kept 15 minutes, then dropped. A reattach to a job the desktop no longer has
  (expired, or the app restarted) answers 410 with a `network` error that says so; the page shows it as
  any failed generation, with *Retry*. Stopping the server (NW-5) still cancels the jobs that run.
- **NW-52** `frame/ipc.ts` counts the lines it has read. When the stream breaks or ends without a last
  line, it waits until the page is shown, then reattaches with `from`, backing off 1, 2, 4, 8 s between
  tries; six failures in a row while the page is shown end the call with a `network` error. When the page
  comes back from hidden (a phone unlocked), it drops the connection it had, which may look open and
  never deliver, and reattaches at once without counting a failure.

# Later

In the [backlog](/plans/backlog.md): Tailscale (HTTPS without a warning, access away from home), a
headless or Docker server, and installing as a PWA.

Related: [settings](/specs/settings.md), [platform-quality](/specs/platform-quality.md),
[custom-endpoints](/specs/custom-endpoints.md) (keys never leave the desktop, CE-70).
