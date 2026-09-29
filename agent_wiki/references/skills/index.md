# Skills

Run instructions an executor follows to carry out a computation and return a
receipt. A concept in [computations/](../../computations/) names one of these
in `executor.resource`.

OKF fixes the interface, not the packaging: a skill here may be a document a
runner reads, a script, or a container. What matters is that it defines how
parameters bind and what the receipt contains.

# Concepts

* [Run a shell computation](run-command.md) - Run instructions for a runtime `shell` computation, and the receipt a run must return.
