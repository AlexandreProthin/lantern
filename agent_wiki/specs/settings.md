---
type: Spec
title: Settings
description: Every v0.1.0 setting with type, default, validation and effect; the app-side settings file; the panel structure; the library folder change flow; the provider status UI.
tags: [settings, config, provider, library]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-17T16:00:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Source: spec workshop rounds 1–3 (2026-10-01/02). Agreed with the user 2026-10-02 (q-r3-review).

Settings are app-wide and stored app-side, never in the library ([subject-storage](/specs/subject-storage.md), ST-3).
Per-subject choices (tone, model, effort) live in the subject ([domain-model](/specs/domain-model.md));
the settings below only supply their **defaults**.

# Settings catalogue

| Section | Key | Type | Default | Validation | Effect |
|---|---|---|---|---|---|
| General | `library.path` | absolute path | `Documents/Lantern` | must exist or be creatable, writable; not inside the app install dir | via the change flow (SE-30 to SE-36) |
| General | `user.displayName` | string | Windows user name | trimmed, 1–40 chars; empty resets to the default | new edits and turns only; stored names on existing content are not rewritten |
| Provider | `provider.defaultModel` | string | `opus` | an entry of the model list (SE-48) or free-text id, 1–100 chars, `[A-Za-z0-9._:/-]` (`/` added 2026-10-17 for endpoint ids such as `nvidia:google/gemma-…`) | new subjects; existing subjects keep their own model |
| Provider | `provider.endpoints` | array | `[]` | each `{id, name, preset, baseUrl, lanConfirmed, models: [{id, pinned, contextSize, thinking}]}`, `thinking` one of `off` (default), `on`, `default` (CE-52); no key, ever (SE-7) | immediate; the Endpoints list ([custom-endpoints](/specs/custom-endpoints.md) CE-20 to CE-24). *Added 2026-10-17.* |
| Provider | `provider.defaultEffort` | enum | `medium` | `low`/`medium`/`high`/`xhigh`/`max` | new subjects; existing subjects keep their own effort |
| Learn room | `learn.defaultTone` | enum or text | `curious` | preset (`eli5`, `curious`, `student`, `engineer`, `expert`) or custom text up to 300 chars | new subjects; a subject's tone is changed in its subject menu (opened from the title in the header; [rooms-spaces](/specs/rooms-spaces.md) RS-15) |
| Learn room | `learn.contextBudget` | integer (advanced) | 12000 | 2000–100000 tokens | next generation (the map part only; the CLI's own ~13k baseline is extra) |
| General | `updates.checkAtLaunch` | boolean | true | — | next launch; off means no update request unless *Check for updates* is pressed ([updates](/specs/updates.md) UP-3) |
| Developer (hidden) | `developer.updateFolder` | absolute path | empty | empty, or an existing folder | replaces GitHub as the update source ([updates](/specs/updates.md) UP-60 to UP-66) |
| Appearance | `appearance.reduceMotion` | enum | `system` | `system`/`on` | immediate; `system` follows the OS; any other stored value falls back to `system` (GV-100) *(Amended 2026-10-18: `off` is not kept.)* |
| Appearance | `appearance.backdrop` | boolean | true | — | immediate; off removes the ambient backdrop and its glass ([rooms-spaces](/specs/rooms-spaces.md) RS-34) |
| Companion | `companion.show` | boolean | true | — | immediate; off removes Amber everywhere; its features keep their own entry points ([companion](/specs/companion.md) CO-1, CO-2) |
| Companion | `companion.model` | string | `claude-haiku-5-5` | an entry of the model list (SE-48) or free-text id, as `provider.defaultModel` | next Ask Amber call (CO-46); effort is always low |
| Appearance | `appearance.showTokenStats` | boolean | true | — | immediate; hides every token and time figure (node meta line, stats hover, Gallery cards) |

Everything is stored under the keys above, except the following **UI memory**, which is stored in the same
file but has no settings control:

| Key | Type | Default | Meaning |
|---|---|---|---|
| `ui.studySplitPercent` | number 20–80 | 44 | Study split position, app-wide; double-click on the divider resets it |
| `ui.studyCollapsed` | `none`/`graph`/`panel` | `none` | collapsed side, app-wide |
| `ui.legendCollapsed` | boolean | false | legend state |
| `ui.lastRoom` | string | `learn` | the room whose Welcome opens at launch |
| `ui.graphLayout` | `free`/`tree` | `free` | graph layout toggle |
| `ui.textLinks` | boolean | true | whether the reference links between nodes (links written in the text) are drawn; a checkbox in the graph's controls *(Added 2026-10-18 to match the code.)* |
| `ui.lastUpdateCheck` | number (ms since epoch) | 0 | last successful update check ([updates](/specs/updates.md) UP-1) |
| `ui.dismissedUpdate` | string | empty | version whose launch notice the user dismissed (UP-11) |

The defaults of the catalogue are model `opus`, effort `medium`, tone `curious`, layout `free`, context budget 12000 within 2000 to 100000. `opus` is the alias for the latest Opus **that the installed Claude Code CLI knows**: on 2026-10-05 the user's CLI 2.1.274 resolved it to Opus 5 (`claude-opus-5`), and Opus 5.5 (`claude-opus-5-5`) needs CLI 2.1.280 or newer. The default is not `sonnet`. A pinned id the CLI or the account cannot use (too old a CLI, or a model that needs usage credits such as Fable 5.1) fails as `model-unknown` (SE-43).

The last-opened times and the recents list are **not** in this file: they live in the app state file of SE-50.

# Storage

- **SE-1** Settings MUST be one JSON file at `%APPDATA%/Lantern/settings.json` (the OS config directory as given by the platform), with `"format": "lantern-settings/1"`.
- **SE-2** Writes MUST be atomic (temp file in the same directory, then rename) and debounced (about 300 ms), flushing on window close.
- **SE-3** The file MUST be versioned; migrations are forward-only with a backup (`settings.json.bak`), like subjects (ST-31). A higher major version MUST open read-only with a message.
- **SE-4** Unknown keys MUST be preserved on read and write, so a newer or other-room settings section is never lost.
- **SE-5** A missing, empty or corrupt file MUST yield defaults, keep the corrupt file as `settings.json.corrupt-<timestamp>`, and show a toast; the app MUST always start.
- **SE-6** Each value MUST be validated on read and on change; an invalid stored value falls back to its default without discarding the others.
- **SE-7** *(Amended 2026-10-17, [custom-endpoints](/specs/custom-endpoints.md) Endpoint API keys live in Windows Credential Manager, CE-70; `provider.endpoints` holds no key.)* The file MUST NOT contain secrets (API keys are Later and get their own spec: [inference-provider](/specs/inference-provider.md), IP-63).

# Panel

- **SE-10** The panel MUST open from the **gear in the header** and from **Ctrl+,** (table: [graph-view](/specs/graph-view.md) GV-76); Esc closes it. It is an overlay, so the current space stays visible underneath.
- **SE-11** The panel MUST have sections **General**, **Provider**, **Learn room** and **Appearance**, in that order, as a left list with the content on the right. A hidden **Developer** section follows them when revealed ([updates](/specs/updates.md) UP-60). *(Amended 2026-10-16, spec workshop round 9.)* A **Companion** section sits between the room submenus and Appearance: *Show Amber*, *Amber's model*, and the tokens Amber has spent, read from its app-level log ([companion](/specs/companion.md) CO-47).
- **SE-12** **Learn room** is the *room submenu*. Settings sections MUST be contributed by the room definition (id, label, fields with the shape of the catalogue above), so a future room adds its own submenu without changing the panel code ([rooms-spaces](/specs/rooms-spaces.md)). *(Amended 2026-10-12, round 5, for v0.2.0.)* Each room's keys live under its own id (`learn.*`, `choose.*`); the panel lists one room submenu per registered room, after Provider and before Appearance, in registration order. The Choose room's keys are in [choose-room](/specs/choose-room.md) (CR-90). Each room validates its own group (RS-3 `settings`); `ui.lastRoom` holds the room the app was closed in and falls back to the first registered room when unknown (RS-10).
- **SE-13** Advanced settings (context budget) MUST sit under an *Advanced* fold inside their section.
- **SE-14** Changes MUST apply **on change**, with no Save button. A text field applies on blur or Enter (debounced while typing); an invalid value shows an inline message and is not applied.
- **SE-15** Each setting that only affects future work MUST say so in a one-line hint (for example *Applies to new generations*).
- **SE-16** Each section MUST offer *Reset to defaults* for its own keys, after a confirmation.
- **SE-17** All labels and hints MUST live in the strings module (PQ-4).

# General

- **SE-20** The display name default MUST be the Windows user name (`USERNAME`), read at first run and stored; the user can change it. It is the author name on learner turns and edits ([domain-model](/specs/domain-model.md)).
- **SE-21** *Reveal library in Explorer* MUST open the library folder.
- **SE-22** The section MUST end with the app version, *Lantern 0.5.0* (the current version), taken at build time from `package.json` (kept equal to `Cargo.toml` and `tauri.conf.json`), followed by the *Check for updates* button and the *Check for updates at launch* checkbox ([updates](/specs/updates.md) UP-3, UP-20).

# Library folder change flow

Moving is offered, never forced.

- **SE-30** The *Library folder* field MUST be an editable path input (Enter or *Apply path* confirms) and *Browse…* MUST open the system folder picker (File Explorer style, starting in the current library); typed and picked paths follow the same flow. Paths shown or stored MUST be plain (no `\\?\` verbatim prefix). The chosen folder MUST be validated (SE catalogue) before anything else happens.
- **SE-31** If any generation is in flight, the change MUST wait: the button is disabled with *Finish or cancel the running generation first*.
- **SE-32** The app MUST flush pending saves and close the open subject's file handle state before switching.
- **SE-33** If the old library holds subjects, the app MUST offer three choices: **Move** the subjects (copy with verification of each file, then remove the originals only after all copies verify), **Copy** them (originals stay), or **Leave them** and switch only.
- **SE-34** If the chosen folder already contains `subjects/*.json`, they MUST be listed in the new library as they are; subject ids that collide with a moved one MUST NOT be overwritten: the moved file gets a new id suffix and the user is told.
- **SE-35** After the switch the app MUST return to the current room's Welcome, reload the subject list from the new library and show a toast naming the folder. Settings are written only after the folder switch succeeded.
- **SE-36** A failed move MUST leave the old library active and every original file in place, and report which files failed. Nothing is ever deleted unless all copies verified.

# Provider status

The status area in **Provider** shows what the Claude Code CLI provider ([inference-provider](/specs/inference-provider.md)) can do now.

- **SE-40** *(Amended 2026-10-17, [custom-endpoints](/specs/custom-endpoints.md) This status is the *Claude Code* entry. The Endpoints list follows it with one row per endpoint and its own *Test* on one model at a time, CE-20, CE-24. With an endpoint set and no Claude Code installed, the *not installed* banner shows only when a Claude Code model is picked or used, CE-26.)* The section MUST show: *Found / Not found* with the located path, the version, and *Signed in / Not signed in / Not tested yet*.
- **SE-41** The *Test* button MUST run the tiny Opus 5.5 call of IP-41 (no Haiku, 2026-10-15) and show the result: resolved model, duration, or the typed error with its fix-it message. There MUST be no automatic call at startup.
- **SE-42** Until a test or a real generation has run in the session, the login status MUST read *Not tested yet*; a successful or failed generation updates it.
- **SE-43** A failure MUST show a fix-it message and a single action; the user MUST never need a terminal to understand it. Signing in is never done by Lantern in v0.1.0: the user follows step-by-step instructions (SE-47).

| Error type (IP taxonomy) | Fix-it message | Action |
|---|---|---|
| `not-installed` | "Claude Code is not installed. Lantern uses it to talk to Claude with your subscription." | the install instructions of SE-47 (with the install link), *Check again* |
| `not-logged-in` | "Claude Code is installed but not signed in. Sign in with your Claude account." | the sign-in instructions of SE-47, *Check again* |
| `usage-limit` | "Your Claude usage limit was reached. It resets at <time if known>." | *Try again* |
| `model-unknown` | "The model '<id>' is not available to your account." | *Choose a model* (focuses the default model field) |
| `network` | "Could not reach Claude. Check your internet connection." | *Try again* |
| `process-crashed` | "Claude Code stopped unexpectedly." | *Details*, *Try again* |
| `protocol` | "Claude Code gave an answer Lantern could not read. Updating Claude Code may help." | *Details*, *Try again* |

- **SE-44** *Details* MUST show the raw output locally and a *Copy* button; nothing is sent anywhere.
- **SE-45** The same fix-it messages MUST be used when a generation fails in the Learn room (a banner on the node), so the user sees one vocabulary.
- **SE-47** *(Amended 2026-10-22: the frame banner for *not installed* also has *Close*, which hides it until the next launch; the *not signed in* banner has no *Close*.)* v0.1.0 does **not** open the sign-in for the user ([decision](/decisions/cli-signin-instructions-only.md)). When the CLI is not installed or not signed in, Settings → Provider and the frame banner ([inference-provider](/specs/inference-provider.md) IP-44) MUST show clear **step-by-step instructions** with a *Check again* button: for *not installed*, a link to the Claude Code install page and the install steps; for *not signed in*, how to sign in to Claude Code (start Claude Code once, follow its browser sign-in, come back). *Check again* runs the *Test* call. There MUST be no *Sign in to Claude Code* button in v0.1.0 (Later: Lantern opens the sign-in for you). The one-time sign-in is the only step that leaves the UI (AC-6).
- **SE-46** *(Amended 2026-10-17, [custom-endpoints](/specs/custom-endpoints.md) The choices include every pinned endpoint model, CE-22.)* The default model field MUST offer the model list (SE-48) as choices and accept free text; changing it never triggers a call.
- **SE-48** *(Amended 2026-10-17, [custom-endpoints](/specs/custom-endpoints.md) Every picker groups models by endpoint: this static list under *Claude Code*, first and in this order, then each endpoint's pinned models. An endpoint model is stored as `<endpointId>:<modelId>`; a value with no prefix is a Claude Code model, so nothing stored changes meaning. With no endpoint set, the pickers look as before. CE-21 to CE-23.)* The **model list** is static, kept in one place in the code and shared by every model picker (Settings → Provider, Welcome WG-2, the subject menu RS-15). It holds, in this order: the aliases `opus`, `sonnet`, `haiku` (shown as *Opus (latest)*, *Sonnet (latest)*, *Haiku (latest)*), then `claude-fable-5-1`, `claude-opus-5-5`, `claude-opus-5`, `claude-opus-4-8`, `claude-sonnet-5-5`, `claude-sonnet-5`, `claude-haiku-5-5`, `claude-haiku-4-5` (shown as *Fable 5.1*, *Opus 5.5*, …). The value stored and sent to the CLI is the alias or id itself. A model that is not in the list stays reachable as free text, so a new model needs no release. *Added 2026-10-05 (v0.1.1 B3), list validated by the user.*

# App state

- **SE-50** App state MUST be kept in a file **separate from `settings.json`**: `%APPDATA%/Lantern/state.json`, with `"format": "lantern-state/1"`. It holds the last-opened time of each subject and the recents list, **keyed by subject id**; opening a subject updates this file and MUST NOT modify the subject's own file ([subject-storage](/specs/subject-storage.md) ST-6). The same rules as SE-2 to SE-6 apply (atomic debounced writes, versioned, unknown keys kept, a missing or corrupt file yields empty state and never blocks startup). *(Amended 2026-10-16, spec workshop round 9.)* It also holds Amber's spot per space and the tips already seen ([companion](/specs/companion.md) CO-15, CO-21); Amber's app-level call log (CO-47) lives in the same folder as `amber-log.jsonl`.
- **SE-51** The **summary cache** ([subject-storage](/specs/subject-storage.md) ST-7) lives in the same folder (`%APPDATA%/Lantern/summaries.json`). It is keyed by file path, invalidated by mtime and size, and holds title, counts, tokens, main model, `createdAt`, tone, output tokens per resolved model and the generation count (the figures of the Gallery's detailed card stats, [welcome-gallery](/specs/welcome-gallery.md) WG-68). It is derived data and MAY be deleted at any time.
- **SE-52** Neither file is user-editable settings: no panel control changes them.

# Acceptance

AC-7 in [product-scope](/specs/product-scope.md): tone, model and library folder change in the panel and take effect without reinstalling.

# Open

None for v0.1.0.

Related: [inference-provider](/specs/inference-provider.md), [subject-storage](/specs/subject-storage.md), [learn-room](/specs/learn-room.md), [rooms-spaces](/specs/rooms-spaces.md), [product-scope](/specs/product-scope.md).
