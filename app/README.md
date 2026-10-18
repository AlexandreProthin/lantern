# Lantern v0.1.2

New implementation; the proof of concept it replaced is kept at the `poc-final` git tag. Requirements and milestone exit gates live in `../agent_wiki/plans/v0-1-0.md`.

From this directory:

```powershell
npm ci
npm run dev                 # web build, fake provider
npm run tauri dev           # Windows desktop
npm test                   # pure TypeScript units
npm run check
npm run build
npx playwright install chromium
npx playwright test        # web scaffold (main-loop coverage lands with M3)
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

M0 supplies an empty shell and provider mode switch. M2 supplies the fake provider,
real CLI bridge, learn-1 protocol/context, Learn action coordinator and eval runner:
`npm run eval -- --model haiku --effort low --runs 3` (consumes subscription usage).
See `evals/README.md` for cases and scoring limitations. The Rust real stream/cancel
check is `cargo test --manifest-path src-tauri/Cargo.toml --locked real_cli_stream_and_cancel -- --ignored`.
M1 now supplies the domain, shared stats, Rust library storage and a debounced
frame persistence controller. M3 supplies the Study loop and connects persistence
errors, reload/conflict notices and window-close flushing to the UI.

M4 implements the accepted D1 Welcome recipe and Gallery: per-subject model/tone,
suggestions, cached recents, selection/stats, rename, recycle, Explorer reveal,
lazy bounded thumbnails and shared motion. `tests/library.spec.ts` covers their
fake-provider flows, including deletion during generation and timer-driven handoff.
The idle 50-subject browser gate is `LANTERN_PERF=1 npx playwright test tests/library-performance.spec.ts`
(set the environment variable with `$env:LANTERN_PERF='1'` in PowerShell, then
remove it after the run). Its native cached-list companion is
`cargo test --manifest-path src-tauri/Cargo.toml --locked fifty_cached_summaries_meet_wg43 -- --ignored --nocapture`.

Build the unsigned per-user Windows preview installer with `npm run installer:preview`. It lands in `src-tauri/target/release/bundle/preview/` under a timestamped name, and a release installer of the same version in `bundle/nsis/` is left as it was.
The result is under `src-tauri/target/release/bundle/nsis/`. This explicit preview
configuration disables updater artifact signing, so a preview build is never
published. A release build (specs/updates.md, UP-40..44) needs the public key in
`src-tauri/tauri.conf.json` and the private key supplied outside the repository:

```powershell
npx tauri signer generate -w $HOME\.tauri\lantern-updater.key   # once; keep the key out of the repo
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $HOME\.tauri\lantern-updater.key -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = '<the password you chose>'
npx tauri build --bundles nsis          # writes the installer, its .sig
node scripts/make-latest-json.mjs "What changed" --out D:\LanternReleases   # writes latest.json, copies both
```

If the build is run without the password, it still writes the installer and only
the signing step fails; sign it afterwards (the password is asked for interactively):
`npx tauri signer sign -f $HOME\.tauri\lantern-updater.key src-tauri\target\release\bundle\nsis\Lantern_<version>_x64-setup.exe`.

Upload the installer and `latest.json` to the GitHub release. A release without
`latest.json` can never update itself. While the repository is private the GitHub
channel answers 404 (UP-45); `--out` fills a **local update folder** instead, which
an installed build uses once it is set in the hidden Settings → Developer section
(five clicks on the version line, UP-60..66). No signing key is generated or committed. Follow `ACCEPTANCE.md` (and, from v0.3.0, `ACCEPTANCE-CHOOSE.md`; from v0.4.0, `ACCEPTANCE-AMBER.md`; with local endpoints, `ACCEPTANCE-ENDPOINTS.md`) before releasing.

Storage tests use isolated temporary libraries and never modify real subjects.
They cover round-trip, path safety, conflicts, cache invalidation, read-only newer
formats and PoC backup/idempotence. Run the ST-50 performance gate separately on an
idle machine: `cargo test --manifest-path src-tauri/Cargo.toml --locked five_hundred_nodes_meet_st50 -- --ignored --nocapture`.
It prints five save/load samples and requires median save <100 ms and load <200 ms.
Import copies of real PoC subjects (the originals are never touched) with
`LANTERN_POC_DIR=<folder> cargo test --manifest-path src-tauri/Cargo.toml --locked real_poc_subjects_import_validate_and_round_trip -- --ignored --nocapture`.
On Windows, `delete_subject_sends_file_to_real_recycle_bin -- --ignored` sends one
disposable temp subject to the real Recycle Bin.

Keep `src-tauri/Cargo.lock`: the Tauri runtime and macro family is aligned with
the working PoC. Unconstrained transitive upgrades can produce incompatible
Windows types and menu macros even while keeping the same Tauri shell version.

Layout: `src/core` holds room-agnostic domain operations, `src/rooms/learn` holds Learn prompts and context, `src/frame` holds app coordination, `src/ui` holds reusable UI and strings. Rust `storage`, `paths` and `provider` own file I/O, OS concerns and inference. Browser calls use a deterministic fake; `VITE_PROVIDER=fake` also forces it in desktop development.
