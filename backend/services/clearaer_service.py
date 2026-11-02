"""Clearaer download counter. Uses one Supabase table, nothing else."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _db():
    try:
        from flask import current_app

        service = getattr(current_app, "supabase_service", None)
        if service is None:
            return None
        if hasattr(service, "admin_db"):
            return service.admin_db()
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


def _parse_rpc_total(data) -> int | None:
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
    return None


def record_download() -> int:
    db = _db()
    if not db:
        return 0
    try:
        result = db.rpc("bump_clearaer_downloads").execute()
        parsed = _parse_rpc_total(getattr(result, "data", None))
        if parsed is not None:
            return parsed
    except Exception as exc:
        logger.warning("Clearaer RPC bump unavailable, using table update: %s", exc)

    try:
        now = datetime.now(timezone.utc).isoformat()
        current = _read_total(db)
        nxt = current + 1
        updated = (
            db.table("clearaer_download_count")
            .update({"total": nxt, "updated_at": now})
            .eq("id", 1)
            .execute()
        )
        rows = getattr(updated, "data", None) or []
        if rows:
            return int(rows[0].get("total") or nxt)
        inserted = (
            db.table("clearaer_download_count")
            .upsert({"id": 1, "total": nxt, "updated_at": now})
            .execute()
        )
        inserted_rows = getattr(inserted, "data", None) or []
        if inserted_rows:
            return int(inserted_rows[0].get("total") or nxt)
        return _read_total(db)
    except Exception as exc:
        logger.warning("Clearaer count bump failed: %s", exc)
        return download_count()
