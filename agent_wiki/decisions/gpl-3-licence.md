---
type: Decision
title: Lantern is licensed GPL-3.0-or-later
description: Copyleft so that forks stay open and credit stays; the name and logo stay outside the licence.
tags: [licence, gpl, public-repository, distribution]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-17T18:00:00Z }
---

Decided 2026-10-17 with the user, just before the repository goes public (the
[web demo plan](/plans/web-demo.md) needs it public). Until then there was no licence at all, so a
public repository would have meant *all rights reserved*: readable, never reusable.

The user's minimum wants: **credit me** and **keep it open**.

# Options

| Option | Verdict |
|---|---|
| No licence | Rejected: nobody may reuse the code, and contributions have no clear terms. |
| MIT or Apache-2.0 | Rejected: credit is kept, but anyone may ship a closed fork, against *keep it open*. |
| AGPL-3.0 | Rejected: its network clause is aimed at hosted services; Lantern is a desktop app, so it adds friction for nothing. |
| **GPL-3.0-or-later** | **Chosen.** Copyleft: whoever distributes a modified Lantern must publish its source under the same licence and keep the copyright notice. |

# Decision

- Root `LICENSE` holds the full, unmodified GPL-3.0 text from gnu.org.
- The SPDX id `GPL-3.0-or-later` is in `app/package.json` (and its lock file) and in the `[package]`
  of `app/src-tauri/Cargo.toml`; Tauri's bundle takes its licence from there. `tauri.conf.json` gains
  `bundle.copyright`: *Copyright (C) 2026 Alexandre Prothin*.
- The root README has a *Licence* section with the same notice, plus a line saying **the Lantern name
  and logo (Amber, the app icons) are not covered**: a fork may reuse the code, not pose as Lantern.
- *Or later*, so the code can move to a future GPL version without asking every contributor.

# Dependencies

Checked 2026-10-17 over the whole tree (the app's npm production packages from the lock file, the Rust
crates from `cargo metadata` for Windows); all are compatible with GPL-3.0:

- **npm**: MIT, ISC, BSD-2/3-Clause, Apache-2.0, Unlicense, Python-2.0 (`argparse`), and
  MPL-2.0-or-Apache-2.0 (DOMPurify). `khroma` has no `license` field in the lock; it is MIT.
- **Rust**: mostly MIT and/or Apache-2.0; also BSD, ISC, Zlib, Unicode-3.0 (ICU crates),
  CDLA-Permissive-2.0 (`webpki-roots` data) and MPL-2.0 (`cssparser`, `selectors`, `dtoa-short`,
  `option-ext`). MPL-2.0 is GPL-compatible; Apache-2.0 is compatible with GPL-3 (not with GPL-2).

Check any new dependency for a licence that is not (non-commercial, SSPL-style, GPL-2.0-only).

# Costs

None in code. Accepting outside contributions without a CLA means a later licence change would need every contributor's agreement.
