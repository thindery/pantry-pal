#!/usr/bin/env python3
"""Export OpenAPI schema to repo root (PP-027)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app import app  # noqa: E402

OUTPUT = ROOT / "openapi.json"


def main() -> int:
    schema = app.openapi()
    OUTPUT.write_text(json.dumps(schema, indent=2) + "\n")
    print(f"✓ Exported OpenAPI schema to {OUTPUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())