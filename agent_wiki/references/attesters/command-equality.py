#!/usr/bin/env python3
"""Attester: did the run execute the sanctioned command, unaltered?

Deterministic by construction — no model, no network, no judgement. It takes a
receipt produced by the `shell` executor, independently re-derives what the
concept's computation bound with the claimed parameters *should* have been, and
compares. OKF v0.2 §10.2, §10.5.

    python command-equality.py --concept <concept.md> --receipt <receipt.json>

Prints a verdict as JSON. Exit code 0 = pass, 1 = fail, 2 = the inputs were
unusable (which is a failure to attest, not a passing attestation).

The comparison is on the *expanded* command, so a reworded flag, a swapped
computation file, or an extra argument all fail: "did the sanctioned thing run"
stays a mechanical comparison rather than a judgement call.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from pathlib import Path
from typing import Any

_TOOLS = Path(__file__).resolve().parent.parent / "tools" / "okf.py"

_PLACEHOLDER_RE = re.compile(r"\{([A-Za-z_][A-Za-z0-9_]*)\}")
_FENCE_RE = re.compile(r"^\s*(```+|~~~+)")


def _load_okf():
    """Import the sibling okf.py without requiring it to be installed."""
    if "okf" in sys.modules:
        return sys.modules["okf"]
    spec = importlib.util.spec_from_file_location("okf", _TOOLS)
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise RuntimeError(f"Cannot load {_TOOLS}")
    module = importlib.util.module_from_spec(spec)
    # Registered before exec because @dataclass resolves string annotations by
    # looking the defining module up in sys.modules.
    sys.modules["okf"] = module
    spec.loader.exec_module(module)
    return module


class AttestationInputError(Exception):
    """The concept or receipt could not be read well enough to judge a run."""


def extract_computation(body: str) -> str:
    """The computation from a `# Computation` section (§10.3).

    Accepts either of the two forms the spec's examples use: a fenced block, or
    an indented block. Everything outside the block — the prose that explains
    the computation — is ignored.
    """
    lines = body.splitlines()
    start = None
    for i, line in enumerate(lines):
        if line.strip().lower() == "# computation":
            start = i + 1
            break
    if start is None:
        raise AttestationInputError("no `# Computation` section in the concept body")

    section: list[str] = []
    for line in lines[start:]:
        if line.startswith("# "):
            break
        section.append(line)

    # Fenced form.
    fence = None
    collected: list[str] = []
    for line in section:
        match = _FENCE_RE.match(line)
        if fence is None and match:
            fence = match.group(1)[0] * 3
            continue
        if fence is not None:
            if line.strip().startswith(fence):
                return "\n".join(collected).strip()
            collected.append(line)
    if fence is not None:
        raise AttestationInputError("unterminated code fence under `# Computation`")

    # Indented form.
    indented = [line[4:] for line in section if line.startswith("    ")]
    if indented:
        return "\n".join(indented).strip()

    raise AttestationInputError("no code block under `# Computation`")


def bind(computation: str, parameters: dict[str, Any],
         declared: list[dict[str, Any]]) -> str:
    """Substitute `{name}` placeholders, enforcing the declared parameter set."""
    names = {str(p.get("name")) for p in declared if isinstance(p, dict)}
    required = {
        str(p.get("name")) for p in declared
        if isinstance(p, dict) and p.get("required")
    }

    supplied = set(parameters)
    undeclared = supplied - names
    if undeclared:
        raise AttestationInputError(
            f"receipt supplies undeclared parameter(s): {', '.join(sorted(undeclared))}"
        )
    missing = required - supplied
    if missing:
        raise AttestationInputError(
            f"receipt is missing required parameter(s): {', '.join(sorted(missing))}"
        )

    bound = computation
    for name, value in parameters.items():
        bound = bound.replace("{" + name + "}", str(value))

    unbound = _PLACEHOLDER_RE.findall(bound)
    if unbound:
        raise AttestationInputError(
            f"placeholder(s) left unbound: {', '.join(sorted(set(unbound)))}"
        )
    return bound


def normalize(command: str) -> str:
    """Collapse insignificant whitespace so formatting is not a verdict."""
    return " ".join(command.split())


def attest(concept_path: Path, receipt: dict[str, Any]) -> dict[str, Any]:
    """Compare a receipt against its concept's sanctioned computation."""
    okf = _load_okf()

    try:
        doc = okf.OKFDocument.parse(concept_path.read_text(encoding="utf-8"))
    except okf.OKFDocumentError as exc:
        raise AttestationInputError(f"{concept_path}: {exc}") from exc
    fm = doc.frontmatter or {}

    if fm.get("type") != "Attested Computation":
        raise AttestationInputError(
            f"{concept_path}: type is '{fm.get('type')}', not 'Attested Computation'"
        )
    runtime = str(fm.get("runtime") or "")
    if runtime != "shell":
        raise AttestationInputError(
            f"this attester handles runtime 'shell'; the concept declares '{runtime}'"
        )

    # §10.3: a `computation` path wins over an inline body fence.
    computation_path = fm.get("computation")
    if computation_path:
        resolved = _resolve(str(computation_path), concept_path)
        if not resolved.is_file():
            raise AttestationInputError(f"computation file not found: {resolved}")
        computation = resolved.read_text(encoding="utf-8").strip()
    else:
        computation = extract_computation(doc.body or "")

    parameters = receipt.get("parameters")
    if not isinstance(parameters, dict):
        raise AttestationInputError("receipt has no `parameters` mapping")

    expected = bind(computation, parameters, fm.get("parameters") or [])
    executed = str(receipt.get("executed_command") or "")

    checks: list[dict[str, Any]] = []

    command_matches = normalize(expected) == normalize(executed)
    checks.append({
        "check": "provenance",
        "passed": command_matches,
        "detail": "executed command equals the sanctioned computation bound with "
                  "the claimed parameters"
                  if command_matches else
                  f"expected {normalize(expected)!r}, receipt reports {normalize(executed)!r}",
    })

    exit_code = receipt.get("exit_code")
    exit_ok = exit_code == 0
    checks.append({
        "check": "outcome",
        "passed": exit_ok,
        "detail": "exit code 0" if exit_ok else f"exit code {exit_code!r}",
    })

    # The receipt must carry everything the contract said a run would return.
    declared_fields = fm.get("executor", {}).get("receipt") or []
    absent = [f for f in declared_fields if f not in receipt]
    checks.append({
        "check": "receipt_shape",
        "passed": not absent,
        "detail": "receipt carries every declared field" if not absent
                  else f"receipt is missing: {', '.join(absent)}",
    })

    return {
        "concept": concept_path.as_posix(),
        "runtime": runtime,
        "verdict": "pass" if all(c["passed"] for c in checks) else "fail",
        "checks": checks,
    }


def _resolve(path: str, concept_path: Path) -> Path:
    """Resolve a path-valued field per §6.2, relative to the concept."""
    if path.startswith("/"):
        # Bundle-relative. The bundle root is wherever index.md lives above us.
        root = concept_path.resolve().parent
        while root != root.parent and not (root / "index.md").exists():
            root = root.parent
        return root / path.lstrip("/")
    return (concept_path.resolve().parent / path).resolve()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Attest that a shell computation ran as sanctioned."
    )
    parser.add_argument("--concept", required=True,
                        help="path to the Attested Computation document")
    parser.add_argument("--receipt", required=True,
                        help="path to the receipt JSON, or - for stdin")
    args = parser.parse_args(argv)

    try:
        raw = sys.stdin.read() if args.receipt == "-" else \
            Path(args.receipt).read_text(encoding="utf-8")
        receipt = json.loads(raw)
        if not isinstance(receipt, dict):
            raise AttestationInputError("receipt must be a JSON object")
        result = attest(Path(args.concept), receipt)
    except (AttestationInputError, OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"verdict": "error", "detail": str(exc)}, indent=2))
        return 2

    print(json.dumps(result, indent=2))
    return 0 if result["verdict"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
