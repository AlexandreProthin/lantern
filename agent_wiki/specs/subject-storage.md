---
type: Spec
title: Subject storage
description: Where subjects live on disk, the lantern/1 file format rules, write safety, conflict handling, versioning and PoC import.
tags: [storage, persistence, format]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-02T11:00:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Source: spec workshop rounds 1–3 (2026-10-01/02). Agreed with the user 2026-10-02 (q-r3-review).

Decision behind this spec: [subject-single-json-file](/decisions/subject-single-json-file.md).
Content of the file: [domain-model](/specs/domain-model.md).

# Requirements

## Format and location

- **ST-1** Each subject MUST be one JSON file with `"format": "lantern/1"`.
- **ST-2** Subjects MUST live at `<library>/subjects/<id>.json`, where `<library>` is a folder the user chooses; the default is `Documents/Lantern`. This is the same place as the PoC, so the default library already contains PoC files. Files in `subjects/` whose name is not a valid `<id>.json` (for example uppercase letters or reserved names) are foreign: the app MUST ignore them everywhere (listing, import, library transfer), neither listing nor modifying them, and MUST NOT report an error.
- **ST-3** App settings and app state MUST be stored app-side (OS config directory) and MUST NOT be stored in the library.
- **ST-4** A subject id MUST be the slug of its title plus 4 random characters, using only `[a-z0-9-]`, and MUST be validated before it becomes a path.
- **ST-5** Renaming a subject MUST change the title only, never the id or the filename.
- **ST-6** `lastOpenedAt` and the recents list MUST be kept **app-side**, in the app state file `%APPDATA%/Lantern/state.json` (separate from `settings.json`; [settings](/specs/settings.md) SE-50), keyed by subject id. Opening a subject MUST NOT modify its file.
- **ST-7** Gallery and Welcome statistics MUST come from an **app-side summary cache**, keyed by file path and invalidated by the file's mtime and size, holding: title, counts, tokens, main model, `createdAt`, the tone, the output tokens per resolved model and the generation count (definitions in [welcome-gallery](/specs/welcome-gallery.md) WG-30 to WG-32 and WG-36; they feed the detailed stats of a selected Gallery card, WG-68). It is derived data: it can be deleted at any time and is rebuilt by reading the subject files. It MUST NOT be stored in a subject file.
- **ST-8** Deleting a subject MUST move its file to the Windows Recycle Bin, never remove it permanently, and MUST drop its entries from the state file and the summary cache.

## Write safety

- **ST-20** A save MUST write to a temporary file in the same directory and then rename it over the target.
- **ST-21** Saves SHOULD be debounced (about 300 ms) and the app MUST flush pending saves on window close.
- **ST-22** A failed save MUST be shown in the UI and retried; it MUST NOT be silent.
- **ST-23** The app MUST run as a single instance (Tauri single-instance plugin) so two windows never write the same file.
- **ST-24** Before writing, the app MUST detect that the file on disk changed since Lantern last read or wrote it (mtime and size, or a hash; for example after a git pull or a sync). If so it MUST NOT overwrite silently; ST-25 and ST-26 say what happens.
- **ST-25** If the file changed on disk and there are **no unsaved local changes**, the app MUST reload it silently and show a toast.
- **ST-26** If **both sides changed**, the app MUST keep the disk version open, save the local version as `<id>.conflict-<timestamp>.json` next to it, and show a banner with *Open conflict copy*. Conflict copies MUST NOT be listed as subjects in Welcome or Gallery.

## Versioning

- **ST-30** A reader MUST open a file with a higher major format read-only and show a message.
- **ST-31** Migrations MUST be forward-only and MUST keep a backup of the previous file.

## PoC import

- **ST-40** On first launch, `lantern-poc/1` files in `<library>/subjects/` MUST be converted to `lantern/1`: the graph moves under `rooms.learn`, `parentId` becomes `parents`, missing provenance is marked unknown.
- **ST-41** Originals MUST be kept in `<library>/subjects/.poc-backup/`.
- **ST-42** The import MUST be idempotent: running it again changes nothing.

## Generation log growth

- **ST-45** The generation log MUST be kept in the subject file forever, with no cap or archive: about 300 bytes per record, so 2,000 calls come to about 600 KB ([domain-model](/specs/domain-model.md) DM-34).

## Library folder

- **ST-46** The library folder MAY be changed in Settings. The flow (moving, copying or leaving subjects, collisions, failures) is specified in [settings](/specs/settings.md), SE-30 to SE-36. Storage code MUST take the library path as a parameter, never read it from a constant.

## Scale

- **ST-50** A 500-node subject MUST load in under 200 ms and save in under 100 ms on a typical laptop SSD.

# Open

None for v0.1.0.

Related: [domain-model](/specs/domain-model.md), [settings](/specs/settings.md), [platform-quality](/specs/platform-quality.md).
