# Attesters

Deterministic code — no model, no judgement — that takes a run's receipt and
returns a verdict. A concept in [computations/](../../computations/) names one
in `attester.resource`, and it is meant to run consumer-side, so a consumer
never has to take the producer's word for it.

An attester answers "was this produced the sanctioned way", which is a
different question from `verified` (§10.6): `verified` confirms the
*definition* still matches policy and is recorded in the bundle, while
attestation confirms a single *run* and is not.

# Code

* `command-equality.py` - Re-derives the bound command from the concept and compares it to what the receipt says actually ran. Used by every `runtime: shell` computation.
