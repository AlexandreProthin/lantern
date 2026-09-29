"""Tests for command-equality.py — the deterministic shell attester (§10)."""

from __future__ import annotations

import json

import pytest

CONCEPT = """---
type: Attested Computation
title: Conformance
runtime: shell
parameters:
  - { name: bundle, type: string, required: true }
executor:
  resource: /references/skills/run-command.md
  receipt: [executed_command, exit_code, stdout, parameters]
attester:
  resource: /references/attesters/command-equality.py
---

# Computation

```
python {bundle}/references/tools/okf.py validate --bundle {bundle}
```

# Notes

Prose the attester must ignore.
"""

SANCTIONED = "python wiki/references/tools/okf.py validate --bundle wiki"


def _receipt(**overrides):
    receipt = {
        "executed_command": SANCTIONED,
        "exit_code": 0,
        "stdout": "Conformant with OKF v0.2",
        "parameters": {"bundle": "wiki"},
    }
    receipt.update(overrides)
    return receipt


@pytest.fixture
def concept(tmp_path):
    path = tmp_path / "wiki-conformance.md"
    path.write_text(CONCEPT, encoding="utf-8")
    return path


# --- Extracting the computation (§10.3) ------------------------------------


def test_extracts_a_fenced_computation(attester):
    assert attester.extract_computation(CONCEPT.split("---\n", 2)[2]) == (
        "python {bundle}/references/tools/okf.py validate --bundle {bundle}"
    )


def test_extracts_an_indented_computation(attester):
    """The spec's own examples use indented blocks rather than fences."""
    body = "# Computation\n\n    SELECT 1\n    FROM t\n\nProse.\n"
    assert attester.extract_computation(body) == "SELECT 1\nFROM t"


def test_stops_at_the_next_heading(attester):
    body = "# Computation\n\n```\nls\n```\n\n# Notes\n\n```\nrm -rf /\n```\n"
    assert attester.extract_computation(body) == "ls"


def test_missing_computation_section_is_an_input_error(attester):
    with pytest.raises(attester.AttestationInputError):
        attester.extract_computation("# Definition\n\nNo computation here.\n")


def test_unterminated_fence_is_an_input_error(attester):
    with pytest.raises(attester.AttestationInputError):
        attester.extract_computation("# Computation\n\n```\nls\n")


# --- Binding (§10.3) -------------------------------------------------------


DECLARED = [{"name": "bundle", "type": "string", "required": True}]


def test_binding_substitutes_every_occurrence(attester):
    bound = attester.bind("run {bundle} on {bundle}", {"bundle": "w"}, DECLARED)
    assert bound == "run w on w"


def test_binding_rejects_a_missing_required_parameter(attester):
    with pytest.raises(attester.AttestationInputError, match="missing required"):
        attester.bind("run {bundle}", {}, DECLARED)


def test_binding_rejects_an_undeclared_parameter(attester):
    with pytest.raises(attester.AttestationInputError, match="undeclared"):
        attester.bind("run {bundle}", {"bundle": "w", "extra": "x"}, DECLARED)


def test_binding_rejects_a_leftover_placeholder(attester):
    declared = DECLARED + [{"name": "other", "required": False}]
    with pytest.raises(attester.AttestationInputError, match="unbound"):
        attester.bind("run {bundle} {other}", {"bundle": "w"}, declared)


# --- Verdicts (§10.5) ------------------------------------------------------


def test_a_faithful_run_passes(attester, concept):
    result = attester.attest(concept, _receipt())
    assert result["verdict"] == "pass"
    assert all(c["passed"] for c in result["checks"])


def test_a_rewritten_command_fails_provenance(attester, concept):
    """The whole point: an agent-authored variant must not attest."""
    result = attester.attest(
        concept, _receipt(executed_command=SANCTIONED + " --strict")
    )
    assert result["verdict"] == "fail"
    provenance = next(c for c in result["checks"] if c["check"] == "provenance")
    assert provenance["passed"] is False


def test_a_run_against_a_different_target_fails(attester, concept):
    result = attester.attest(
        concept,
        _receipt(
            executed_command="python other/references/tools/okf.py validate --bundle other",
        ),
    )
    assert result["verdict"] == "fail"


def test_claimed_parameters_are_rebound_rather_than_trusted(attester, concept):
    """The receipt's own account of the binding is re-derived, not believed."""
    result = attester.attest(
        concept, _receipt(parameters={"bundle": "somewhere-else"})
    )
    assert result["verdict"] == "fail"


def test_a_nonzero_exit_fails_the_outcome_check(attester, concept):
    result = attester.attest(concept, _receipt(exit_code=1))
    assert result["verdict"] == "fail"
    outcome = next(c for c in result["checks"] if c["check"] == "outcome")
    assert outcome["passed"] is False


def test_a_receipt_missing_a_declared_field_fails(attester, concept):
    receipt = _receipt()
    del receipt["stdout"]
    result = attester.attest(concept, receipt)
    assert result["verdict"] == "fail"
    shape = next(c for c in result["checks"] if c["check"] == "receipt_shape")
    assert "stdout" in shape["detail"]


def test_insignificant_whitespace_is_not_a_verdict(attester, concept):
    result = attester.attest(
        concept, _receipt(executed_command="python  wiki/references/tools/okf.py "
                                           "validate   --bundle wiki")
    )
    assert result["verdict"] == "pass"


def test_a_wrong_runtime_is_refused(attester, tmp_path):
    path = tmp_path / "c.md"
    path.write_text(
        "---\ntype: Attested Computation\nruntime: bigquery\n---\n\n"
        "# Computation\n\n```\nSELECT 1\n```\n",
        encoding="utf-8",
    )
    with pytest.raises(attester.AttestationInputError, match="runtime 'shell'"):
        attester.attest(path, _receipt())


def test_a_non_computation_concept_is_refused(attester, tmp_path):
    path = tmp_path / "c.md"
    path.write_text("---\ntype: Component\n---\n\nBody.\n", encoding="utf-8")
    with pytest.raises(attester.AttestationInputError, match="not 'Attested Computation'"):
        attester.attest(path, _receipt())


def test_a_computation_file_wins_over_an_inline_fence(attester, tmp_path):
    """§10.3: `computation` names a file, used instead of a body fence."""
    (tmp_path / "cmd.sh").write_text("echo {bundle}\n", encoding="utf-8")
    path = tmp_path / "c.md"
    path.write_text(
        "---\ntype: Attested Computation\nruntime: shell\ncomputation: cmd.sh\n"
        "parameters:\n  - { name: bundle, required: true }\n---\n\n"
        "# Computation\n\n```\nthis inline block must be ignored {bundle}\n```\n",
        encoding="utf-8",
    )
    result = attester.attest(
        path,
        {"executed_command": "echo w", "exit_code": 0, "parameters": {"bundle": "w"}},
    )
    assert result["verdict"] == "pass"


# --- CLI -------------------------------------------------------------------


def test_cli_exits_zero_on_a_pass(attester, concept, tmp_path, capsys):
    receipt_path = tmp_path / "r.json"
    receipt_path.write_text(json.dumps(_receipt()), encoding="utf-8")
    code = attester.main(["--concept", str(concept), "--receipt", str(receipt_path)])
    assert code == 0
    assert json.loads(capsys.readouterr().out)["verdict"] == "pass"


def test_cli_exits_one_on_a_fail(attester, concept, tmp_path, capsys):
    receipt_path = tmp_path / "r.json"
    receipt_path.write_text(json.dumps(_receipt(exit_code=3)), encoding="utf-8")
    code = attester.main(["--concept", str(concept), "--receipt", str(receipt_path)])
    assert code == 1
    assert json.loads(capsys.readouterr().out)["verdict"] == "fail"


def test_cli_exits_two_on_unusable_input(attester, concept, tmp_path, capsys):
    """Failing to attest is not the same as attesting a pass."""
    receipt_path = tmp_path / "r.json"
    receipt_path.write_text("{not json", encoding="utf-8")
    code = attester.main(["--concept", str(concept), "--receipt", str(receipt_path)])
    assert code == 2
    assert json.loads(capsys.readouterr().out)["verdict"] == "error"


def test_the_real_computation_attests(attester, bundle_root):
    """The wiki's own conformance computation, end to end."""
    result = attester.attest(
        bundle_root / "computations" / "wiki-conformance.md",
        _receipt(),
    )
    assert result["verdict"] == "pass", result
