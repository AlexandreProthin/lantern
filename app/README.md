# Lantern v0.1.0

New implementation; `../poc/` remains a reference. Requirements and milestone exit gates live in `../agent_wiki/plans/v0-1-0.md`.

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

M4's design-independent controllers are ready in `src/frame/catalogue.ts` and
`src/rooms/learn/suggestions.ts`: summary-based sorting/filtering/selection and
stats, plus unlogged cancellable subject suggestions. They have unit coverage
but are not wired to screens yet. Welcome/Gallery remain stubs pending D1's recipe.

Storage tests use isolated temporary libraries and never modify real subjects.
They cover round-trip, path safety, conflicts, cache invalidation, read-only newer
formats and PoC backup/idempotence. Run the ST-50 performance gate separately on an
idle machine: `cargo test --manifest-path src-tauri/Cargo.toml --locked five_hundred_nodes_meet_st50 -- --ignored --nocapture`.
It prints five save/load samples and requires median save <100 ms and load <200 ms.
No real PoC subjects were found locally for the remaining import exit check.

Keep `src-tauri/Cargo.lock`: the Tauri runtime and macro family is aligned with
the working PoC. Unconstrained transitive upgrades can produce incompatible
Windows types and menu macros even while keeping the same Tauri shell version.

Layout: `src/core` holds room-agnostic domain operations, `src/rooms/learn` holds Learn prompts and context, `src/frame` holds app coordination, `src/ui` holds reusable UI and strings. Rust `storage`, `paths` and `provider` own file I/O, OS concerns and inference. Browser calls use a deterministic fake; `VITE_PROVIDER=fake` also forces it in desktop development.
