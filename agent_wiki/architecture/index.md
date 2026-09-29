# Architecture

How the system is put together: the layers, what talks to what, where state
lives, and what happens on a request or a run. Concepts here describe the shape
of the whole rather than any one module — a reader should be able to hold the
system in their head after reading this directory alone.

Use `type: Architecture`. Link down into [components/](../components/) for the
pieces and across to [decisions/](../decisions/) for why the shape is what it
is.

* [Lantern overview](lantern-overview.md) - Subjects visit rooms; each room holds a graph, a panel and an LLM provider.
* [PoC: the Learn room](poc-learn-room.md) - How the throwaway proof of concept is wired, and its shortcuts.
