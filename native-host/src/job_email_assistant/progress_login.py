from __future__ import annotations

import sys

from .progress_monitor import login_and_save


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m job_email_assistant.progress_login <channel-id>")
    login_and_save(sys.argv[1])
