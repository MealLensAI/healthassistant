from __future__ import annotations

import copy
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

from .config import settings
from .seed_data import initial_state
from .media import account_avatar

Json = dict[str, Any]

# Marketplace tables are deliberately separate from the original MealLensAI
# tables.  In particular, do not point care at public.profiles: that table is
# owned by the main application and its Auth/Paystack workflows.
MP_TABLES = {
    "profiles": "mp_profiles",
    "dietitians": "mp_dietitians",
    "applications": "mp_applications",
    "conversations": "mp_conversations",
    "conversation_participants": "mp_conversation_participants",
    "messages": "mp_messages",
    "appointments": "mp_appointments",
    "patient_files": "mp_patient_files",
    "consultation_requests": "mp_consultation_requests",
    "patient_profiles": "mp_patient_profiles",
    "patient_settings": "mp_patient_settings",
    "device_sessions": "mp_device_sessions",
    "missed_calls": "mp_missed_calls",
    "notifications": "mp_notifications",
    "live_calls": "mp_live_calls",
}


def _copy(state: Json) -> Json:
    return copy.deepcopy(state)


def _safe_years_experience(value: Any, *, default: int = 0) -> int:
    """Postgres years_experience is integer — reject floats/scientific junk from the client."""
    if value is None or value == "":
        return default
    try:
        number = int(float(value))
    except (TypeError, ValueError, OverflowError):
        return default
    if number < 0 or number > 80:
        return default
    return number


def _auth_email_is_deleted(email: str | None) -> bool:
    value = (email or "").strip().lower()
    if not value:
        return True
    return value.endswith("@deleted.local") or value.startswith("deleted_")


def _auth_identity_status(client, user_id: str, *, expected_email: str | None = None) -> str:
    """Return 'live', 'deleted', or 'unknown' (do not purge on unknown)."""
    if not user_id:
        return "deleted"
    try:
        response = client.auth.admin.get_user_by_id(str(user_id))
    except Exception as error:
        message = str(error).lower()
        # Explicit not-found from Auth admin API.
        if "not found" in message or "user not found" in message or "404" in message:
            return "deleted"
        return "unknown"
    user = getattr(response, "user", None)
    if user is None and isinstance(response, dict):
        user = response.get("user") or response
    if not user:
        return "deleted"
    if isinstance(user, dict):
        email = user.get("email")
        deleted_at = user.get("deleted_at")
    else:
        email = getattr(user, "email", None)
        deleted_at = getattr(user, "deleted_at", None)
    if deleted_at or _auth_email_is_deleted(email):
        return "deleted"
    if expected_email and (email or "").strip().lower() != expected_email.strip().lower():
        # Soft-delete renames Auth email while application still has the old address.
        return "deleted"
    return "live"


def _auth_user_is_live(client, user_id: str, *, expected_email: str | None = None) -> bool:
    return _auth_identity_status(client, user_id, expected_email=expected_email) == "live"


def _purge_marketplace_identity(client, user_ids: list[str], application_ids: list[str] | None = None) -> None:
    """Remove marketplace leftovers after Auth/account deletion."""
    ids = [str(uid) for uid in user_ids if uid]
    app_ids = [str(aid) for aid in (application_ids or []) if aid]
    if app_ids:
        client.table(MP_TABLES["applications"]).delete().in_("id", app_ids).execute()
    if not ids:
        return
    client.table(MP_TABLES["applications"]).delete().in_("user_id", ids).execute()
    client.table(MP_TABLES["dietitians"]).delete().in_("user_id", ids).execute()
    client.table(MP_TABLES["profiles"]).delete().in_("id", ids).execute()


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
        import time

        from .call_signals import set_writer

        self._lock = Lock()
        self.client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        self._cache: Json | None = None
        self._cache_at = 0.0
        self._cache_ttl = 2.0
        self._profile_cache: dict[str, tuple[float, Json]] = {}
        self._time = time
        set_writer(self._write_call_signal_row)

    def _invalidate_cache(self) -> None:
        self._cache = None
        self._cache_at = 0.0
        self._profile_cache.clear()

    def snapshot(self) -> Json:
        with self._lock:
            now = self._time.monotonic()
            if self._cache is not None and (now - self._cache_at) < self._cache_ttl:
                return _copy(self._cache)
            from .call_signals import supabase_retry

            state = supabase_retry(lambda: load_from_supabase(self.client), attempts=4)
            self._cache = state
            self._cache_at = now
            return _copy(state)

    def viewer_pulse(self, user_id: str, role: str = "patient") -> Json:
        """Tiny presence/inbox read — no catalog, no message bodies."""
        return load_pulse_from_supabase(self.client, user_id, role)

    def resolve_admin_auth_id(self, email: str) -> str:
        """Reuse an Auth identity, or create one to satisfy mp_profiles' FK."""
        page = 1
        while True:
            users = self.client.auth.admin.list_users(page=page, per_page=100)
            for user in users:
                if (user.email or "").strip().lower() == email:
                    return str(user.id)
            if len(users) < 100:
                break
            page += 1
        response = self.client.auth.admin.create_user({"email": email})
        if not response.user:
            raise RuntimeError("Could not create the admin Auth identity")
        return str(response.user.id)

    def list_marketplace_dietitians(
        self,
        *,
        admin: bool = False,
        viewer_id: str | None = None,
        include_own: bool = False,
    ) -> list[Json]:
        """Read mp_dietitians directly — never seed/demo, never stale snapshot cache."""
        query = self.client.table(MP_TABLES["dietitians"]).select("*")
        if not admin and not include_own:
            query = query.eq("status", "approved").eq("verified", True)
        rows = query.execute().data or []
        if not rows:
            return []

        # Hot catalog path: skip per-row Auth Admin N+1 (was making discover/messages slow).
        # Ghost purge still runs from the applications/admin paths.
        live_rows: list[Json] = []
        for row in rows:
            uid = str(row.get("user_id") or "")
            if not admin and not include_own:
                if row.get("status") == "approved" and row.get("verified"):
                    live_rows.append(row)
            elif include_own and not admin:
                if (row.get("status") == "approved" and row.get("verified")) or (
                    viewer_id and uid == str(viewer_id)
                ):
                    live_rows.append(row)
            else:
                live_rows.append(row)
        return [dietitian_from_row(row) for row in live_rows]

    def list_marketplace_applications(self, *, admin: bool = False, user_id: str | None = None) -> list[Json]:
        """Read mp_applications directly from Supabase.

        Purge only when Auth is confirmed deleted. Never drop live submissions on Auth blips.
        """
        query = self.client.table(MP_TABLES["applications"]).select("*")
        if not admin and user_id:
            query = query.eq("user_id", user_id)
        elif not admin:
            return []
        rows = query.execute().data or []
        if not rows:
            return []

        live_rows: list[Json] = []
        orphan_ids: list[str] = []
        orphan_user_ids: list[str] = []
        for item in rows:
            uid = str(item.get("user_id") or "")
            email = item.get("email") or ""
            auth_status = _auth_identity_status(self.client, uid, expected_email=email)
            if auth_status == "deleted":
                if item.get("id"):
                    orphan_ids.append(str(item["id"]))
                if uid:
                    orphan_user_ids.append(uid)
                continue
            # Keep when Auth is live or unknown — never drop a just-submitted app on API blips.
            live_rows.append(item)

        if orphan_ids or orphan_user_ids:
            try:
                _purge_marketplace_identity(self.client, orphan_user_ids, orphan_ids)
                self._invalidate_cache()
            except Exception:
                pass

        rows = live_rows

        if admin:
            rows = [item for item in rows if (item.get("status") or "pending") not in ("rejected", "withdrawn", "deleted")]

        from .media import sanitize_document

        return [
            {
                "id": item["id"],
                "userId": item["user_id"],
                "fullName": item["full_name"],
                "email": item["email"],
                "phone": item.get("phone") or "",
                "country": item.get("country") or "",
                "yearsExperience": _safe_years_experience(item.get("years_experience")),
                "bio": item.get("bio") or "",
                "specialties": item.get("specialties") or [],
                "workplace": item.get("workplace") or "",
                "languages": item.get("languages") or [],
                "education": item.get("education") or [],
                "experience": item.get("experience") or [],
                "documents": [sanitize_document(doc) for doc in (item.get("documents") or [])],
                "status": item.get("status") or "pending",
                "submittedAt": _iso(item.get("submitted_at")),
                "adminNotes": item.get("admin_notes") or [],
                "moreInfoRequest": item.get("more_info_request"),
            }
            for item in rows
        ]

    def delete_marketplace_application(self, application_id: str) -> None:
        """Hard-delete an application and its pending dietitian listing (admin reject/remove)."""
        rows = (
            self.client.table(MP_TABLES["applications"])
            .select("id,user_id,email")
            .eq("id", application_id)
            .execute()
            .data
            or []
        )
        if not rows:
            return
        user_id = str(rows[0].get("user_id") or "")
        email = rows[0].get("email") or ""
        self.client.table(MP_TABLES["applications"]).delete().eq("id", application_id).execute()
        if user_id:
            self.client.table(MP_TABLES["dietitians"]).delete().eq("user_id", user_id).neq(
                "status", "approved"
            ).execute()
            # If Auth is already gone, also clear the leftover marketplace profile.
            if not _auth_user_is_live(self.client, user_id, expected_email=email):
                self.client.table(MP_TABLES["profiles"]).delete().eq("id", user_id).execute()
        self._invalidate_cache()

    def get_user(self, user_id: str) -> Json | None:
        now = self._time.monotonic()
        cached = self._profile_cache.get(user_id)
        if cached and (now - cached[0]) < self._cache_ttl:
            return dict(cached[1])
        rows = self.client.table(MP_TABLES['profiles']).select('*').eq('id', user_id).execute().data or []
        if not rows:
            return None
        user = profile_from_row(rows[0])
        self._profile_cache[user_id] = (now, user)
        return dict(user)

    def sync_user(self, payload: Json) -> Json:
        """Sync only this account; unrelated care records must not block login/uploads."""
        from .service import sync_account

        user_id = str(payload.get('externalUserId') or '').strip()
        if not _UUID_RE.match(user_id):
            raise ValueError('A valid account ID is required')
        with self._lock:
            existing = self.get_user(user_id)
            _, user = sync_account({'users': [existing] if existing else [], 'patientProfiles': []}, payload)
            self.client.table(MP_TABLES['profiles']).upsert(profile_row(user), on_conflict='id').execute()
            self._invalidate_cache()
            return user

    def persist_account_update(self, state: Json, user_id: str) -> None:
        """Write only this account's profile (+ listing if present). Avoids full-state replace."""
        if not _UUID_RE.match(str(user_id)):
            raise ValueError('A valid account ID is required')
        user = next((item for item in state.get('users', []) if item.get('id') == user_id), None)
        if not user:
            raise ValueError('Unknown account')
        self.client.table(MP_TABLES['profiles']).upsert(profile_row(user), on_conflict='id').execute()
        listing = next((item for item in state.get('dietitians', []) if item.get('userId') == user_id), None)
        if listing:
            # Pending cover/avatar stubs used to use `dt-…` ids and were skipped here,
            # so catalog refresh wiped the photo. Coerce to a UUID and always upsert.
            if not _UUID_RE.match(str(listing.get('id', ''))):
                import uuid as _uuid

                listing['id'] = str(_uuid.uuid4())
            self.client.table(MP_TABLES['dietitians']).upsert(dietitian_row(listing), on_conflict='id').execute()
        self._invalidate_cache()

    def persist_hot_action(self, before: Json, after: Json, action_type: str) -> bool:
        """Persist only tables touched by high-frequency actions. Returns False to fall back."""
        keys = _HOT_ACTION_TABLES.get(action_type)
        if not keys:
            return False
        # Dietitian registration must always land in Supabase even if the snapshot
        # users list was momentarily incomplete (UUID persist filter would drop it).
        if action_type == "SUBMIT_APPLICATION":
            apps = after.get("applications") or []
            diets = after.get("dietitians") or []
            users = after.get("users") or []
            # Prefer the newest pending application (first in list after submit).
            target_app = next((item for item in apps if item.get("status") == "pending"), apps[0] if apps else None)
            if target_app and _UUID_RE.match(str(target_app.get("id", ""))) and _UUID_RE.match(
                str(target_app.get("userId", ""))
            ):
                from .media import sanitize_document

                actor = next((item for item in users if item.get("id") == target_app.get("userId")), None)
                if actor:
                    self.client.table(MP_TABLES["profiles"]).upsert(profile_row(actor), on_conflict="id").execute()
                app_row = {
                    "id": target_app["id"],
                    "user_id": target_app["userId"],
                    "full_name": target_app["fullName"],
                    "email": target_app["email"],
                    "phone": target_app.get("phone") or "",
                    "country": target_app.get("country") or "",
                    "years_experience": _safe_years_experience(target_app.get("yearsExperience")),
                    "bio": target_app.get("bio") or "",
                    "specialties": target_app.get("specialties") or [],
                    "workplace": target_app.get("workplace") or "",
                    "languages": target_app.get("languages") or [],
                    "education": target_app.get("education") or [],
                    "experience": target_app.get("experience") or [],
                    "documents": [sanitize_document(doc) for doc in (target_app.get("documents") or [])],
                    "status": target_app.get("status") or "pending",
                    "submitted_at": target_app.get("submittedAt"),
                    "admin_notes": target_app.get("adminNotes") or [],
                    "more_info_request": target_app.get("moreInfoRequest"),
                }
                self.client.table(MP_TABLES["applications"]).upsert(app_row, on_conflict="id").execute()
                listing = next(
                    (item for item in diets if item.get("userId") == target_app.get("userId")),
                    None,
                )
                if listing and _UUID_RE.match(str(listing.get("id", ""))):
                    self.client.table(MP_TABLES["dietitians"]).upsert(
                        dietitian_row(listing), on_conflict="id"
                    ).execute()
                self._invalidate_cache()
                return True
        if action_type == "APPROVE_APPLICATION":
            apps = after.get("applications") or []
            diets = after.get("dietitians") or []
            previous_apps = {item.get("id"): item for item in before.get("applications") or []}
            target_app = next((item for item in apps if item.get("status") == "approved" and previous_apps.get(item.get("id"), {}).get("status") != "approved"), None)
            if target_app and _UUID_RE.match(str(target_app.get("id", ""))):
                from .media import sanitize_document

                app_row = {
                    "id": target_app["id"],
                    "user_id": target_app["userId"],
                    "full_name": target_app["fullName"],
                    "email": target_app["email"],
                    "phone": target_app.get("phone") or "",
                    "country": target_app.get("country") or "",
                    "years_experience": _safe_years_experience(target_app.get("yearsExperience")),
                    "bio": target_app.get("bio") or "",
                    "specialties": target_app.get("specialties") or [],
                    "workplace": target_app.get("workplace") or "",
                    "languages": target_app.get("languages") or [],
                    "education": target_app.get("education") or [],
                    "experience": target_app.get("experience") or [],
                    "documents": [sanitize_document(doc) for doc in (target_app.get("documents") or [])],
                    "status": "approved",
                    "submitted_at": target_app.get("submittedAt"),
                    "admin_notes": target_app.get("adminNotes") or [],
                    "more_info_request": target_app.get("moreInfoRequest"),
                }
                self.client.table(MP_TABLES["applications"]).upsert(app_row, on_conflict="id").execute()
                listing = next(
                    (item for item in diets if item.get("userId") == target_app.get("userId")),
                    None,
                )
                if listing and _UUID_RE.match(str(listing.get("id", ""))):
                    approved = {
                        **listing,
                        "status": "approved",
                        "verified": True,
                        "featured": True,
                    }
                    self.client.table(MP_TABLES["dietitians"]).upsert(
                        dietitian_row(approved), on_conflict="id"
                    ).execute()
                self._invalidate_cache()
                return True
        before_tables = tables_from_state(_persistable_marketplace_state(before))
        after_tables = tables_from_state(_persistable_marketplace_state(after))
        client = self.client
        for key in keys:
            table = MP_TABLES[key]
            if key == "conversation_participants":
                before_set = {(row["conversation_id"], row["user_id"]) for row in before_tables.get(key, [])}
                after_set = {(row["conversation_id"], row["user_id"]) for row in after_tables.get(key, [])}
                new_rows = [
                    row
                    for row in after_tables.get(key, [])
                    if (row["conversation_id"], row["user_id"]) not in before_set
                ]
                _upsert(client, table, new_rows)
                gone = list(before_set - after_set)
                for conversation_id, user_id in gone:
                    client.table(table).delete().eq("conversation_id", conversation_id).eq("user_id", user_id).execute()
                continue
            if key == "conversations":
                before_by_id = {row["id"]: row for row in before_tables.get(key, [])}
                after_by_id = {row["id"]: row for row in after_tables.get(key, [])}
                changed = [
                    row
                    for row in after_tables.get(key, [])
                    if before_by_id.get(row["id"]) != row
                ]
                _upsert(client, table, changed)
                gone = list(set(before_by_id) - set(after_by_id))
                if gone:
                    client.table(MP_TABLES["conversation_participants"]).delete().in_("conversation_id", gone).execute()
                    client.table(MP_TABLES["messages"]).delete().in_("conversation_id", gone).execute()
                    client.table(table).delete().in_("id", gone).execute()
                continue
            if key == "messages":
                before_by_id = {row["id"]: row for row in before_tables.get(key, [])}
                after_by_id = {row["id"]: row for row in after_tables.get(key, [])}
                changed = [
                    row
                    for row in after_tables.get(key, [])
                    if before_by_id.get(row["id"]) != row
                ]
                _upsert(client, table, changed)
                gone = list(set(before_by_id) - set(after_by_id))
                if gone:
                    client.table(table).delete().in_("id", gone).execute()
                continue
            if key == "live_calls":
                from .call_signals import drop_cached

                previous = {row["id"]: row for row in before_tables.get(key, [])}
                for row in after_tables.get(key, []):
                    old = previous.get(row["id"])
                    if old is None:
                        _upsert(client, table, [row])
                    else:
                        changes = {name: value for name, value in row.items() if name != "id" and old.get(name) != value}
                        if changes:
                            client.table(table).update(changes).eq("id", row["id"]).execute()
                before_ids = {row["id"] for row in before_tables.get(key, [])}
                after_ids = {row["id"] for row in after_tables.get(key, [])}
                gone = list(before_ids - after_ids)
                if gone:
                    client.table(table).delete().in_("id", gone).execute()
                    for call_id in gone:
                        drop_cached(str(call_id))
                continue
            if key == "appointments":
                # `deleted` is soft in the SPA, but some DBs still lack that check-constraint
                # value. Remove the row so trash always works; the action patch still ships
                # a tombstone so the client drops it immediately.
                before_by_id = {row["id"]: row for row in before_tables.get(key, [])}
                for row in after_tables.get(key, []):
                    if row.get("status") == "deleted":
                        client.table(table).delete().eq("id", row["id"]).execute()
                        continue
                    old = before_by_id.get(row["id"])
                    if old is None or old != row:
                        _upsert(client, table, [row])
                continue
            row_key = "user_id" if key in {"patient_profiles", "patient_settings"} else "id"
            before_by_id = {row[row_key]: row for row in before_tables.get(key, [])}
            after_by_id = {row[row_key]: row for row in after_tables.get(key, [])}
            changed = [
                row
                for row in after_tables.get(key, [])
                if before_by_id.get(row[row_key]) != row
            ]
            _upsert(client, table, changed)
            # Drop removed rows (e.g. admin DELETE_APPLICATION, patient DELETE_FILE) so ghosts never linger.
            if key in ("applications", "dietitians", "notifications", "missed_calls", "patient_files"):
                gone = list(set(before_by_id) - set(after_by_id))
                if gone:
                    client.table(table).delete().in_("id", gone).execute()
        self._invalidate_cache()
        return True

    def conversation_messages(self, conversation_id: str, user: Json, limit: int, after: str = "") -> list[Json]:
        from .media import sanitize_message
        if user.get("role") != "admin":
            membership = self.client.table(MP_TABLES["conversation_participants"]).select("user_id").eq("conversation_id", conversation_id).eq("user_id", user["id"]).limit(1).execute().data
            if not membership:
                raise ValueError("Conversation not found")
        query = self.client.table(MP_TABLES["messages"]).select("*").eq("conversation_id", conversation_id)
        if after:
            query = query.gt("timestamp", after)
        rows = query.order("timestamp", desc=True).limit(limit).execute().data or []
        return [sanitize_message({"id": item["id"], "conversationId": item["conversation_id"], "senderId": item["sender_id"], "text": item["text"], "timestamp": _iso(item.get("timestamp")), "attachments": item.get("attachments") or []}) for item in reversed(rows)]

    def _write_call_signal_row(self, call_id: str, call: Json) -> None:
        from .call_signals import supabase_retry

        def _run() -> None:
            self.client.table(MP_TABLES["live_calls"]).update(
                {
                    "offer": call.get("offer"),
                    "answer": call.get("answer"),
                    "ice": call.get("ice") or [],
                }
            ).eq("id", call_id).execute()

        supabase_retry(_run)

    def get_live_call(self, call_id: str) -> Json | None:
        from .call_signals import get_cached, put_cached, supabase_retry

        cached = get_cached(call_id)
        if cached:
            return cached

        def _run():
            return (
                self.client.table(MP_TABLES["live_calls"]).select("*").eq("id", call_id).limit(1).execute().data
                or []
            )

        rows = supabase_retry(_run)
        if not rows:
            return None
        row = rows[0]
        call = {
            "id": row["id"],
            "conversationId": row["conversation_id"],
            "callerId": row["caller_id"],
            "calleeId": row["callee_id"],
            "status": row.get("status") or "ringing",
            "startedAt": _iso(row.get("started_at")),
            "offer": row.get("offer"),
            "answer": row.get("answer"),
            "ice": row.get("ice") or [],
        }
        return put_cached(call_id, call, dirty=False)

    def persist_call_signal(self, call_id: str, actor_id: str, payload: Json) -> Json:
        """Merge signaling in memory; debounce Supabase writes so ICE cannot flood the pool."""
        from .call_signals import put_cached
        from .service import public_call, uid

        call = self.get_live_call(call_id)
        if not call:
            raise ValueError("Call not found")
        if actor_id not in (call["callerId"], call["calleeId"]):
            raise ValueError("Not in this call")
        # Allow the caller to replace the offer until an answer exists — PC recreates
        # used to leave a stale SDP on the row so media never connected.
        offer_changed = False
        if payload.get("offer") and actor_id == call["callerId"] and not call.get("answer"):
            if call.get("offer") != payload["offer"]:
                call["offer"] = payload["offer"]
                call["ice"] = []
                offer_changed = True
        answer_changed = False
        if payload.get("answer") and actor_id == call["calleeId"] and not call.get("answer"):
            call["answer"] = payload["answer"]
            answer_changed = True
        ice = list(call.get("ice") or [])
        incoming = payload.get("ice") or []
        if isinstance(incoming, dict):
            incoming = [incoming]
        for item in incoming:
            if not isinstance(item, dict):
                continue
            candidate = item.get("candidate")
            marker = item.get("id") or uid("ice")
            if any(existing.get("id") == marker for existing in ice):
                continue
            ice.append(
                {
                    "id": marker,
                    "fromId": item.get("fromId") or actor_id,
                    "candidate": candidate or item,
                }
            )
        call["ice"] = ice[-80:]
        # Offer/answer flush immediately; ICE-only updates debounce via put_cached.
        put_cached(call_id, call, dirty=True, flush_now=offer_changed or answer_changed)
        return public_call(call)

    def forget_live_call(self, call_id: str) -> None:
        from .call_signals import drop_cached

        drop_cached(call_id)

    def delete_appointment(self, appointment_id: str, actor: Json) -> Json:
        """Hard-delete an appointment the actor may manage.

        Soft `status=deleted` fails on DBs that never applied migration 030/031
        (check constraint without `deleted`). Removing the row is reliable, and
        the returned tombstone still clears the SPA list immediately.
        """
        rows = (
            self.client.table(MP_TABLES["appointments"])
            .select("*")
            .eq("id", appointment_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        if not rows:
            raise ValueError("Appointment not found")
        row = rows[0]
        actor_id = actor.get("id")
        allowed = actor.get("role") == "admin" or actor_id == row.get("patient_id")
        if not allowed:
            listing = (
                self.client.table(MP_TABLES["dietitians"])
                .select("id,user_id")
                .eq("id", row.get("dietitian_id"))
                .limit(1)
                .execute()
                .data
                or []
            )
            allowed = bool(listing and listing[0].get("user_id") == actor_id)
        if not allowed:
            raise ValueError("Appointment not found")

        starts = str(row.get("starts_at") or "")
        date = starts[:10] if len(starts) >= 10 else ""
        time = starts[11:16] if len(starts) >= 16 else ""
        tombstone = {
            "id": row["id"],
            "patientId": row.get("patient_id"),
            "dietitianId": row.get("dietitian_id"),
            "date": date,
            "time": time,
            "status": "deleted",
            "type": row.get("type") or "video",
            "topic": row.get("topic") or "",
        }
        self.client.table(MP_TABLES["appointments"]).delete().eq("id", appointment_id).execute()
        self._invalidate_cache()
        return {"patch": {"appointments": [tombstone]}, "currentUser": actor}

    def replace(self, state: Json) -> Json:
        with self._lock:
            # The response may include the temporary legacy catalog below.
            # Never write its old non-UUID demo identities into Supabase.
            save_to_supabase(self.client, _persistable_marketplace_state(state))
            self._invalidate_cache()
            return _copy(load_from_supabase(self.client))

    def reset(self) -> Json:
        return self.replace(initial_state())


def dietitian_row(item: Json) -> Json:
    from .media import sanitize_document, storage_key_for_asset

    return {
        "id": item["id"],
        "user_id": item["userId"],
        "name": item["name"],
        "title": item.get("title") or "Dietitian",
        "country": item.get("country") or "",
        "specialties": item.get("specialties") or [],
        "conditions": item.get("conditions") or [],
        "years_experience": _safe_years_experience(item.get("yearsExperience")),
        "rating": item.get("rating") or 0,
        "review_count": item.get("reviewCount") or 0,
        "bio": item.get("bio") or "",
        "languages": item.get("languages") or [],
        "workplace": item.get("workplace") or "",
        "avatar_key": storage_key_for_asset(item.get("avatar")) or None,
        "cover_image_key": storage_key_for_asset(item.get("coverImage")) or None,
        "verified": bool(item.get("verified")),
        "featured": bool(item.get("featured")),
        "education": item.get("education") or [],
        "experience": item.get("experience") or [],
        "documents": [sanitize_document(doc) for doc in (item.get("documents") or [])],
        "reviews": item.get("reviews") or [],
        "availability": item.get("availability") or [],
        "status": item.get("status") or "pending",
    }


def dietitian_from_row(row: Json) -> Json:
    from .media import sanitize_document, storage_key_for_asset

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
        "avatar": storage_key_for_asset(row.get("avatar_key") or ""),
        "coverImage": storage_key_for_asset(row.get("cover_image_key") or ""),
        "verified": bool(row.get("verified")),
        "featured": bool(row.get("featured")),
        "education": row.get("education") or [],
        "experience": row.get("experience") or [],
        "documents": [sanitize_document(doc) for doc in (row.get("documents") or [])],
        "reviews": row.get("reviews") or [],
        "availability": row.get("availability") or [],
        "status": row.get("status") or "pending",
    }


def profile_row(item: Json) -> Json:
    from .media import storage_key_for_asset

    return {
        "id": item["id"],
        "name": item["name"],
        "email": item["email"],
        "role": item["role"],
        "avatar_key": storage_key_for_asset(item.get("avatar")) or None,
        "country": item.get("country"),
        "title": item.get("title"),
        "phone": item.get("phone"),
    }


def profile_from_row(row: Json) -> Json:
    from .media import sanitize_asset_ref

    user = {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "avatar": sanitize_asset_ref(row.get("avatar_key") or ""),
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


def _appointment_parts(value: Any) -> tuple[str, str]:
    """Turn the database timestamp into the UI's date/time fields."""
    if not value:
        return "", ""
    raw = _iso(value).replace("Z", "+00:00")
    try:
        instant = datetime.fromisoformat(raw)
        return instant.date().isoformat(), instant.strftime("%H:%M")
    except ValueError:
        return raw[:10], raw[11:16]


def _appointment_timestamp(date: str, time: str) -> str:
    value = f"{date}T{time or '00:00'}:00"
    try:
        return datetime.fromisoformat(value).replace(tzinfo=timezone.utc).isoformat()
    except ValueError:
        return datetime.now(timezone.utc).isoformat()


def state_from_tables(tables: Json) -> Json:
    from .media import sanitize_attachment, sanitize_document

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
    users_by_id = {str(item["id"]): item for item in profiles}

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
                "documents": [sanitize_document(doc) for doc in (item.get("documents") or [])],
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
                "hiddenFor": item.get("hidden_for") or [],
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
                "attachments": [sanitize_attachment(att) for att in (item.get("attachments") or [])],
                "status": item.get("delivery_status") or item.get("status") or "sent",
                "deliveredAt": _iso(item.get("delivered_at")) or None,
                "readAt": _iso(item.get("read_at")) or None,
            }
            for item in messages
        ],
        "appointments": [
            {
                "id": item["id"],
                "patientId": item["patient_id"],
                "dietitianId": item["dietitian_id"],
                "date": _appointment_parts(item.get("starts_at"))[0],
                "time": _appointment_parts(item.get("starts_at"))[1],
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
                "name": item.get("original_name") or item.get("name") or "file",
                "category": item.get("category") or "other",
                "size": str(item.get("size_bytes") or item.get("size") or ""),
                "uploadedAt": _iso(item.get("uploaded_at")),
                "url": None,
                "objectKey": item.get("object_key") or item.get("objectKey"),
                "bucket": item.get("bucket"),
                "mimeType": item.get("mime_type") or item.get("mimeType"),
                "sizeBytes": item.get("size_bytes") or item.get("sizeBytes"),
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
                "callerName": (users_by_id.get(str(item["caller_id"])) or {}).get("name") or "",
                "callerAvatar": account_avatar(users_by_id.get(str(item["caller_id"])), dietitians, applications),
                "calleeName": (users_by_id.get(str(item["callee_id"])) or {}).get("name") or "",
                "calleeAvatar": account_avatar(users_by_id.get(str(item["callee_id"])), dietitians, applications),
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
    # Sequential reads on the shared client — spawning one create_client() per
    # table (old path) flooded HTTP/2 and caused SSLV3_ALERT_BAD_RECORD_MAC /
    # 503s on SEND_MESSAGE and booking.
    from .call_signals import supabase_retry

    source_tables = {key: table for key, table in MP_TABLES.items() if key != "live_calls"}
    tables: dict[str, list[Json]] = {}
    for key, table in source_tables.items():
        tables[key] = supabase_retry(
            lambda table=table: client.table(table).select("*").execute().data or [],
            attempts=3,
        )
    # Billing remains exclusively in the existing subscription/Paystack tables.
    tables.update({"payment_methods": [], "payment_quotes": [], "payments": []})
    try:
        tables["live_calls"] = supabase_retry(
            lambda: client.table(MP_TABLES["live_calls"]).select("*").execute().data or [],
            attempts=2,
        )
    except Exception:
        tables["live_calls"] = []
    return state_from_tables(tables)


def load_pulse_from_supabase(client, user_id: str, role: str = "patient") -> Json:
    """Scoped inbox/presence query — a few filtered selects, not the marketplace."""
    parts = (
        client.table(MP_TABLES["conversation_participants"])
        .select("conversation_id,user_id")
        .eq("user_id", user_id)
        .execute()
        .data
        or []
    )
    conv_ids = [row["conversation_id"] for row in parts]
    conversations: list[Json] = []
    if conv_ids:
        conv_rows = client.table(MP_TABLES["conversations"]).select("*").in_("id", conv_ids).execute().data or []
        all_parts = (
            client.table(MP_TABLES["conversation_participants"])
            .select("conversation_id,user_id")
            .in_("conversation_id", conv_ids)
            .execute()
            .data
            or []
        )
        by_conv: dict[str, list[str]] = {}
        for item in all_parts:
            by_conv.setdefault(item["conversation_id"], []).append(item["user_id"])
        conversations = [
            {
                "id": item["id"],
                "participantIds": by_conv.get(item["id"], []),
                "lastMessage": item.get("last_message") or "",
                "lastAt": _iso(item.get("last_at")),
                "lastReadAt": item.get("last_read_at") or {},
                "hiddenFor": item.get("hidden_for") or [],
            }
            for item in conv_rows
        ]
    notifications = [
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
        for item in (
            client.table(MP_TABLES["notifications"]).select("*").eq("user_id", user_id).order("created_at", desc=True).limit(40).execute().data
            or []
        )
    ]
    missed = [
        {
            "id": item["id"],
            "userId": item["user_id"],
            "peerId": item["peer_id"],
            "peerName": item["peer_name"],
            "createdAt": _iso(item.get("created_at")),
            "seen": bool(item.get("seen")),
        }
        for item in (
            client.table(MP_TABLES["missed_calls"]).select("*").eq("user_id", user_id).order("created_at", desc=True).limit(40).execute().data
            or []
        )
    ]
    live_rows = (
        client.table(MP_TABLES["live_calls"])
        .select("*")
        .or_(f"caller_id.eq.{user_id},callee_id.eq.{user_id}")
        .execute()
        .data
        or []
    )
    profile_ids = set()
    for item in live_rows:
        profile_ids.add(item.get("caller_id"))
        profile_ids.add(item.get("callee_id"))
    profiles_by_id: dict[str, Json] = {}
    if profile_ids:
        for row in (
            client.table(MP_TABLES["profiles"]).select("id,name,role,avatar_key").in_("id", list(profile_ids)).execute().data
            or []
        ):
            profiles_by_id[str(row["id"])] = row
    # Some dietitians uploaded their photo at registration, where it lives on
    # mp_dietitians instead of mp_profiles. Load only participants missing it.
    photo_user_ids = [
        uid for uid, profile in profiles_by_id.items()
        if profile.get("role") == "dietitian" and not profile.get("avatar_key")
    ]
    call_dietitians = (
        client.table(MP_TABLES["dietitians"]).select("user_id,avatar_key")
        .in_("user_id", photo_user_ids).execute().data or []
    ) if photo_user_ids else []
    missing_photo_ids = [
        uid for uid in photo_user_ids if not account_avatar(profiles_by_id[uid], call_dietitians)
    ]
    call_applications = (
        client.table(MP_TABLES["applications"]).select("user_id,documents")
        .in_("user_id", missing_photo_ids).execute().data or []
    ) if missing_photo_ids else []
    live_calls = [
        {
            "id": item["id"],
            "conversationId": item["conversation_id"],
            "callerId": item["caller_id"],
            "calleeId": item["callee_id"],
            "callerName": (profiles_by_id.get(str(item.get("caller_id") or ""), {}) or {}).get("name") or "",
            "callerAvatar": account_avatar(profiles_by_id.get(str(item.get("caller_id") or "")), call_dietitians, call_applications),
            "calleeName": (profiles_by_id.get(str(item.get("callee_id") or ""), {}) or {}).get("name") or "",
            "calleeAvatar": account_avatar(profiles_by_id.get(str(item.get("callee_id") or "")), call_dietitians, call_applications),
            "status": item.get("status") or "ringing",
            "startedAt": _iso(item.get("started_at")),
            "offer": item.get("offer"),
            "answer": item.get("answer"),
            "ice": item.get("ice") or [],
        }
        for item in live_rows
    ]
    # Appointments for this viewer so complete/delete/book sync without a full refresh.
    listing_ids = [
        row["id"]
        for row in (
            client.table(MP_TABLES["dietitians"]).select("id").eq("user_id", user_id).execute().data or []
        )
    ]
    apt_query = client.table(MP_TABLES["appointments"]).select("*").neq("status", "deleted")
    if role == "admin":
        apt_rows = apt_query.order("starts_at", desc=True).execute().data or []
    elif listing_ids:
        apt_rows = (
            apt_query.or_(f"patient_id.eq.{user_id},dietitian_id.in.({','.join(listing_ids)})")
            .order("starts_at", desc=True)
            .limit(80)
            .execute()
            .data
            or []
        )
    else:
        apt_rows = (
            client.table(MP_TABLES["appointments"])
            .select("*")
            .eq("patient_id", user_id)
            .neq("status", "deleted")
            .order("starts_at", desc=True)
            .limit(80)
            .execute()
            .data
            or []
        )
    appointments = [
        {
            "id": item["id"],
            "patientId": item["patient_id"],
            "dietitianId": item["dietitian_id"],
            "date": _appointment_parts(item.get("starts_at"))[0],
            "time": _appointment_parts(item.get("starts_at"))[1],
            "status": item["status"],
            "type": item["type"],
            "topic": item.get("topic") or "",
        }
        for item in apt_rows
    ]
    peer_ids = {pid for conversation in conversations for pid in conversation["participantIds"]}
    peer_ids.update(item["patientId"] for item in appointments)
    peer_ids.update(pid for item in live_calls for pid in (item["callerId"], item["calleeId"]))
    users = [profile_from_row(row) for row in (client.table(MP_TABLES["profiles"]).select("*").in_("id", list(peer_ids)).execute().data or [])] if peer_ids else []
    # Filter hidden conversations for this viewer.
    conversations = [
        item for item in conversations if user_id not in (item.get("hiddenFor") or [])
    ]
    return {
        "users": users,
        "conversations": conversations,
        "notifications": notifications,
        "missedCalls": missed,
        "liveCalls": live_calls,
        "appointments": appointments,
    }


def _merge_by_id(current: list[Json], fallback: list[Json]) -> list[Json]:
    """Keep Supabase records first and add only catalog entries it does not contain."""
    existing = {str(item.get("id")) for item in current}
    return [*current, *(item for item in fallback if str(item.get("id")) not in existing)]


# Legacy JSON catalog merge removed — it re-injected multi-MB base64 documents
# into every snapshot. Seed/demo listings belong in mp_dietitians or memory seed.


_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)

# Tables touched by latency-sensitive actions. Full snapshot rewrite is too slow.
_HOT_ACTION_TABLES: dict[str, tuple[str, ...]] = {
    "SEND_MESSAGE": ("messages", "conversations", "conversation_participants"),
    "ENSURE_CONVERSATION": ("conversations", "conversation_participants"),
    "START_CALL": ("conversations", "conversation_participants", "live_calls", "notifications"),
    "ANSWER_CALL": ("live_calls", "notifications"),
    "END_CALL": ("live_calls", "notifications", "missed_calls", "messages", "conversations"),
    "MARK_CONVERSATION_READ": ("conversations", "messages"),
    "MARK_MESSAGE_DELIVERED": ("messages",),
    "MARK_NOTIFICATION_READ": ("notifications",),
    "MARK_NOTIFICATIONS_READ": ("notifications",),
    "ADD_APPOINTMENT": ("appointments", "notifications"),
    "CANCEL_APPOINTMENT": ("appointments", "notifications"),
    "DELETE_APPOINTMENT": ("appointments", "notifications"),
    "DELETE_CONVERSATION": ("conversations", "messages"),
    "COMPLETE_APPOINTMENT": ("appointments",),
    "SUBMIT_APPLICATION": ("applications", "dietitians"),
    "APPROVE_APPLICATION": ("applications", "dietitians", "notifications"),
    "REQUEST_MORE_INFO": ("applications", "notifications"),
    "DELETE_APPLICATION": ("applications", "dietitians"),
    "UPDATE_AVAILABILITY": ("dietitians",),
    "UPDATE_DIETITIAN_PROFILE": ("dietitians",),
    "UPDATE_PATIENT_PROFILE": ("patient_profiles",),
    "UPDATE_PATIENT_SETTINGS": ("patient_settings",),
    "UPLOAD_FILE": ("patient_files",),
    "DELETE_FILE": ("patient_files",),
    "REQUEST_CONSULTATION": ("consultation_requests", "notifications"),
    "RESPOND_CONSULTATION": ("consultation_requests", "appointments", "notifications", "conversations", "conversation_participants"),
    "MARK_MISSED_CALLS_SEEN": ("missed_calls",),
    "ADD_REVIEW": ("dietitians",),
    "DELETE_REVIEW": ("dietitians",),
    "SET_FILE_SHARE": ("patient_files",),
    "SET_FILE_ACCESS_BLOCK": ("patient_settings",),
    "END_SESSION": ("device_sessions",),
}


def _persistable_marketplace_state(state: Json) -> Json:
    """Remove the read-only old catalog before saving the live marketplace."""
    result = _copy(state)
    valid_users = {item["id"] for item in result.get("users", []) if _UUID_RE.match(str(item.get("id", "")))}
    result["users"] = [item for item in result.get("users", []) if item.get("id") in valid_users]
    result["dietitians"] = [
        item for item in result.get("dietitians", [])
        if item.get("userId") in valid_users and _UUID_RE.match(str(item.get("id", "")))
    ]
    result["applications"] = [
        item for item in result.get("applications", [])
        if item.get("userId") in valid_users and _UUID_RE.match(str(item.get("id", "")))
    ]
    result["patientProfiles"] = [item for item in result.get("patientProfiles", []) if item.get("userId") in valid_users]
    result["patientSettings"] = [item for item in result.get("patientSettings", []) if item.get("userId") in valid_users]
    result["deviceSessions"] = [item for item in result.get("deviceSessions", []) if item.get("userId") in valid_users]
    result["files"] = [item for item in result.get("files", []) if item.get("ownerId") in valid_users]
    result["conversations"] = [
        item for item in result.get("conversations", [])
        if _UUID_RE.match(str(item.get("id", ""))) and set(item.get("participantIds", [])).issubset(valid_users)
    ]
    valid_conversations = {item["id"] for item in result["conversations"]}
    result["messages"] = [item for item in result.get("messages", []) if item.get("conversationId") in valid_conversations]
    result["liveCalls"] = [item for item in result.get("liveCalls", []) if item.get("callerId") in valid_users and item.get("calleeId") in valid_users]
    result["missedCalls"] = [item for item in result.get("missedCalls", []) if item.get("userId") in valid_users]
    result["notifications"] = [item for item in result.get("notifications", []) if item.get("userId") in valid_users]
    return result


def _ids(rows: list[Json], key: str = "id") -> set[str]:
    return {row[key] for row in rows}


def _upsert(client, table: str, rows: list[Json]) -> None:
    if not rows:
        return
    try:
        client.table(table).upsert(rows).execute()
    except Exception as error:
        # Tolerate missing optional delivery columns until migration 032 is applied.
        message = str(getattr(error, "message", error) or error)
        if table == MP_TABLES["messages"] and ("delivery_status" in message or "delivered_at" in message or "read_at" in message):
            stripped = [
                {
                    key: value
                    for key, value in row.items()
                    if key not in {"delivery_status", "delivered_at", "read_at"}
                }
                for row in rows
            ]
            client.table(table).upsert(stripped).execute()
            return
        raise


def _prune(client, table: str, rows: list[Json], key: str = "id") -> None:
    existing = client.table(table).select(key).execute().data or []
    keep = _ids(rows, key)
    gone = [item[key] for item in existing if item[key] not in keep]
    if gone:
        client.table(table).delete().in_(key, gone).execute()


def tables_from_state(state: Json) -> Json:
    from .media import sanitize_document

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
                "years_experience": _safe_years_experience(item.get("yearsExperience")),
                "bio": item.get("bio") or "",
                "specialties": item.get("specialties") or [],
                "workplace": item.get("workplace") or "",
                "languages": item.get("languages") or [],
                "education": item.get("education") or [],
                "experience": item.get("experience") or [],
                "documents": [sanitize_document(doc) for doc in (item.get("documents") or [])],
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
                # Do not write hidden_for unless the migration has been applied —
                # PostgREST rejects unknown columns and breaks mark-read / messaging.
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
                "delivery_status": item.get("status") if item.get("status") in ("sent", "delivered", "read") else "sent",
                "delivered_at": item.get("deliveredAt") or None,
                "read_at": item.get("readAt") or None,
            }
            for item in state.get("messages", [])
        ],
        "appointments": [
            {
                "id": item["id"],
                "patient_id": item["patientId"],
                "dietitian_id": item["dietitianId"],
                "starts_at": _appointment_timestamp(item["date"], item["time"]),
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
                # R2 object keys are assigned by the upload service.  Existing
                # metadata-only entries retain a stable placeholder key until
                # their content is migrated from the local JSON store.
                "bucket": item.get("bucket") or "meallens-care-private",
                "object_key": item.get("objectKey") or f"legacy/{item['id']}",
                "original_name": item["name"],
                "mime_type": item.get("mimeType") or "application/octet-stream",
                "size_bytes": int(item.get("sizeBytes") or 0),
                "category": item["category"],
                "uploaded_at": item.get("uploadedAt"),
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
    for key, table in MP_TABLES.items():
        if key != "live_calls":
            _upsert(client, table, tables[key])
    try:
        _upsert(client, MP_TABLES["live_calls"], tables["live_calls"])
        _prune(client, MP_TABLES["live_calls"], tables["live_calls"])
    except Exception:
        pass
    for key in ("notifications", "missed_calls", "consultation_requests", "patient_files", "appointments", "messages", "device_sessions"):
        _prune(client, MP_TABLES[key], tables[key])
    existing_parts = client.table(MP_TABLES["conversation_participants"]).select("conversation_id,user_id").execute().data or []
    keep_parts = {(row["conversation_id"], row["user_id"]) for row in tables["conversation_participants"]}
    for row in existing_parts:
        if (row["conversation_id"], row["user_id"]) not in keep_parts:
            client.table(MP_TABLES["conversation_participants"]).delete().eq("conversation_id", row["conversation_id"]).eq(
                "user_id", row["user_id"]
            ).execute()
    _prune(client, MP_TABLES["conversations"], tables["conversations"])
    _prune(client, MP_TABLES["applications"], tables["applications"])
    _prune(client, MP_TABLES["dietitians"], tables["dietitians"])
    _prune(client, MP_TABLES["patient_profiles"], tables["patient_profiles"], key="user_id")
    _prune(client, MP_TABLES["patient_settings"], tables["patient_settings"], key="user_id")
    _prune(client, MP_TABLES["profiles"], tables["profiles"])


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
