# Computations

Sanctioned, runnable procedures whose result can be checked (OKF §10). Each one
carries the exact computation, the typed parameters a caller may fill, run
instructions for an executor, and a deterministic attester that confirms the
run executed *that* computation rather than an improvised equivalent.

Use `type: Attested Computation`, and give every one a `runtime` — the field
that decides what `parameters` mean and how the executor and attester read
them.

# Concepts

* [Wiki conformance check](wiki-conformance.md) - The sanctioned way to prove this bundle still conforms to OKF v0.2.
