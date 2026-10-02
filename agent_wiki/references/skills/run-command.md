---
type: Skill
title: Run a shell computation
description: Run instructions for a runtime `shell` computation, and the receipt a run must return.
tags: [meta, executor, okf]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:05:27Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

# When this applies

Any concept of `type: Attested Computation` with `runtime: shell` names this
document in `executor.resource`. It is the sanctioned way to run that
computation, and it defines the receipt an
[attester](/references/attesters/index.md) will inspect.

OKF fixes this interface, not its packaging (§1): what sits behind
`executor.resource` may be a document like this one, a script, or a container.

# Parameter binding

For `runtime: shell`, a parameter binds by literal substitution of `{name}` in
the computation text. Every parameter declared `required: true` must be
supplied; supplying a parameter that was not declared is an error.

The runner may only supply **values**. It must never edit, reword, or
"improve" the computation — that is the whole point of the sanctioned form. A
rewritten command fails attestation, which is the intended outcome, not a
malfunction.

# Steps

1. Read the computation: the fenced block under `# Computation` in the concept
   body, or the file named by the `computation` frontmatter key if present.
2. Bind: replace each `{name}` with the supplied value. Refuse to run if any
   `{placeholder}` remains unbound.
3. Run the bound command from the repository root, capturing stdout, stderr,
   and the exit code. Do not run it through a shell that would expand or
   rewrite it further than the binding did.
4. Return the receipt.

# Receipt

A JSON object carrying exactly the fields the concept's `executor.receipt`
lists. For this executor:

```json
{
  "executed_command": "python agent_wiki/references/tools/okf.py validate --bundle agent_wiki",
  "exit_code": 0,
  "stdout": "12 concept(s), 0 error(s), 3 warning(s)\nConformant with OKF v0.2",
  "parameters": { "bundle": "agent_wiki" }
}
```

`executed_command` must be the command as actually run, not as intended.
`parameters` echoes the values that were bound, so the attester can re-derive
the binding independently instead of trusting the runner's account of it.

The receipt is a runtime artifact. It is **not** written into the bundle
(§10.5).

# Then attest

Hand the receipt to the concept's `attester.resource` and act on its verdict.
A failing attestation is surfaced, never swallowed: the value is not displayed
as if it were sound.
