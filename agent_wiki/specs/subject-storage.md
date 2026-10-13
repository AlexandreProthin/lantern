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

- **ST-1** Each subject MUST be one JSON file with `"format": "lantern/1"`. *(Amended 2026-10-12, round 6, for v0.2.0.)* From v0.2.0 the format is `lantern/2` ([decision](/decisions/format-lantern-2.md), [domain-model](/specs/domain-model.md) DM-60 to DM-68); `lantern/1` files are converted as ST-32 to ST-36 say.
- **ST-2** Subjects MUST live at `<library>/subjects/<id>.json`, where `<library>` is a folder the user chooses; the default is `Documents/Lantern`. This is the same place as the PoC, so the default library already contains PoC files. Files in `subjects/` whose name is not a valid `<id>.json` (for example uppercase letters or reserved names) are foreign: the app MUST ignore them everywhere (listing, import, library transfer), neither listing nor modifying them, and MUST NOT report an error.
- **ST-3** App settings and app state MUST be stored app-side (OS config directory) and MUST NOT be stored in the library.
- **ST-4** A subject id MUST be the slug of its title plus 4 random characters, using only `[a-z0-9-]`, and MUST be validated before it becomes a path.
- **ST-5** Renaming a subject MUST change the title only, never the id or the filename.
- **ST-6** `lastOpenedAt` and the recents list MUST be kept **app-side**, in the app state file `%APPDATA%/Lantern/state.json` (separate from `settings.json`; [settings](/specs/settings.md) SE-50), keyed by subject id. Opening a subject MUST NOT modify its file. *(Amended 2026-10-12, round 5, for v0.2.0.)* Each room's Welcome shows the recents among its own subjects (DM-1); the stored list stays one list.
- **ST-7** Gallery and Welcome statistics MUST come from an **app-side summary cache**, keyed by file path and invalidated by the file's mtime and size, holding: title, counts, tokens, main model, `createdAt`, the tone, the output tokens per resolved model and the generation count (definitions in [welcome-gallery](/specs/welcome-gallery.md) WG-30 to WG-32 and WG-36; they feed the detailed stats of a selected Gallery card, WG-68). It is derived data: it can be deleted at any time and is rebuilt by reading the subject files. It MUST NOT be stored in a subject file. *(Amended 2026-10-13 for v0.2.0.)* The cache holds, per subject, the title, `createdAt` and **one summary per room visit**: the number of nodes per `state`, the count of each short string value per node `data` key (for example Learn's `understoodBy`), the visit's short `data` values (strings of at most 64 characters, numbers, booleans, a tone object), the token totals, the output tokens per resolved model and the generation count. It knows no room: each room turns its visit summary into its Welcome and Gallery stats (WG-30 to WG-36 for Learn). Thumbnails (WG-40) take the room id.
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
- **ST-32** *(v0.2.0.)* A `lantern/1` file MUST be converted to `lantern/2` (DM-68) **the first time
  the app reads it**: when the library is listed at launch, when a subject is opened, and when a
  library is moved or copied. In practice the whole library converts at the first launch of v0.2.0.
- **ST-33** Before replacing a file, its original bytes MUST be written to
  `<library>/subjects/.lantern1-backup/<id>.json` (kept if it already exists). The converted
  subject MUST pass core validation (DM-66) before it replaces the original, through the atomic
  write of ST-20.
- **ST-34** A file that fails to convert MUST be left untouched and shown as unreadable with the
  error, like any other unreadable file; it MUST NOT block the rest of the library.
- **ST-35** Conversion MUST be idempotent: a `lantern/2` file is never converted again, and a
  second run changes nothing.
- **ST-36** The summary cache (ST-7) is versioned; a cache written by v0.1.x MUST be discarded, so
  every file is read (and converted) once. An app older than v0.2.0 opens a `lantern/2` file
  read-only with a message (ST-30, already the case in v0.1.5); the backups allow going back by
  hand.

## PoC import

- **ST-40** *(From v0.2.0 the result is `lantern/2`: the PoC conversion is followed by ST-32 in the same step.)* On first launch, `lantern-poc/1` files in `<library>/subjects/` MUST be converted to `lantern/1`: the graph moves under `rooms.learn`, `parentId` becomes `parents`, missing provenance is marked unknown.
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
