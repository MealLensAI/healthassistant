"""In-process WebRTC signaling cache.

ICE trickle used to hit Supabase once per candidate and blow the HTTP/2 pool
(ConnectionTerminated / Resource temporarily unavailable). Keep offer/answer/ice
in memory for the life of the call and flush to the DB on a short debounce.
"""

from __future__ import annotations

import copy
import threading
import time
from typing import Any, Callable

Json = dict[str, Any]

_lock = threading.Lock()
_cache: dict[str, Json] = {}
_dirty: set[str] = set()
_timer: threading.Timer | None = None
_FLUSH_DELAY_S = 0.45
_writer: Callable[[str, Json], None] | None = None


def get_cached(call_id: str) -> Json | None:
    with _lock:
        row = _cache.get(call_id)
        return copy.deepcopy(row) if row else None


def put_cached(call_id: str, call: Json, *, dirty: bool = True, flush_now: bool = False) -> Json:
    with _lock:
        _cache[call_id] = copy.deepcopy(call)
        if dirty:
            _dirty.add(call_id)
        snapshot = copy.deepcopy(_cache[call_id])
    if flush_now:
        flush_dirty()
    elif dirty:
        _schedule()
    return snapshot


def drop_cached(call_id: str) -> None:
    with _lock:
        _cache.pop(call_id, None)
        _dirty.discard(call_id)


def set_writer(writer: Callable[[str, Json], None]) -> None:
    global _writer
    _writer = writer


def flush_dirty() -> None:
    global _timer
    with _lock:
        pending = [(cid, copy.deepcopy(_cache[cid])) for cid in list(_dirty) if cid in _cache]
        _dirty.clear()
        if _timer is not None:
            _timer.cancel()
            _timer = None
    writer = _writer
    if not writer:
        return
    for call_id, call in pending:
        try:
            writer(call_id, call)
        except Exception:
            with _lock:
                if call_id in _cache:
                    _dirty.add(call_id)


def _schedule() -> None:
    global _timer

    def _run() -> None:
        flush_dirty()

    with _lock:
        if not _dirty:
            return
        if _timer is not None:
            _timer.cancel()
        _timer = threading.Timer(_FLUSH_DELAY_S, _run)
        _timer.daemon = True
        _timer.start()


def supabase_retry(fn: Callable[[], Any], *, attempts: int = 3) -> Any:
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            return fn()
        except Exception as error:  # noqa: BLE001 — retry transient httpx/postgrest failures
            last = error
            message = str(error).lower()
            transient = any(
                token in message
                for token in (
                    "connectionterminated",
                    "resource temporarily unavailable",
                    "readerror",
                    "writeerror",
                    "timeout",
                    "temporarily",
                    "connection reset",
                    "server disconnected",
                )
            )
            if not transient or attempt >= attempts - 1:
                raise
            time.sleep(0.12 * (attempt + 1))
    assert last is not None
    raise last
