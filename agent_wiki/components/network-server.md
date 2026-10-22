---
type: Component
title: Network server and browser transport
description: The HTTPS server inside the desktop app (hyper, rustls, self-signed certificate), device pairing and rights, the frontend's host flags and fetch transport, Settings → Network, the pairing screen and the phone breakpoint.
tags: [network, remote, https, pairing, rust, frontend, mobile]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-23T12:00:00Z }
resource: /app/src-tauri/src/network
---

# Purpose

Lets a phone or another PC on the LAN use Lantern in a browser, served by the desktop app itself.
Contract: [network-serving](/specs/network-serving.md) (NW-*). Built by the
[serve over the network plan](/plans/serve-over-network.md).

# Rust (`app/src-tauri/src`)

- **`network.rs`**: the `Network` state (registry, running server, last error), `launch` at start-up when
  enabled, `shutdown` on quit, the LAN address and URL, and the Tauri commands `network_status`,
  `network_set`, `network_pair` (code, link and QR as SVG) and `network_forget_devices`. These commands
  are native only; the server refuses them (NW-21).
- **`network/devices.rs`**: `Registry` over `<config>/Lantern/network/`: `config.json` (enabled, port),
  `devices.json` (token SHA-256, created, last seen, browser), the pending pairing code with its expiry,
  and the 5-per-minute failure limit (NW-10..14).
- **`network/tls.rs`**: makes or reuses the rcgen certificate and key, regenerating when the LAN address
  is not among its SANs; gives the rustls config (ring) and the fingerprint (NW-3).
- **`network/rights.rs`**: the allow list of commands (NW-20, 21), peer ranges (NW-2), the library override
  (NW-22), the settings merge (NW-23) and the endpoint match (NW-24). Pure functions, tested in
  `network/tests.rs`.
- **`network/server.rs`**: hyper 1 over tokio-rustls. Routes: `/api/session` (paired or not), `/api/pair`,
  `/api/invoke/<cmd>` (dispatches to the same functions the Tauri commands call, blocking ones on a
  worker thread), `/api/generate` (NDJSON chunks then one `result` or `error` line; the call is cancelled
  when the connection drops or the server stops), and static assets from Tauri's asset resolver with the
  SPA fallback, the `lantern-remote` meta tag and the CSP (NW-4).

In a debug build, `LANTERN_CONFIG_DIR` overrides the config folder (`commands.rs` `config()`), so a scratch
config can be served; `app/scripts/live-remote.mjs` drives a paired browser against it with Playwright.

# Frontend (`app/src`)

- **`frame/host.ts`**: `native` (the Tauri window), `remote` (the meta tag is present) and `backend`
  (either: real files and a real provider). The plain web build and the web demo are neither.
- **`frame/ipc.ts`**: `invoke` and `Channel` for every call site. Native uses Tauri's; remote uses
  `fetch` (NW-30) and reloads on 401 (NW-32). Also `paired()` and `pair(code)`.
- **`main.ts`**: on a remote page, asks `paired()` first and mounts `frame/Pair.svelte` (reads
  `#pair=`, clears it, posts it) until the device is paired.
- **`frame/NetworkSettings.svelte`**: *Settings → Network*, native only: toggle, port, address,
  fingerprint, certificate and firewall hints, QR and code, the device list, *Forget all devices*.
  Polls status every 3 s while open.
- **`ui/phone.svelte.ts`**: the one breakpoint (`max-width: 719px`) as a `MediaQuery`. The phone styles
  live in the components they change (TopBar, StudySplit, Graph, FieldPanel, SettingsPanel, Rail,
  `app.css`); `tests/phone.spec.ts` covers them (NW-40..43).

# Checks

`cargo test` (rights, library override, settings merge, endpoint match, pairing), `frame/ipc.test.ts`,
`tests/phone.spec.ts`, and the live script above.
