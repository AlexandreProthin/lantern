---
type: Attested Computation
title: Wiki conformance check
description: The sanctioned way to prove this bundle still conforms to OKF v0.2.
tags: [meta, okf, validation]
status: stable
runtime: shell
parameters:
  - { name: bundle, type: string, required: true }
executor:
  resource: /references/skills/run-command.md
  receipt: [executed_command, exit_code, stdout, parameters]
attester:
  resource: /references/attesters/command-equality.py
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:05:27Z }
sources:
  - id: okf-conformance
    resource: /references/okf-spec.md
    title: Open Knowledge Format v0.2, §11 Conformance
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

# Computation

```
python {bundle}/references/tools/okf.py validate --bundle {bundle}
```

# Why this is attested rather than just documented

"The wiki is valid" is a claim an agent can make without having checked, and
the claim looks identical either way. Making the check an Attested Computation
means a consumer can tell the difference: the
[executor](/references/skills/run-command.md) returns the command it actually
ran, and the
[attester](/references/attesters/index.md) re-derives what it should have been
and compares.[^okf-conformance]

[^okf-conformance]: Open Knowledge Format v0.2, §11 Conformance

That rules out the failure modes that matter here — reporting a pass without
running anything, running against a different directory, quietly adding
`--strict` or dropping it, or paraphrasing the output. None of those survive a
comparison against the bound command.

# Reading the result

Exit code 0 means conformant. The stdout summary counts concepts, errors, and
warnings; errors are the §11 criteria and the keys the spec marks REQUIRED,
warnings are SHOULD-level guidance that never makes a bundle non-conformant.
See the [okf.py tool](/references/tools/okf-tool.md) for the exact split.

# Running it by hand

The point of the sanctioned form is that the parameters are the only thing
anyone may vary:

```bash
python agent_wiki/references/tools/okf.py validate --bundle agent_wiki
```

To attest a run afterwards, save the receipt and hand both to the attester:

```bash
python agent_wiki/references/attesters/command-equality.py \
    --concept agent_wiki/computations/wiki-conformance.md \
    --receipt receipt.json
```
