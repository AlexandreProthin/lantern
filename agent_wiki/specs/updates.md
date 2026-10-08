---
type: Spec
title: Updates
description: How the installed app finds a newer release, tells the user quietly, installs it on request, and what a release must publish for that to work.
tags: [updates, installer, release, settings]
status: draft
generated: { by: claude-code/sonnet-5.5, at: 2026-10-08T09:00:00Z }
---

Source: the user's backlog entry of 2026-10-07 and their answers of 2026-10-08: check at launch once a day,
plus a way to check by hand; a quiet notice where the user clicks *Install*; the user generates the signing
key pair and gives only the public key. Replaces the "no update UI" rule of
[platform-quality](/specs/platform-quality.md) PQ-42.

The network work is done by the Rust side (the Tauri updater plugin, already registered). The webview never
contacts GitHub, so the content security policy and the capability list do not change.

# Requirements

## Checking

- **UP-1** The app MUST check at launch, in the background, at most **once per 24 hours**. The time of the last
  successful check is kept as `ui.lastUpdateCheck` (UI memory, [settings](/specs/settings.md) table); a failed
  check does not update it, so the next launch tries again.
- **UP-2** The launch check MUST NOT delay startup, block any space, or show anything when there is no newer
  release or when it fails (offline, no endpoint, no key). Failure is silent at launch.
- **UP-3** A setting `updates.checkAtLaunch` (boolean, default true, General section) MUST turn the launch
  check off. With it off the app makes no update request at all unless the user asks (UP-20).
- **UP-4** Only an installed desktop build checks. The browser build, tests and `npm run dev` MUST NOT.
- **UP-5** A release is newer only if its version is a higher semantic version than the running one.
  The app MUST NOT offer a downgrade or the same version.

## Telling the user

- **UP-10** When a newer release is found at launch, the app MUST show one **quiet notice**: *Lantern
  0.1.3 is available* with **Install** and **Later**. It is not a modal, takes no focus, and sits in the
  frame (the toast area), never over the graph or the panel.
- **UP-11** *Later* hides the notice for that version: the version is kept as `ui.dismissedUpdate` and the
  launch check does not show it again. A newer version shows the notice again. A manual check (UP-20)
  always shows its result.
- **UP-12** The notice MUST NOT appear while the Learn room is generating; it waits until nothing is running.
- **UP-13** The notice MUST carry the release notes only as a link to the release page, never inline.

## Checking by hand

- **UP-20** Settings → General MUST have a **Check for updates** button next to the version line (SE-22).
  It checks regardless of UP-1 and UP-3, and shows its outcome in place: *Checking…*, *Lantern is up to
  date*, *Lantern 0.1.3 is available* with **Install**, or a short reason it could not check
  (*Could not reach the update server*, *Updates are not set up in this build*).
- **UP-21** A manual check updates `ui.lastUpdateCheck` when it succeeds.

## Installing

- **UP-30** *Install* MUST be disabled while any generation is running, with the hint *Finish or cancel the
  running generation first* (same rule as SE-31).
- **UP-31** Installing MUST flush every pending save (subjects, settings, state, window memory) before the
  installer starts, then download the installer and verify its signature against the public key built into the
  app. A download or signature failure MUST leave the running app untouched and show the reason.
- **UP-32** While downloading, the notice or the Settings line shows progress. Installing is the per-user
  NSIS installer in passive mode ([platform-quality](/specs/platform-quality.md) PQ-41): Windows closes the app,
  updates it and starts it again. No administrator prompt appears (per-user install).
- **UP-33** Nothing is installed without the user pressing *Install*, never silently on launch.

## Release contract

- **UP-40** The updater **public key** MUST be committed in `tauri.conf.json` (`plugins.updater.pubkey`).
  The **private key** and its password MUST NOT be in the repository, the wiki, logs or chat; the release
  builder supplies them through `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
- **UP-41** The endpoint MUST be
  `https://github.com/AlexandreProthin/lantern/releases/latest/download/latest.json`.
- **UP-42** Every release MUST publish, next to the installer, the signed installer's `.sig` content in a
  `latest.json` (`version`, `notes`, `pub_date`, `platforms.windows-x86_64.url` and `.signature`).
  `app/scripts/make-latest-json.mjs` writes it from a signed build; the release routine is in
  [v010-release](/components/v010-release.md).
- **UP-43** A release published without `latest.json` can never update itself. The preview builds
  (`npm run installer:preview`) keep updater signing off and are never published.
- **UP-44** The first release that carries the key and endpoint cannot be reached by builds installed before
  it (they have no endpoint): the user installs it by hand once; every later release updates in place.

## Privacy

- **UP-50** The check sends only what the HTTP request itself carries (and the app version and platform
  the updater adds). No identifier, no subject data, no settings. It is the only request Lantern itself
  makes ([inference-provider](/specs/inference-provider.md) covers the tutor, which runs through the CLI).

# Acceptance

1. With a newer signed release published, an older installed build, left running for a launch, shows the
   notice; *Later* hides it for that version; relaunching within 24 h makes no request.
2. *Check for updates* reports up to date on the newest build and offers *Install* on an older one;
   *Install* replaces the app and it starts again on the new version with the subjects intact.
3. Offline, or with the setting off, startup shows nothing and is not slower.
4. A tampered or unsigned `latest.json` entry is refused and the app keeps running.

# Open

None.

Related: [settings](/specs/settings.md), [platform-quality](/specs/platform-quality.md),
[v010-release](/components/v010-release.md).
