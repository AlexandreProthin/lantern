# Provider fixtures

`recorded-ok.jsonl` and `recorded-model-unknown.jsonl` were captured on 2026-10-02
from Claude Code 2.1.274 with the exact IP-20 flags, native executable, stdin prompt,
Haiku/low (success) and an intentionally invalid model id (failure).
Session ids, UUIDs and local paths are redacted. The success includes thinking
events and usage; the invalid-model capture tests real wording and `is_error`.

`recorded-web.jsonl` was captured on 2026-10-15 from Claude Code 2.1.290 with the
IP-20 web flags (`--tools "WebSearch,WebFetch" --allowedTools WebSearch WebFetch`),
default model, effort low: one WebFetch the site blocked, one WebSearch, then the
answer. The init event is trimmed to the fields the parser reads plus a few for
context; local paths are redacted. The preamble and repeated-id cases are variants
built from it in the tests.

No-delta, truncated, cancelled and other error cases in the unit tests are
synthetic variants of this event shape. They are fault-injection coverage, not
claims to have recorded authentication, quota or network failures. No credentials
or account state were changed to provoke them. More real error captures remain
an M2 exit item as those failures become available.

The ignored integration test runs a real Haiku call followed by cancellation.
The normal Windows Job Object test starts a hidden child/grandchild and verifies
the job has zero active processes after cancellation.
