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
