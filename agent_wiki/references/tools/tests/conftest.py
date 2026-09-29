"""Make the bundle's tooling importable from the tests next to it."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

TOOLS_DIR = Path(__file__).resolve().parent.parent
BUNDLE_ROOT = TOOLS_DIR.parent.parent

sys.path.insert(0, str(TOOLS_DIR))


def _load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    # Registered before exec because @dataclass resolves string annotations by
    # looking the defining module up in sys.modules.
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="session")
def okf():
    return _load(TOOLS_DIR / "okf.py", "okf")


@pytest.fixture(scope="session")
def attester():
    # The filename is hyphenated, so it cannot be imported by module name.
    return _load(
        BUNDLE_ROOT / "references" / "attesters" / "command-equality.py",
        "command_equality",
    )


@pytest.fixture(scope="session")
def bundle_root() -> Path:
    """The real wiki, used as the end-to-end fixture.

    Inside the skill's bundle-template the install placeholders (claude-code/sonnet-5.5,
    2026-09-29T21:05:27Z, 2026-09-29) are still unrendered, which makes the seeded
    frontmatter deliberately unparseable — the end-to-end assertions only hold
    for an installed wiki. Skipping keeps the suite green for whoever is
    editing the template itself.
    """
    log = BUNDLE_ROOT / "log.md"
    if log.is_file() and "{{" in log.read_text(encoding="utf-8"):
        pytest.skip("bundle is the unrendered skill template, not an installed wiki")
    return BUNDLE_ROOT


@pytest.fixture
def make_bundle(tmp_path):
    """Build a throwaway bundle from a {relative path: contents} mapping."""

    def _make(files: dict[str, str]) -> Path:
        root = tmp_path / "bundle"
        for rel, contents in files.items():
            path = root / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(contents, encoding="utf-8")
        root.mkdir(parents=True, exist_ok=True)
        return root

    return _make
