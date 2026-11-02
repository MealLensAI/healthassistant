"""Count Clearaer downloads in a local JSON file. Does not use the database."""
from __future__ import annotations

import fcntl
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

COUNT_PATH = Path(__file__).resolve().parent.parent / "var" / "clearaer_count.json"


def _with_count(increment: bool = False) -> int:
    COUNT_PATH.parent.mkdir(parents=True, exist_ok=True)
    COUNT_PATH.touch(exist_ok=True)
    with COUNT_PATH.open("r+", encoding="utf-8") as fh:
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
        raw = fh.read().strip()
        total = 0
        if raw:
            try:
                total = int(json.loads(raw).get("total") or 0)
            except Exception as exc:
                logger.warning("Clearaer count file was unreadable: %s", exc)
                total = 0
        if increment:
            total += 1
            fh.seek(0)
            fh.truncate()
            json.dump({"total": total}, fh)
            fh.flush()
        return total


def download_count() -> int:
    return _with_count(increment=False)


def record_download() -> int:
    return _with_count(increment=True)
