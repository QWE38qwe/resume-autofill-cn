from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from .native_host import local_config


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m job_email_assistant.export_local_config <output>")
    output = Path(sys.argv[1]).resolve()
    output.write_text(
        json.dumps(local_config(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.chmod(output, 0o600)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
