"""Dockerfile integrity checks.

Ensures all runtime-critical files are copied into the image so that
missing COPY instructions are caught at test time, not after deploy.
"""

from __future__ import annotations

from pathlib import Path

DOCKERFILE = Path(__file__).parents[2] / "Dockerfile"

REQUIRED_COPIES = [
    "app/",
    "alembic.ini",
    "migrations/",
]


def _copy_sources() -> list[str]:
    """Return all source paths from COPY instructions in the final stage."""
    lines = DOCKERFILE.read_text().splitlines()
    # Only look at the final stage (after the last FROM)
    final_stage: list[str] = []
    for line in lines:
        if line.strip().upper().startswith("FROM"):
            final_stage = []
        else:
            final_stage.append(line)

    sources = []
    for line in final_stage:
        stripped = line.strip()
        if stripped.upper().startswith("COPY"):
            parts = [p for p in stripped.split() if not p.startswith("--")]
            # COPY src [src...] dst — everything except last token is a source
            sources.extend(parts[1:-1])
    return sources


def test_dockerfile_exists() -> None:
    assert DOCKERFILE.exists(), "Dockerfile not found"


def test_required_files_copied() -> None:
    sources = _copy_sources()
    for required in REQUIRED_COPIES:
        assert any(required in s for s in sources), (
            f"Dockerfile is missing COPY for '{required}'. "
            f"Found sources: {sources}"
        )
