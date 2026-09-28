"""In-process pub/sub for marketplace chat realtime (SSE).

Single-process Flask/dev and single-instance deploys get instant fan-out.
Multi-worker production can later swap this for Redis pub/sub without changing
the SSE contract.
"""

from __future__ import annotations

import json
import threading
import time
from queue import Empty, Queue
from typing import Any

Json = dict[str, Any]

_lock = threading.Lock()
_subscribers: dict[str, set[Queue]] = {}


def subscribe(user_id: str) -> Queue:
    queue: Queue = Queue(maxsize=256)
    with _lock:
        _subscribers.setdefault(str(user_id), set()).add(queue)
    return queue


def unsubscribe(user_id: str, queue: Queue) -> None:
    with _lock:
        buckets = _subscribers.get(str(user_id))
        if not buckets:
            return
        buckets.discard(queue)
        if not buckets:
            _subscribers.pop(str(user_id), None)


def publish(user_ids: list[str] | set[str], event_type: str, data: Json) -> None:
    payload = {"type": event_type, "data": data, "at": time.time()}
    targets = {str(item) for item in user_ids if item}
    with _lock:
        for user_id in targets:
            for queue in list(_subscribers.get(user_id) or []):
                try:
                    queue.put_nowait(payload)
                except Exception:
                    pass


def format_sse(event_type: str, data: Json) -> str:
    body = json.dumps(data, default=str, separators=(",", ":"))
    return f"event: {event_type}\ndata: {body}\n\n"


def wait_event(queue: Queue, timeout: float = 25.0) -> Json | None:
    try:
        return queue.get(timeout=timeout)
    except Empty:
        return None
