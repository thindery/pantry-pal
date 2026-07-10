"""Static SQL safety guard (PP-019 Layer 1)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN_DIRS = [
    ROOT / "backend",
    ROOT / "database",
    ROOT / "backend-legacy" / "src",
]

UNSAFE_PATTERNS = [
    "ON CONFLICT DO UPDATE SET quantity = quantity +",
    "ON CONFLICT DO UPDATE SET count = count +",
]


def _sql_sources():
    for base in SCAN_DIRS:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.suffix in {".py", ".ts", ".sql"}:
                yield path


def test_no_unsafe_sqlite_upsert_patterns():
    violations: list[str] = []
    for path in _sql_sources():
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pattern in UNSAFE_PATTERNS:
            if pattern.lower() in text.lower():
                violations.append(f"{path}: {pattern}")
    assert not violations, "Unsafe SQL patterns found:\n" + "\n".join(violations)