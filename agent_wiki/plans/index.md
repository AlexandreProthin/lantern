# Plans

Work not yet done: roadmaps, staged implementation plans, and todo lists worth
surviving a session. A plan says what is being attempted, in what order, and
how anyone would know it worked.

Use `type: Plan`. Set `stale_after` when a plan targets a date — an expired
plan that still reads as current is worse than no plan. When a plan lands, mark
it `deprecated` and link to what it produced rather than deleting it.

* [Roadmap](roadmap.md) - README, PoC, wiki, then specs and the v0.1.0 plan.
* [v0.1.0 implementation plan](v0-1-0.md) - Milestones M0–M6 plus the Welcome design track, exit checks and early risks.
* [v0.1.1 plan](v0-1-1.md) - The bugs, improvements and feature requests from the v0.1.0 acceptance walk-through.
* [v0.1.2 plan](v0-1-2.md) - The accepted identity release in the app: header mark, Windows app icon, dev favicon, real-use check.
* [v0.2.0 plan](v0-2-0.md) - The second room: room-generic frame and lantern/2 first (Learn unchanged), then the Choose room.
* [v0.4.0 plan](v0-4-0.md) - Amber, the companion: settings and log, Ask Amber and its eval gate, the selection card, room content, then the character on the new top bar, its movement, motions and greetings.
* [v0.4.0 Amber lines](v0-4-0-amber-lines.md) - Draft tips, guide lines, greetings and waiting lines for the user to review.
* [Custom endpoints plan, local version](custom-endpoints-local.md) - The endpoint provider in Rust with Ollama's native chat, routing by model id, Settings → Endpoints, grouped pickers, context windows, the local token line, new errors; the Claude Code path unchanged.
* [Custom endpoints plan, cloud version](custom-endpoints-cloud.md) - API keys in Windows Credential Manager, the NVIDIA preset, consent, cloud tokens with Claude, real use on NVIDIA; then one release for local and cloud.
* [Backlog](backlog.md) - Agreed future work with no version yet; first entry: the companion behaviour spec.
