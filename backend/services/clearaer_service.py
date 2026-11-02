"""Clearaer download counter. Uses one Supabase table, nothing else."""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def _db():
    try:
        from flask import current_app

        service = getattr(current_app, "supabase_service", None)
        return getattr(service, "_admin_db", None) or getattr(service, "supabase", None)
    except Exception as exc:
        logger.warning("Clearaer count: no Supabase client (%s)", exc)
        return None


def _read_total(db) -> int:
    result = (
        db.table("clearaer_download_count")
        .select("total")
        .eq("id", 1)
        .limit(1)
        .execute()
    )
    rows = getattr(result, "data", None) or []
    if not rows:
        return 0
    return int(rows[0].get("total") or 0)


def download_count() -> int:
    db = _db()
    if not db:
        return 0
    try:
        return _read_total(db)
    except Exception as exc:
        logger.warning("Clearaer count read failed: %s", exc)
        return 0


def record_download() -> int:
    db = _db()
    if not db:
        return 0
    try:
        result = db.rpc("bump_clearaer_downloads").execute()
        data = getattr(result, "data", None)
        if isinstance(data, (int, float)):
            return int(data)
        if isinstance(data, list) and data:
            first = data[0]
            if isinstance(first, (int, float)):
                return int(first)
            if isinstance(first, dict) and "bump_clearaer_downloads" in first:
                return int(first["bump_clearaer_downloads"] or 0)
        if isinstance(data, str) and data.isdigit():
            return int(data)
        return _read_total(db)
    except Exception as exc:
        logger.warning("Clearaer count bump failed: %s", exc)
        return download_count()
