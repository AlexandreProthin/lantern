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

M0 supplies an empty shell and provider mode switch. The fake provider contract,
real CLI and `npm run eval -- --model haiku --effort low` runner arrive in M2.
M1 supplies the domain and persistence; M3 supplies the Study loop.

Keep `src-tauri/Cargo.lock`: the Tauri runtime and macro family is aligned with
the working PoC. Unconstrained transitive upgrades can produce incompatible
Windows types and menu macros even while keeping the same Tauri shell version.

Layout: `src/core` holds room-agnostic domain operations, `src/rooms/learn` holds Learn prompts and context, `src/frame` holds app coordination, `src/ui` holds reusable UI and strings. Rust `storage`, `paths` and `provider` own file I/O, OS concerns and inference. Browser calls use a deterministic fake; `VITE_PROVIDER=fake` also forces it in desktop development.
