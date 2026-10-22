---
type: Component
title: v0.1.0 release preparation
description: Per-user unsigned NSIS preview packaging, inert updater wiring and the remaining installed-app acceptance gates.
resource: /app/src-tauri/tauri.conf.json
tags: [implementation, release, installer, acceptance]
status: stable
generated: { by: Claude/Sonnet-5.5, at: 2026-10-02T19:50:00Z }
---

# Packaging contract

[Platform quality](/specs/platform-quality.md) PQ-40..42 is wired with an unsigned
NSIS installer in `currentUser` mode. The pinned updater plugin is registered,
but has no endpoints, commands exposed by frontend permissions, checks or UI.
The main Tauri configuration enables `createUpdaterArtifacts`.

`npm run installer:preview` uses an explicit config overlay to disable updater
artifact signing for local acceptance builds. Windows code signing and updater
artifact signatures are separate: the preview is unsigned in both senses. A
future updater-enabled build needs a real public key and an externally supplied
private signing key; this task does not generate or commit keys. Empty updater
endpoints and a blank public key were deliberate inactive configuration at v0.1.0; both are
filled in now (see below).

# Acceptance boundary

`app/ACCEPTANCE.md` collects the remaining installed-app gates. They include
native Explorer/Recycle Bin, library picker/transfer/window behavior, real CLI UI
use, visual/motion acceptance, a dogfooding
week. Real PoC import on copies and the Recycle Bin adapter already have automated
evidence (see the [log](/log.md)); native Explorer reveal and installed-build checks remain manual. The known [prose quality issue](/issues/tutor-prose-quality.md) remains open.

Build/test results are recorded in the [log](/log.md). Acceptance was signed off by the user on 2026-10-04 and v0.1.0 shipped (see the
[log](/log.md)); follow-up work is in [v0.1.1](/plans/v0-1-1.md).

# Update channel (added 2026-10-08)

The updater is no longer inert: [updates](/specs/updates.md) specifies the daily launch check, notice,
manual check and install. `tauri.conf.json` carries the endpoint
`https://github.com/AlexandreProthin/lantern/releases/latest/download/latest.json` and passive NSIS install
mode; the public key was set once the user generated the pair (it is in `tauri.conf.json`); with an empty key the app reports
*Updates are not set up in this build* instead of failing. Release routine: `app/README.md` (build signed,
`app/scripts/make-latest-json.mjs`, upload both files). The preview overlay still turns updater signing off.

The user's local update folder (UP-60..66) is `C:\Users\alexp\LanternReleases`: pass it to
`make-latest-json.mjs --out` so installed builds see the release while the repository is private.
