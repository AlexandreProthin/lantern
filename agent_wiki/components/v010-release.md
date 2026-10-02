---
type: Component
title: v0.1.0 release preparation
description: Per-user unsigned NSIS preview packaging, inert updater wiring and the remaining installed-app acceptance gates.
resource: /app/src-tauri/tauri.conf.json
tags: [implementation, release, installer, acceptance]
status: draft
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
endpoints and a blank public key are deliberate inactive configuration, never a
working update channel.

# Acceptance boundary

`app/ACCEPTANCE.md` collects the remaining installed-app gates. They include
native Explorer/Recycle Bin, library picker/transfer/window behavior, real CLI UI
use, visual/motion acceptance, a dogfooding
week. Real PoC import on copies and the Recycle Bin adapter already have automated
evidence (see the [log](/log.md)); native Explorer reveal and installed-build checks remain manual. The known [prose quality issue](/issues/tutor-prose-quality.md) remains open.

Build/test results are recorded in the [log](/log.md). No installer execution,
release publication, tag, PoC removal or acceptance sign-off is implied by a
successful build. The final release still requires the user's ship decision in
the [plan](/plans/v0-1-0.md).
