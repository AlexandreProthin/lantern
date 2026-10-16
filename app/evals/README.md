# Prompt evals (PQ-30..34)

From `app/`, run `npm run eval -- --model haiku --effort low --runs 3`.
The installed CLI is found at `~/.local/bin/claude.exe`; override with `LANTERN_CLAUDE`.
This consumes subscription usage. It runs 24 reproducible EN/FR, small/large cases
per run in batches of three, through the approved isolated CLI flags. Raw replies,
usage and timings stay in git-ignored `evals/results/`.

The gate is 95% for each run, not an aggregate. Checks cover options count/grammar,
existing-title deduplication, links, task-specific blocks and check-only understanding.
Language checks are lexical smoke checks; review prose for language and teaching
quality before release. Synthetic map directions test scale and title avoidance;
they do not claim to represent a real 300-node learner subject.

## Choose room (CP-60, CP-61)

From `app/`, `npm run eval:choose -- --runs 1` runs the ten `choose-1` cases (19 calls, research cases twice) on
the default model at medium effort, with the app's web flags. A run costs about $10 at API prices and most of a
subscription session window, so run one per window. `--only <id>` runs some cases, `--dry` checks the fixtures
without calling the CLI.

`npx tsx evals/choose-subject.ts evals/results/<run>.json [--run 1]` turns a saved run into a Choose subject,
without model calls: the replies are replayed through `ChooseSession` and checked as Lantern does when it opens a
file. It writes `<run>-run1-subject.json` beside the results, a `lantern/2` subject file for a development build
with the Choose room (`?chooseRoom`).
