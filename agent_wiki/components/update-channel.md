---
type: Component
title: Update check and local feed
description: How the app finds and installs a new version - Rust commands that talk to the update server, a loopback server for a local release folder, and the frame's controller and rules.
tags: [updates, rust, release, frame]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-18T12:00:00Z }
resource: /app/src-tauri/src/updates.rs
---

# Purpose

Lantern updates itself from GitHub releases. The webview never contacts the update server: Rust checks,
holds the found update, and installs it on request. For testing an installer before release, a local
folder can replace GitHub, served to the updater from `127.0.0.1`.

Contract: [updates spec](/specs/updates.md) (UP-*). Release configuration (key, endpoint, installer) is
in [v0.1.0 release preparation](/components/v010-release.md). The local-folder path was used to try
v0.2.0 and v0.4.0 over their predecessors ([v0.2.0](/plans/v0-2-0.md), [v0.4.0](/plans/v0-4-0.md)).

# Modules

| Module | For | Contract |
|--------|-----|----------|
| `app/src-tauri/src/updates.rs` | The commands | `check_update(folder?)` returns `up-to-date`, `unconfigured` or `available { version, current, notes }`. A build with no public key or no endpoint is `unconfigured` (UP-43). With a folder, the update comes from the local feed instead of GitHub but is still verified against the built-in key (UP-61, UP-64). The found update and the feed live in `Pending` until installed or released. `release_update` drops both (*Later*, UP-11, UP-63). `install_update` downloads and installs, sending `progress` then `installing` events on a channel; on Windows the passive installer closes and restarts the app (UP-31) |
| `app/src-tauri/src/local_feed.rs` | `LocalFeed` | Serves a release folder on a random loopback port. Only `latest.json` and the installer it names in its Windows entry are served, anything else is 404 (UP-62, UP-63). It stops when dropped or after ten idle minutes. A folder that cannot be served fails with a code the webview maps to words: `update-folder:no-latest-json`, `no-installer-named`, `installer-missing` (UP-66, PQ-4) |
| `app/src/frame/updates.ts` | Pure rules | `shouldCheckAtLaunch`: desktop only, setting on, once a day, but every launch with a local folder set (UP-1 to UP-5, UP-61). `shouldShowNotice`: not while generating and not for a version already dismissed (UP-11). `revealsDeveloper`: five clicks on the version line within three seconds (UP-60) |
| `app/src/frame/updates.svelte.ts` | `UpdateController` | One reactive controller shared by the launch notice and *Settings → General*; phases `idle`, `checking`, `up-to-date`, `available`, `unconfigured`, `failed`, `downloading`, `installing`. Only a launch check raises the notice. `install` flushes the app's saves first, then follows the progress channel (UP-20 to UP-32). Keeps the release `notes` for Amber |

# Behaviours worth knowing

- **Unconfigured is not a failure** and does not count as the server having answered.
- **Release notes travel to Amber.** At install, `Shell.svelte` saves `keepNotes(...)` into Amber's
  state, and the first launch of the new version shows them in the greeting
  ([Amber](/components/amber-companion.md); CO-31, UP-13).
- **Developer section.** The local update folder is a Developer setting (`developer.updateFolder`),
  hidden until revealed (UP-60).

# Verification

Rust tests in both modules (configured rule, serialisation, only-two-files and stops, idle stop,
folder error codes). `updates.test.ts` covers the rules. The update itself can only be proved on an
installed build, over the previous release, through GitHub or the local folder.
