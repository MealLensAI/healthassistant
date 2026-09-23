from __future__ import annotations

import copy
import json
from pathlib import Path
from threading import Lock
from typing import Any

from .config import settings
from .seed_data import initial_state

Json = dict[str, Any]


def _copy(state: Json) -> Json:
    return copy.deepcopy(state)


class MemoryStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._state = _copy(initial_state())

    def snapshot(self) -> Json:
        with self._lock:
            return _copy(self._state)

    def replace(self, state: Json) -> Json:
        with self._lock:
            self._state = _copy(state)
            return _copy(self._state)

    def reset(self) -> Json:
        return self.replace(initial_state())


class SupabaseStore:
    def __init__(self) -> None:
        from supabase import create_client

        self._lock = Lock()
        self.client = create_client(settings.supabase_url, settings.supabase_service_role_key)

    def snapshot(self) -> Json:
        with self._lock:
            return _copy(load_from_supabase(self.client))

    def replace(self, state: Json) -> Json:
        with self._lock:
            save_to_supabase(self.client, state)
            return _copy(load_from_supabase(self.client))

    def reset(self) -> Json:
        return self.replace(initial_state())


def dietitian_row(item: Json) -> Json:
    return {
        "id": item["id"],
        "user_id": item["userId"],
        "name": item["name"],
        "title": item.get("title") or "Dietitian",
        "country": item.get("country") or "",
        "specialties": item.get("specialties") or [],
        "conditions": item.get("conditions") or [],
        "years_experience": item.get("yearsExperience") or 0,
        "rating": item.get("rating") or 0,
        "review_count": item.get("reviewCount") or 0,
        "bio": item.get("bio") or "",
        "languages": item.get("languages") or [],
        "workplace": item.get("workplace") or "",
        "avatar": item.get("avatar") or "",
        "cover_image": item.get("coverImage") or "",
        "verified": bool(item.get("verified")),
        "featured": bool(item.get("featured")),
        "education": item.get("education") or [],
        "experience": item.get("experience") or [],
        "documents": item.get("documents") or [],
        "reviews": item.get("reviews") or [],
        "availability": item.get("availability") or [],
        "status": item.get("status") or "pending",
    }


def dietitian_from_row(row: Json) -> Json:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "name": row["name"],
        "title": row.get("title") or "Dietitian",
        "country": row.get("country") or "",
        "specialties": row.get("specialties") or [],
        "conditions": row.get("conditions") or [],
        "yearsExperience": row.get("years_experience") or 0,
        "rating": float(row.get("rating") or 0),
        "reviewCount": row.get("review_count") or 0,
        "bio": row.get("bio") or "",
        "languages": row.get("languages") or [],
        "workplace": row.get("workplace") or "",
        "avatar": row.get("avatar") or "",
        "coverImage": row.get("cover_image") or "",
        "verified": bool(row.get("verified")),
        "featured": bool(row.get("featured")),
        "education": row.get("education") or [],
        "experience": row.get("experience") or [],
        "documents": row.get("documents") or [],
        "reviews": row.get("reviews") or [],
        "availability": row.get("availability") or [],
        "status": row.get("status") or "pending",
    }


def profile_row(item: Json) -> Json:
    return {
        "id": item["id"],
        "name": item["name"],
        "email": item["email"],
        "role": item["role"],
        "avatar": item.get("avatar") or "",
        "country": item.get("country"),
        "title": item.get("title"),
        "phone": item.get("phone"),
    }


def profile_from_row(row: Json) -> Json:
    user = {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "avatar": row.get("avatar") or "",
    }
    if row.get("country"):
        user["country"] = row["country"]
    if row.get("title"):
        user["title"] = row["title"]
    if row.get("phone"):
        user["phone"] = row["phone"]
    return user


def _iso(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return value.isoformat()


def state_from_tables(tables: Json) -> Json:
    profiles = tables.get("profiles") or []
    dietitians = tables.get("dietitians") or []
    applications = tables.get("applications") or []
    conversations = tables.get("conversations") or []
    participants = tables.get("conversation_participants") or []
    messages = tables.get("messages") or []
    appointments = tables.get("appointments") or []
    files = tables.get("patient_files") or []
    requests = tables.get("consultation_requests") or []
    patient_profiles = tables.get("patient_profiles") or []
    patient_settings = tables.get("patient_settings") or []
    sessions = tables.get("device_sessions") or []
    methods = tables.get("payment_methods") or []
    quotes = tables.get("payment_quotes") or []
    payments = tables.get("payments") or []
    missed = tables.get("missed_calls") or []
    notifications = tables.get("notifications") or []
    live_calls = tables.get("live_calls") or []

    by_conv: dict[str, list[str]] = {}
    for item in participants:
        by_conv.setdefault(item["conversation_id"], []).append(item["user_id"])

    return {
        "users": [profile_from_row(item) for item in profiles],
        "dietitians": [dietitian_from_row(item) for item in dietitians],
        "applications": [
            {
                "id": item["id"],
                "userId": item["user_id"],
                "fullName": item["full_name"],
                "email": item["email"],
                "phone": item.get("phone") or "",
                "country": item.get("country") or "",
                "yearsExperience": item.get("years_experience") or 0,
                "bio": item.get("bio") or "",
                "specialties": item.get("specialties") or [],
                "workplace": item.get("workplace") or "",
                "languages": item.get("languages") or [],
                "education": item.get("education") or [],
                "experience": item.get("experience") or [],
                "documents": item.get("documents") or [],
                "status": item.get("status") or "pending",
                "submittedAt": _iso(item.get("submitted_at")),
                "adminNotes": item.get("admin_notes") or [],
                "moreInfoRequest": item.get("more_info_request"),
            }
            for item in applications
        ],
        "conversations": [
            {
                "id": item["id"],
                "participantIds": by_conv.get(item["id"], []),
                "lastMessage": item.get("last_message") or "",
                "lastAt": _iso(item.get("last_at")),
                "lastReadAt": item.get("last_read_at") or {},
            }
            for item in conversations
        ],
        "messages": [
            {
                "id": item["id"],
                "conversationId": item["conversation_id"],
                "senderId": item["sender_id"],
                "text": item["text"],
                "timestamp": _iso(item.get("timestamp")),
                "attachments": item.get("attachments") or [],
            }
            for item in messages
        ],
        "appointments": [
            {
                "id": item["id"],
                "patientId": item["patient_id"],
                "dietitianId": item["dietitian_id"],
                "date": item["date"],
                "time": item["time"],
                "status": item["status"],
                "type": item["type"],
                "topic": item.get("topic") or "",
            }
            for item in appointments
        ],
        "files": [
            {
                "id": item["id"],
                "ownerId": item["owner_id"],
                "sharedWithId": item.get("shared_with_id"),
                "name": item["name"],
                "category": item["category"],
                "size": item.get("size") or "",
                "uploadedAt": _iso(item.get("uploaded_at")),
                "url": item.get("url"),
            }
            for item in files
        ],
        "consultationRequests": [
            {
                "id": item["id"],
                "patientId": item["patient_id"],
                "dietitianId": item["dietitian_id"],
                "status": item["status"],
                "createdAt": _iso(item.get("created_at")),
                "note": item.get("note") or "",
            }
            for item in requests
        ],
        "patientProfiles": [item["payload"] | {"userId": item["user_id"]} for item in patient_profiles],
        "patientSettings": [item["payload"] | {"userId": item["user_id"]} for item in patient_settings],
        "deviceSessions": [
            {
                "id": item["id"],
                "userId": item["user_id"],
                "device": item.get("device") or "",
                "location": item.get("location") or "",
                "lastActive": item.get("last_active") or "",
                "current": bool(item.get("current")),
            }
            for item in sessions
        ],
        "paymentMethods": [
            {
                "id": item["id"],
                "patientId": item["patient_id"],
                "label": item["label"],
                "kind": item["kind"],
                "last4": item.get("last4"),
                "expiry": item.get("expiry"),
                "isDefault": bool(item.get("is_default")),
            }
            for item in methods
        ],
        "paymentQuotes": [
            {
                "id": item["id"],
                "patientId": item["patient_id"],
                "title": item["title"],
                "description": item.get("description") or "",
                "amount": float(item["amount"]),
                "currency": item.get("currency") or "GBP",
                "dietitianName": item.get("dietitian_name"),
                "kind": item.get("kind") or "consult",
                "status": item.get("status") or "open",
            }
            for item in quotes
        ],
        "payments": [
            {
                "id": item["id"],
                "patientId": item["patient_id"],
                "quoteId": item.get("quote_id"),
                "amount": float(item["amount"]),
                "currency": item.get("currency") or "GBP",
                "method": item.get("method") or "",
                "status": item.get("status") or "paid",
                "paidAt": _iso(item.get("paid_at")),
                "receipt": item.get("receipt") or "",
                "description": item.get("description") or "",
            }
            for item in payments
        ],
        "missedCalls": [
            {
                "id": item["id"],
                "userId": item["user_id"],
                "peerId": item["peer_id"],
                "peerName": item["peer_name"],
                "createdAt": _iso(item.get("created_at")),
                "seen": bool(item.get("seen")),
            }
            for item in missed
        ],
        "notifications": [
            {
                "id": item["id"],
                "userId": item["user_id"],
                "kind": item.get("kind") or "info",
                "title": item["title"],
                "body": item.get("body") or "",
                "href": item.get("href"),
                "createdAt": _iso(item.get("created_at")),
                "read": bool(item.get("read")),
            }
            for item in notifications
        ],
        "liveCalls": [
            {
                "id": item["id"],
                "conversationId": item["conversation_id"],
                "callerId": item["caller_id"],
                "calleeId": item["callee_id"],
                "callerName": item.get("caller_name") or "",
                "callerAvatar": item.get("caller_avatar") or "",
                "calleeName": item.get("callee_name") or "",
                "calleeAvatar": item.get("callee_avatar") or "",
                "status": item.get("status") or "ringing",
                "startedAt": _iso(item.get("started_at")),
                "offer": item.get("offer"),
                "answer": item.get("answer"),
                "ice": item.get("ice") or [],
            }
            for item in live_calls
        ],
    }


def load_from_supabase(client) -> Json:
    tables = {
        "profiles": client.table("profiles").select("*").execute().data or [],
        "dietitians": client.table("dietitians").select("*").execute().data or [],
        "applications": client.table("applications").select("*").execute().data or [],
        "conversations": client.table("conversations").select("*").execute().data or [],
        "conversation_participants": client.table("conversation_participants").select("*").execute().data or [],
        "messages": client.table("messages").select("*").execute().data or [],
        "appointments": client.table("appointments").select("*").execute().data or [],
        "patient_files": client.table("patient_files").select("*").execute().data or [],
        "consultation_requests": client.table("consultation_requests").select("*").execute().data or [],
        "patient_profiles": client.table("patient_profiles").select("*").execute().data or [],
        "patient_settings": client.table("patient_settings").select("*").execute().data or [],
        "device_sessions": client.table("device_sessions").select("*").execute().data or [],
        "payment_methods": client.table("payment_methods").select("*").execute().data or [],
        "payment_quotes": client.table("payment_quotes").select("*").execute().data or [],
        "payments": client.table("payments").select("*").execute().data or [],
        "missed_calls": client.table("missed_calls").select("*").execute().data or [],
        "notifications": client.table("notifications").select("*").execute().data or [],
    }
    try:
        tables["live_calls"] = client.table("live_calls").select("*").execute().data or []
    except Exception:
        tables["live_calls"] = []
    return state_from_tables(tables)


def _ids(rows: list[Json], key: str = "id") -> set[str]:
    return {row[key] for row in rows}


def _upsert(client, table: str, rows: list[Json]) -> None:
    if rows:
        client.table(table).upsert(rows).execute()


def _prune(client, table: str, rows: list[Json], key: str = "id") -> None:
    existing = client.table(table).select(key).execute().data or []
    keep = _ids(rows, key)
    gone = [item[key] for item in existing if item[key] not in keep]
    if gone:
        client.table(table).delete().in_(key, gone).execute()


def tables_from_state(state: Json) -> Json:
    return {
        "profiles": [profile_row(item) for item in state.get("users", [])],
        "dietitians": [dietitian_row(item) for item in state.get("dietitians", [])],
        "applications": [
            {
                "id": item["id"],
                "user_id": item["userId"],
                "full_name": item["fullName"],
                "email": item["email"],
                "phone": item.get("phone") or "",
                "country": item.get("country") or "",
                "years_experience": item.get("yearsExperience") or 0,
                "bio": item.get("bio") or "",
                "specialties": item.get("specialties") or [],
                "workplace": item.get("workplace") or "",
                "languages": item.get("languages") or [],
                "education": item.get("education") or [],
                "experience": item.get("experience") or [],
                "documents": item.get("documents") or [],
                "status": item.get("status") or "pending",
                "submitted_at": item.get("submittedAt"),
                "admin_notes": item.get("adminNotes") or [],
                "more_info_request": item.get("moreInfoRequest"),
            }
            for item in state.get("applications", [])
        ],
        "conversations": [
            {
                "id": item["id"],
                "last_message": item.get("lastMessage") or "",
                "last_at": item.get("lastAt"),
                "last_read_at": item.get("lastReadAt") or {},
            }
            for item in state.get("conversations", [])
        ],
        "conversation_participants": [
            {"conversation_id": item["id"], "user_id": user_id}
            for item in state.get("conversations", [])
            for user_id in item.get("participantIds", [])
        ],
        "messages": [
            {
                "id": item["id"],
                "conversation_id": item["conversationId"],
                "sender_id": item["senderId"],
                "text": item["text"],
                "timestamp": item.get("timestamp"),
                "attachments": item.get("attachments") or [],
            }
            for item in state.get("messages", [])
        ],
        "appointments": [
            {
                "id": item["id"],
                "patient_id": item["patientId"],
                "dietitian_id": item["dietitianId"],
                "date": item["date"],
                "time": item["time"],
                "status": item["status"],
                "type": item["type"],
                "topic": item.get("topic") or "",
            }
            for item in state.get("appointments", [])
        ],
        "patient_files": [
            {
                "id": item["id"],
                "owner_id": item["ownerId"],
                "shared_with_id": item.get("sharedWithId"),
                "name": item["name"],
                "category": item["category"],
                "size": item.get("size") or "",
                "uploaded_at": item.get("uploadedAt"),
                "url": item.get("url"),
            }
            for item in state.get("files", [])
        ],
        "consultation_requests": [
            {
                "id": item["id"],
                "patient_id": item["patientId"],
                "dietitian_id": item["dietitianId"],
                "status": item["status"],
                "created_at": item.get("createdAt"),
                "note": item.get("note") or "",
            }
            for item in state.get("consultationRequests", [])
        ],
        "patient_profiles": [{"user_id": item["userId"], "payload": item} for item in state.get("patientProfiles", [])],
        "patient_settings": [{"user_id": item["userId"], "payload": item} for item in state.get("patientSettings", [])],
        "device_sessions": [
            {
                "id": item["id"],
                "user_id": item["userId"],
                "device": item.get("device") or "",
                "location": item.get("location") or "",
                "last_active": item.get("lastActive") or "",
                "current": bool(item.get("current")),
            }
            for item in state.get("deviceSessions", [])
        ],
        "payment_methods": [
            {
                "id": item["id"],
                "patient_id": item["patientId"],
                "label": item["label"],
                "kind": item["kind"],
                "last4": item.get("last4"),
                "expiry": item.get("expiry"),
                "is_default": bool(item.get("isDefault")),
            }
            for item in state.get("paymentMethods", [])
        ],
        "payment_quotes": [
            {
                "id": item["id"],
                "patient_id": item["patientId"],
                "title": item["title"],
                "description": item.get("description") or "",
                "amount": item["amount"],
                "currency": item.get("currency") or "GBP",
                "dietitian_name": item.get("dietitianName"),
                "kind": item.get("kind") or "consult",
                "status": item.get("status") or "open",
            }
            for item in state.get("paymentQuotes", [])
        ],
        "payments": [
            {
                "id": item["id"],
                "patient_id": item["patientId"],
                "quote_id": item.get("quoteId"),
                "amount": item["amount"],
                "currency": item.get("currency") or "GBP",
                "method": item.get("method") or "",
                "status": item.get("status") or "paid",
                "paid_at": item.get("paidAt"),
                "receipt": item.get("receipt") or "",
                "description": item.get("description") or "",
            }
            for item in state.get("payments", [])
        ],
        "missed_calls": [
            {
                "id": item["id"],
                "user_id": item["userId"],
                "peer_id": item["peerId"],
                "peer_name": item["peerName"],
                "created_at": item.get("createdAt"),
                "seen": bool(item.get("seen")),
            }
            for item in state.get("missedCalls", [])
        ],
        "notifications": [
            {
                "id": item["id"],
                "user_id": item["userId"],
                "kind": item.get("kind") or "info",
                "title": item["title"],
                "body": item.get("body") or "",
                "href": item.get("href"),
                "created_at": item.get("createdAt"),
                "read": bool(item.get("read")),
            }
            for item in state.get("notifications", [])
        ],
        "live_calls": [
            {
                "id": item["id"],
                "conversation_id": item["conversationId"],
                "caller_id": item["callerId"],
                "callee_id": item["calleeId"],
                "caller_name": item.get("callerName") or "",
                "caller_avatar": item.get("callerAvatar") or "",
                "callee_name": item.get("calleeName") or "",
                "callee_avatar": item.get("calleeAvatar") or "",
                "status": item.get("status") or "ringing",
                "started_at": item.get("startedAt"),
                "offer": item.get("offer"),
                "answer": item.get("answer"),
                "ice": item.get("ice") or [],
            }
            for item in state.get("liveCalls", [])
        ],
    }


def save_to_supabase(client, state: Json) -> None:
    tables = tables_from_state(state)
    _upsert(client, "profiles", tables["profiles"])
    _upsert(client, "dietitians", tables["dietitians"])
    _upsert(client, "applications", tables["applications"])
    _upsert(client, "conversations", tables["conversations"])
    _upsert(client, "conversation_participants", tables["conversation_participants"])
    _upsert(client, "messages", tables["messages"])
    _upsert(client, "appointments", tables["appointments"])
    _upsert(client, "patient_files", tables["patient_files"])
    _upsert(client, "consultation_requests", tables["consultation_requests"])
    _upsert(client, "patient_profiles", tables["patient_profiles"])
    _upsert(client, "patient_settings", tables["patient_settings"])
    _upsert(client, "device_sessions", tables["device_sessions"])
    _upsert(client, "payment_methods", tables["payment_methods"])
    _upsert(client, "payment_quotes", tables["payment_quotes"])
    _upsert(client, "payments", tables["payments"])
    _upsert(client, "missed_calls", tables["missed_calls"])
    _upsert(client, "notifications", tables["notifications"])
    try:
        _upsert(client, "live_calls", tables["live_calls"])
        _prune(client, "live_calls", tables["live_calls"])
    except Exception:
        pass
    _prune(client, "notifications", tables["notifications"])
    _prune(client, "missed_calls", tables["missed_calls"])
    _prune(client, "payments", tables["payments"])
    _prune(client, "payment_quotes", tables["payment_quotes"])
    _prune(client, "payment_methods", tables["payment_methods"])
    _prune(client, "consultation_requests", tables["consultation_requests"])
    _prune(client, "patient_files", tables["patient_files"])
    _prune(client, "appointments", tables["appointments"])
    _prune(client, "messages", tables["messages"])
    _prune(client, "device_sessions", tables["device_sessions"])
    existing_parts = client.table("conversation_participants").select("conversation_id,user_id").execute().data or []
    keep_parts = {(row["conversation_id"], row["user_id"]) for row in tables["conversation_participants"]}
    for row in existing_parts:
        if (row["conversation_id"], row["user_id"]) not in keep_parts:
            client.table("conversation_participants").delete().eq("conversation_id", row["conversation_id"]).eq(
                "user_id", row["user_id"]
            ).execute()
    _prune(client, "conversations", tables["conversations"])
    _prune(client, "applications", tables["applications"])
    _prune(client, "dietitians", tables["dietitians"])
    _prune(client, "patient_profiles", tables["patient_profiles"], key="user_id")
    _prune(client, "patient_settings", tables["patient_settings"], key="user_id")
    _prune(client, "profiles", tables["profiles"])


class JsonStore:
    """Local JSON database with the same table/row shape as the Supabase schema."""

    def __init__(self, path=None) -> None:
        self._lock = Lock()
        self.path = Path(path or settings.json_database_path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write(tables_from_state(initial_state()))

    def snapshot(self) -> Json:
        with self._lock:
            return _copy(state_from_tables(self._read()))

    def replace(self, state: Json) -> Json:
        with self._lock:
            self._write(tables_from_state(state))
            return _copy(state_from_tables(self._read()))

    def reset(self) -> Json:
        return self.replace(initial_state())

    def _read(self) -> Json:
        try:
            return json.loads(self.path.read_text())
        except FileNotFoundError:
            return tables_from_state(initial_state())

    def _write(self, tables: Json) -> None:
        tmp = self.path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(tables, indent=2, ensure_ascii=False) + "\n")
        tmp.replace(self.path)


_store: MemoryStore | JsonStore | SupabaseStore | None = None


def get_store() -> MemoryStore | JsonStore | SupabaseStore:
    global _store
    if _store is None:
        if settings.use_supabase:
            try:
                candidate = SupabaseStore()
                # Probe schema — fall back to local JSON when mp_/marketplace tables are missing.
                candidate.snapshot()
                _store = candidate
            except Exception as exc:  # noqa: BLE001
                print(f"[care] Supabase store unavailable ({exc}); using local JSON database.")
                _store = JsonStore()
        elif settings.memory_store:
            _store = MemoryStore()
        else:
            _store = JsonStore()
    return _store
