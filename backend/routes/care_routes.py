"""Dietitian marketplace / patient care API — same Flask process as MealLensAI."""

from __future__ import annotations

from typing import Any
import copy
from threading import RLock

from flask import Blueprint, Response, jsonify, request, g, current_app, stream_with_context

from care.db import get_store
from care.seed_data import DEMO_ACCOUNTS, USERS
from care.service import (
    apply_action,
    apply_call_signal,
    expire_ringing_calls,
    conversation_id_for,
    dietitian_marketplace_open,
    login_admin,
    now_iso,
    public_call,
    register_account,
    register_doctor,
    sync_account,
    uid,
)
from care.config import settings
from care.media import is_object_key, sanitize_message, sanitize_user
from care.realtime import format_sse, publish, subscribe, unsubscribe, wait_event
from care.scoped import action_patch, pulse_scope, viewer_scope
from care.storage import get_r2_storage

care_bp = Blueprint("care", __name__)
_state_lock = RLock()


def _snapshot():
    """Reuse one store snapshot per read request."""
    cached = getattr(g, "care_snapshot", None)
    if cached is None:
        cached = get_store().snapshot()
        g.care_snapshot = cached
    return cached


def _json():
    return request.get_json(silent=True) or {}


def _current_user():
    """Resolve marketplace user from care session header + Auth Bearer.

    X-User-Id is authoritative when present (admin console and care session).
    Auth Bearer fills in when the care session header is absent — same identity
    as Food for You — but must never override an explicit care session.
    """
    header_id = request.headers.get("X-User-Id") or request.headers.get("X-User-ID")
    token_uid = None
    if not header_id:
        try:
            from utils.auth_utils import get_user_id_from_token

            uid, _err = get_user_id_from_token()
            if uid:
                token_uid = str(uid)
        except Exception:
            token_uid = None

    user_id = str(header_id) if header_id else token_uid
    if not user_id:
        return None
    cached = getattr(g, "care_user", None)
    if cached and cached.get("id") == user_id:
        return cached
    store = get_store()
    user = None
    if hasattr(store, "get_user"):
        try:
            user = store.get_user(user_id)
        except Exception:
            user = None
    if user is None:
        try:
            state = _snapshot()
            user = next((item for item in state.get("users") or [] if item.get("id") == user_id), None)
        except Exception:
            user = None
    if user:
        g.care_user = user
    return user


def _require_user():
    user = _current_user()
    if not user:
        return None, (jsonify({"detail": "Sign in first"}), 401)
    return user, None


def _signed_asset_url(bucket: str | None, key: str | None) -> str | None:
    """Resolve an R2 object key only for the response being served."""
    if not key:
        return None
    if key.startswith(("data:", "blob:")):
        return None
    if key.startswith(("http://", "https://")):
        # Re-sign when a presigned URL was accidentally persisted as the key.
        from care.media import storage_key_for_asset

        recovered = storage_key_for_asset(key)
        if recovered and recovered != key and is_object_key(recovered):
            key = recovered
        else:
            return key
    if not is_object_key(key):
        return None
    try:
        return get_r2_storage().signed_download_url(
            bucket=bucket or settings.r2_private_bucket,
            key=key,
            expires_in=3600,
        )
    except Exception:
        return None


def _sign_avatars(state: dict[str, Any]) -> dict[str, Any]:
    """Sign avatar/cover keys only. Documents and attachments stay as objectKey refs."""
    result = copy.deepcopy(state)
    for user in result.get("users", []):
        user["avatar"] = _signed_asset_url(settings.r2_avatars_bucket, user.get("avatar")) or ""
    for dietitian in result.get("dietitians", []):
        dietitian["avatar"] = _signed_asset_url(settings.r2_avatars_bucket, dietitian.get("avatar")) or ""
        dietitian["coverImage"] = _signed_asset_url(settings.r2_avatars_bucket, dietitian.get("coverImage")) or ""
    for call in result.get("liveCalls", []):
        call["callerAvatar"] = _signed_asset_url(settings.r2_avatars_bucket, call.get("callerAvatar")) or ""
        call["calleeAvatar"] = _signed_asset_url(settings.r2_avatars_bucket, call.get("calleeAvatar")) or ""
    return result


def _viewer_payload(state: dict[str, Any], viewer: dict[str, Any]) -> dict[str, Any]:
    scoped = viewer_scope(state, viewer)
    signed = _sign_avatars(scoped)
    current = sanitize_user(dict(viewer))
    current["avatar"] = _signed_asset_url(settings.r2_avatars_bucket, current.get("avatar")) or ""
    return {**signed, "currentUser": current}


def _patch_response(before: dict[str, Any], after: dict[str, Any], viewer: dict[str, Any]):
    patch = action_patch(before, after, viewer)
    signed_patch = _sign_avatars(patch)
    current = sanitize_user(dict(viewer))
    refreshed = next((item for item in (after.get("users") or []) if item.get("id") == viewer.get("id")), viewer)
    current = sanitize_user(dict(refreshed))
    current["avatar"] = _signed_asset_url(settings.r2_avatars_bucket, current.get("avatar")) or ""
    return jsonify({"patch": signed_patch, "currentUser": current})


def _run_action(action_type: str, payload: dict[str, Any], user: dict[str, Any]):
    store = get_store()
    body = dict(payload or {})
    if action_type == "UPDATE_ACCOUNT":
        body["userId"] = user["id"]
    action = {"type": action_type, **body}
    try:
        with _state_lock:
            # Admin review + registration must see the latest Supabase rows, not a
            # 2s in-memory snapshot that predates a just-submitted application.
            if action_type in {
                "APPROVE_APPLICATION",
                "REQUEST_MORE_INFO",
                "DELETE_APPLICATION",
                "SUBMIT_APPLICATION",
                "UPDATE_AVAILABILITY",
                "CANCEL_APPOINTMENT",
                "DELETE_APPOINTMENT",
            } and hasattr(store, "_invalidate_cache"):
                store._invalidate_cache()
            # Appointment trash: hard-delete so a stale status check constraint cannot 503.
            if action_type in {"CANCEL_APPOINTMENT", "DELETE_APPOINTMENT"} and hasattr(store, "delete_appointment"):
                appointment_id = body.get("appointmentId") or ""
                deleted = store.delete_appointment(str(appointment_id), user)
                return jsonify(deleted)
            before = store.snapshot()
            # Catalog APIs read Supabase directly; hydrate missing rows so approve
            # cannot fail with "Application not found" while the queue still shows it.
            if action_type in {"APPROVE_APPLICATION", "REQUEST_MORE_INFO", "DELETE_APPLICATION"}:
                before = _hydrate_marketplace_catalog(store, before)
            next_state = apply_action(before, action, user)
            if action_type == "UPDATE_ACCOUNT" and hasattr(store, "persist_account_update"):
                store.persist_account_update(next_state, user["id"])
                saved = next_state
            elif hasattr(store, "persist_hot_action") and store.persist_hot_action(before, next_state, action_type):
                saved = next_state
            else:
                saved = store.replace(next_state)
    except ValueError as error:
        return jsonify({"detail": str(error)}), 400
    except Exception as error:
        current_app.logger.exception(
            "Care action %s failed (%s, code=%s)",
            action_type,
            type(error).__name__,
            getattr(error, "code", "unknown"),
        )
        return jsonify({"detail": "Could not save this change. Please try again."}), 503
    _publish_realtime(action_type, before, saved, user)
    response = _patch_response(before, saved, user)
    if action_type == "ENSURE_CONVERSATION":
        data = response.get_json()
        scoped = _viewer_payload(saved, user)
        data["patch"].update({"conversations": scoped["conversations"], "users": scoped["users"]})
        return jsonify(data)
    return response


def _publish_realtime(action_type: str, before: dict[str, Any], after: dict[str, Any], actor: dict[str, Any]) -> None:
    """Fan out chat and call lifecycle events to connected SSE subscribers."""
    try:
        if action_type == "END_CALL":
            remaining = {item.get("id") for item in after.get("liveCalls") or []}
            for call in before.get("liveCalls") or []:
                if call.get("id") not in remaining:
                    publish(
                        [call.get("callerId"), call.get("calleeId")],
                        "call_ended",
                        {"callId": call["id"]},
                    )
            return
        if action_type == "SEND_MESSAGE":
            before_ids = {item.get("id") for item in before.get("messages") or []}
            for message in after.get("messages") or []:
                if message.get("id") in before_ids:
                    continue
                conversation = next(
                    (item for item in after.get("conversations") or [] if item.get("id") == message.get("conversationId")),
                    None,
                )
                peers = [pid for pid in (conversation.get("participantIds") or []) if pid != actor.get("id")]
                if not peers:
                    continue
                publish(peers, "message", {"message": sanitize_message(message), "conversation": conversation})
            return
        if action_type == "MARK_MESSAGE_DELIVERED":
            changed = []
            before_by_id = {item.get("id"): item for item in before.get("messages") or []}
            for message in after.get("messages") or []:
                prev = before_by_id.get(message.get("id")) or {}
                if message.get("status") == "delivered" and prev.get("status") != "delivered":
                    changed.append(sanitize_message(message))
            for message in changed:
                publish([message.get("senderId")], "message_status", {"message": message})
            return
        if action_type == "MARK_CONVERSATION_READ":
            conversation_id = None
            for conversation in after.get("conversations") or []:
                prev = next((item for item in before.get("conversations") or [] if item.get("id") == conversation.get("id")), None)
                if not prev:
                    continue
                if (conversation.get("lastReadAt") or {}) != (prev.get("lastReadAt") or {}):
                    conversation_id = conversation.get("id")
                    peers = [pid for pid in (conversation.get("participantIds") or []) if pid != actor.get("id")]
                    publish(peers, "conversation_read", {
                        "conversationId": conversation_id,
                        "readerId": actor.get("id"),
                        "readAt": (conversation.get("lastReadAt") or {}).get(actor.get("id")),
                    })
                    break
            if conversation_id:
                before_by_id = {item.get("id"): item for item in before.get("messages") or []}
                for message in after.get("messages") or []:
                    if message.get("conversationId") != conversation_id:
                        continue
                    prev = before_by_id.get(message.get("id")) or {}
                    if message.get("status") == "read" and prev.get("status") != "read":
                        publish([message.get("senderId")], "message_status", {"message": sanitize_message(message)})
    except Exception:
        current_app.logger.exception("Realtime publish failed for %s", action_type)


def _hydrate_marketplace_catalog(store, state: dict[str, Any]) -> dict[str, Any]:
    """Merge live mp_applications / mp_dietitians into a snapshot for admin actions."""
    result = copy.deepcopy(state)
    try:
        if hasattr(store, "list_marketplace_applications"):
            live_apps = store.list_marketplace_applications(admin=True)
        else:
            live_apps = []
        if hasattr(store, "list_marketplace_dietitians"):
            live_diets = store.list_marketplace_dietitians(admin=True)
        else:
            live_diets = []
    except Exception:
        return result

    by_app = {item["id"]: item for item in (result.get("applications") or []) if item.get("id")}
    for item in live_apps:
        by_app[item["id"]] = item
    result["applications"] = list(by_app.values())

    by_diet = {item["id"]: item for item in (result.get("dietitians") or []) if item.get("id")}
    for item in live_diets:
        by_diet[item["id"]] = item
    result["dietitians"] = list(by_diet.values())
    return result

@care_bp.get("/health")
def health():
    if settings.use_supabase:
        store_name = "supabase"
    elif settings.memory_store:
        store_name = "memory"
    else:
        store_name = "json"
    return jsonify(
        {
            "ok": True,
            "store": store_name,
            "database": str(settings.json_database_path) if store_name == "json" else None,
            "project": settings.supabase_url or None,
        }
    )


@care_bp.get("/demo-accounts")
def demo_accounts():
    state = get_store().snapshot()
    users = {item["id"]: item for item in state["users"]}
    dietitians = {item["userId"]: item for item in state.get("dietitians", [])}
    accounts = [dict(item) for item in DEMO_ACCOUNTS]
    known = {item["id"] for item in USERS}
    for user in state["users"]:
        if user["id"] in known:
            continue
        if user["role"] == "dietitian":
            listing = dietitians.get(user["id"])
            status = (listing or {}).get("status") or "pending"
            accounts.append(
                {
                    "userId": user["id"],
                    "label": "Dietitian" if status == "approved" else "Applicant",
                    "detail": f"{user['name']} — {status.replace('_', ' ')} verification",
                }
            )
        elif user["role"] == "patient":
            accounts.append(
                {
                    "userId": user["id"],
                    "label": "Patient",
                    "detail": f"{user['name']} — new patient workspace",
                }
            )
    return jsonify(
        [{**account, "user": users.get(account["userId"])} for account in accounts if account["userId"] in users]
    )


@care_bp.post("/auth/register")
def register_account_endpoint():
    body = _json()
    store = get_store()
    try:
        next_state, user = register_account(store.snapshot(), body)
    except ValueError as error:
        return jsonify({"detail": str(error)}), 400
    store.replace(next_state)
    return jsonify({"user": user, "token": user["id"]})


@care_bp.post("/auth/register-doctor")
def register_doctor_account():
    body = _json()
    store = get_store()
    try:
        next_state, user = register_doctor(store.snapshot(), body)
    except ValueError as error:
        return jsonify({"detail": str(error)}), 400
    store.replace(next_state)
    return jsonify({"user": user, "token": user["id"]})


@care_bp.post("/auth/sync")
def sync_account_endpoint():
    body = _json()
    # Accept camelCase from frontend or snake_case
    payload = {
        "avatar": body.get("avatar") or "",
        "externalUserId": body.get("externalUserId") or body.get("external_user_id") or "",
        "email": body.get("email") or "",
        "name": body.get("name") or "",
        "phone": body.get("phone") or "",
        "country": body.get("country") or "",
        "role": body.get("role") or "patient",
    }
    try:
        store = get_store()
        if hasattr(store, 'sync_user'):
            user = store.sync_user(payload)
        else:
            next_state, user = sync_account(store.snapshot(), payload)
            store.replace(next_state)
    except ValueError as error:
        return jsonify({"detail": str(error)}), 400
    except Exception as error:
        current_app.logger.error('Care account sync failed (%s, code=%s)', type(error).__name__, getattr(error, 'code', 'unknown'))
        return jsonify({"detail": "Your profile could not be synced. Please retry shortly."}), 503
    return jsonify({"user": user, "token": user["id"]})


@care_bp.get("/dietitian/marketplace-status")
def dietitian_marketplace_status():
    user, err = _require_user()
    if err:
        return err
    state = get_store().snapshot()
    if user.get("role") != "dietitian":
        return jsonify({"role": user.get("role"), "marketplaceOpen": True, "status": "approved"})
    listing = next((item for item in state.get("dietitians", []) if item.get("userId") == user["id"]), None)
    status = (listing or {}).get("status") or "pending"
    return jsonify(
        {
            "role": "dietitian",
            "status": status,
            "marketplaceOpen": dietitian_marketplace_open(state, user["id"]),
            "listingId": (listing or {}).get("id"),
        }
    )


@care_bp.post("/auth/login")
def login():
    body = _json()
    user_id = body.get("userId") or body.get("user_id")
    state = get_store().snapshot()
    user = next((item for item in state["users"] if item["id"] == user_id), None)
    if not user:
        return jsonify({"detail": "Unknown demo workspace"}), 404
    return jsonify({"user": user, "token": user["id"]})


@care_bp.post("/auth/admin-login")
def admin_login():
    """Email + password admin gate. Credentials come from CARE_ADMIN_CREDENTIALS / CARE_ADMIN_PASSWORD."""
    body = _json()
    email = body.get("email") or ""
    password = body.get("password") or ""
    name = body.get("name") or ""
    store = get_store()
    try:
        next_state, user = login_admin(
            store.snapshot(), email, password, name or None,
            resolve_auth_id=getattr(store, "resolve_admin_auth_id", None),
        )
    except ValueError as error:
        message = str(error)
        status = 401 if "Incorrect" in message else 400
        return jsonify({"detail": message}), status
    store.replace(next_state)
    return jsonify({"user": user, "token": user["id"]})


@care_bp.get("/state")
def read_state():
    """Bootstrap payload scoped to the signed-in viewer — never the whole marketplace."""
    user, err = _require_user()
    if err:
        return err
    store = get_store()
    # Always re-read marketplace tables so admin deletes in Supabase show up immediately.
    if hasattr(store, "_invalidate_cache"):
        store._invalidate_cache()
    before = _snapshot()
    state = expire_ringing_calls(before)
    if state != before:
        # Prefer hot persist for expired calls when available.
        if hasattr(store, "persist_hot_action") and store.persist_hot_action(before, state, "END_CALL"):
            pass
        else:
            state = store.replace(state)
    return jsonify(_viewer_payload(state, user))


@care_bp.get("/catalog/dietitians")
def catalog_dietitians():
    """Patient/admin/dietitian directory — Supabase mp_dietitians only."""
    user, err = _require_user()
    if err:
        return err
    store = get_store()
    role = user.get("role")
    if hasattr(store, "list_marketplace_dietitians"):
        rows = store.list_marketplace_dietitians(
            admin=role == "admin",
            viewer_id=user.get("id"),
            include_own=role == "dietitian",
        )
    else:
        payload = _viewer_payload(store.snapshot(), user)
        rows = payload.get("dietitians") or []
    from care.scoped import _public_credential_docs

    # Patients: approved+verified only, with public credential metadata (not empty).
    if role == "patient":
        rows = [
            {**item, "documents": _public_credential_docs(item.get("documents") or [])}
            for item in rows
            if item.get("status") == "approved" and item.get("verified")
        ]
    elif role == "dietitian":
        rows = [
            {
                **item,
                "documents": (
                    item.get("documents") or []
                    if item.get("userId") == user.get("id")
                    else _public_credential_docs(item.get("documents") or [])
                ),
            }
            for item in rows
            if (item.get("status") == "approved" and item.get("verified"))
            or item.get("userId") == user.get("id")
        ]
    return jsonify({"dietitians": _sign_avatars({"dietitians": rows}).get("dietitians") or []})


@care_bp.get("/catalog/applications")
def catalog_applications():
    """Admin application queue — Supabase mp_applications only."""
    user, err = _require_user()
    if err:
        return err
    store = get_store()
    if user.get("role") == "admin":
        if hasattr(store, "list_marketplace_applications"):
            rows = store.list_marketplace_applications(admin=True)
        else:
            rows = _viewer_payload(store.snapshot(), user).get("applications") or []
    else:
        if hasattr(store, "list_marketplace_applications"):
            rows = store.list_marketplace_applications(admin=False, user_id=user["id"])
        else:
            rows = [
                item
                for item in (_viewer_payload(store.snapshot(), user).get("applications") or [])
                if item.get("userId") == user["id"]
            ]
    return jsonify({"applications": rows})


@care_bp.get("/pulse")
def read_pulse():
    """Cheap inbox/presence poll — conversations headers, live calls, notifications, appointments."""
    user, err = _require_user()
    if err:
        return err
    store = get_store()
    with _state_lock:
        if hasattr(store, "viewer_pulse"):
            # Expire only this viewer's calls without loading every marketplace table.
            pulse = store.viewer_pulse(user["id"], user.get("role", "patient"))
            before = {**pulse, "messages": [], "dietitians": []}
            state = expire_ringing_calls(before)
            if state != before:
                store.persist_hot_action(before, state, "END_CALL")
            return jsonify(_sign_avatars({key: state.get(key, []) for key in pulse}))
        before = store.snapshot()
        state = expire_ringing_calls(before)
        if state != before:
            state = store.replace(state)
        return jsonify(_sign_avatars(pulse_scope(state, user)))


@care_bp.get("/stream")
def care_stream():
    """Server-Sent Events channel for instant chat delivery (auth via headers)."""
    user, err = _require_user()
    if err:
        return err
    user_id = str(user["id"])

    @stream_with_context
    def generate():
        queue = subscribe(user_id)
        try:
            yield format_sse("ready", {"userId": user_id})
            while True:
                if not request.environ.get("wsgi.input") and False:
                    break
                event = wait_event(queue, timeout=25.0)
                if event is None:
                    yield ": keepalive\n\n"
                    continue
                yield format_sse(str(event.get("type") or "message"), event.get("data") or {})
        finally:
            unsubscribe(user_id, queue)

    response = Response(generate(), mimetype="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    response.headers["Connection"] = "keep-alive"
    return response


@care_bp.get("/conversations/<conversation_id>/messages")
def list_messages(conversation_id: str):
    """Paged messages for one conversation — not the entire inbox history."""
    user, err = _require_user()
    if err:
        return err
    try:
        limit = max(1, min(int(request.args.get("limit") or 50), 100))
    except ValueError:
        limit = 50
    after = request.args.get("after") or ""
    store = get_store()
    if hasattr(store, "conversation_messages"):
        try:
            return jsonify({"messages": store.conversation_messages(conversation_id, user, limit, after)})
        except ValueError as error:
            return jsonify({"detail": str(error)}), 404
    state = _snapshot()
    conversation = next((item for item in state.get("conversations") or [] if item.get("id") == conversation_id), None)
    if not conversation or (
        user["id"] not in (conversation.get("participantIds") or []) and user.get("role") != "admin"
    ):
        return jsonify({"detail": "Conversation not found"}), 404
    try:
        limit = max(1, min(int(request.args.get("limit") or 50), 100))
    except ValueError:
        limit = 50
    after = request.args.get("after") or ""
    messages = [
        item
        for item in state.get("messages") or []
        if item.get("conversationId") == conversation_id and (not after or (item.get("timestamp") or "") > after)
    ]
    messages = sorted(messages, key=lambda item: item.get("timestamp") or "")[-limit:]
    from care.media import sanitize_message

    return jsonify({"messages": [sanitize_message(item) for item in messages]})


@care_bp.get("/assets")
def resolve_asset():
    """Issue a short-lived URL for an object already referenced by care data."""
    user, err = _require_user()
    if err:
        return err
    raw_bucket = (request.args.get("bucket") or "").strip()
    if raw_bucket in ("avatars", "avatar"):
        bucket = settings.r2_avatars_bucket
    elif raw_bucket:
        bucket = raw_bucket
    else:
        bucket = settings.r2_private_bucket
    key = request.args.get("key") or ""
    if not key or key.startswith("data:"):
        return jsonify({"detail": "Asset key is required"}), 400
    # Avatars are stored under the owner's id prefix — allow self and skip full scan.
    if key.startswith(f"{user['id']}/") or f"/{user['id']}/" in key:
        url = _signed_asset_url(bucket, key)
        if not url:
            return jsonify({"detail": "Could not prepare file"}), 502
        return jsonify({"url": url})
    state = get_store().snapshot()
    scoped = viewer_scope(state, user)
    allowed = False
    for item in scoped.get("files", []):
        if item.get("objectKey") == key:
            allowed = True
            break
    if not allowed:
        for message in scoped.get("messages", []):
            if any(asset.get("objectKey") == key for asset in message.get("attachments") or []):
                allowed = True
                break
    if not allowed:
        from care.media import storage_key_for_asset

        # Approved public listings: avatars, covers, and credential docs.
        for dietitian in scoped.get("dietitians", []) + (state.get("dietitians") or []):
            status_ok = dietitian.get("status") == "approved" and bool(dietitian.get("verified"))
            own_listing = dietitian.get("userId") == user.get("id")
            if not status_ok and not own_listing and user.get("role") != "admin":
                continue
            avatar_key = storage_key_for_asset(dietitian.get("avatar") or "")
            cover_key = storage_key_for_asset(dietitian.get("coverImage") or "")
            if key in {avatar_key, cover_key} - {""}:
                allowed = True
                break
            if any(doc.get("objectKey") == key for doc in (dietitian.get("documents") or [])):
                allowed = True
                break
    if not allowed and user.get("role") == "admin":
        for application in scoped.get("applications", []):
            if any(doc.get("objectKey") == key for doc in application.get("documents") or []):
                allowed = True
                break
    if not allowed:
        return jsonify({"detail": "Asset not found"}), 404
    url = _signed_asset_url(bucket, key)
    if not url:
        return jsonify({"detail": "Could not prepare file"}), 502
    return jsonify({"url": url})


@care_bp.post("/dev/reset")
def reset():
    state = get_store().reset()
    return jsonify({"ok": True, "users": len(state.get("users") or [])})


@care_bp.post("/actions")
def run_action_endpoint():
    user, err = _require_user()
    if err:
        return err
    body = _json()
    return _run_action(body.get("type") or "", body.get("payload") or {}, user)


@care_bp.post("/messages")
def send_message():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action(
        "SEND_MESSAGE",
        {
            "conversationId": payload["conversationId"],
            "senderId": payload.get("senderId") or user["id"],
            "text": payload["text"],
            "attachments": payload.get("attachments") or [],
            "messageId": payload.get("messageId") or payload.get("id"),
            "peerId": payload.get("peerId"),
        },
        user,
    )


@care_bp.post("/conversations")
def ensure_conversation():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    dietitian_user_id = payload["dietitianUserId"]
    name = payload.get("dietitianName") or "Dietitian"
    result = _run_action(
        "ENSURE_CONVERSATION",
        {"patientId": user["id"], "dietitianUserId": dietitian_user_id, "dietitianName": name},
        user,
    )
    if isinstance(result, tuple):
        return result
    data = result.get_json()
    data["conversationId"] = conversation_id_for(user["id"], dietitian_user_id)
    return jsonify(data)


@care_bp.post("/appointments")
def book_appointment():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action(
        "ADD_APPOINTMENT",
        {
            "patientId": user["id"],
            "dietitianId": payload["dietitianId"],
            "date": payload["date"],
            "time": payload["time"],
            "topic": payload["topic"],
            "kind": payload.get("kind") or "video",
        },
        user,
    )


@care_bp.post("/appointments/<appointment_id>/cancel")
def cancel_appointment(appointment_id: str):
    user, err = _require_user()
    if err:
        return err
    store = get_store()
    # Prefer a direct hard-delete — soft `status=deleted` breaks when the DB
    # check constraint was never migrated to allow that value.
    if hasattr(store, "delete_appointment"):
        try:
            return jsonify(store.delete_appointment(appointment_id, user))
        except ValueError as error:
            return jsonify({"detail": str(error)}), 400
        except Exception:
            current_app.logger.exception("delete_appointment failed for %s", appointment_id)
            return jsonify({"detail": "Could not delete this appointment. Please try again."}), 503
    return _run_action("CANCEL_APPOINTMENT", {"appointmentId": appointment_id, "status": "deleted"}, user)


@care_bp.post("/consultations")
def request_consultation():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action(
        "REQUEST_CONSULTATION",
        {
            "request": {
                "patientId": user["id"],
                "dietitianId": payload["dietitianId"],
                "status": "pending",
                "createdAt": now_iso(),
                "note": payload.get("note") or "",
            }
        },
        user,
    )


@care_bp.post("/consultations/<request_id>/respond")
def respond_consultation(request_id: str):
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action("RESPOND_CONSULTATION", {"id": request_id, "status": payload["status"]}, user)


@care_bp.post("/files")
def upload_file():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action(
        "UPLOAD_FILE",
        {
            "file": {
                "ownerId": user["id"],
                "name": payload["name"],
                "category": payload.get("category") or "other",
                "size": payload.get("size") or "",
                "objectKey": payload.get("objectKey"),
                "bucket": payload.get("bucket"),
                "mimeType": payload.get("mimeType"),
                "sizeBytes": payload.get("sizeBytes") or 0,
                "uploadedAt": now_iso(),
                "sharedWithId": payload.get("sharedWithId"),
            }
        },
        user,
    )


@care_bp.post("/uploads")
def upload_to_r2():
    """Upload a marketplace asset to private R2 storage.

    The browser sends multipart data to Flask; R2 credentials never leave the
    server.  The returned object reference is persisted in Supabase metadata.
    """
    user, err = _require_user()
    if err:
        return err
    incoming = request.files.get("file")
    if incoming is None or not incoming.filename:
        return jsonify({"detail": "Choose a file to upload"}), 400
    content = incoming.read()
    if not content:
        return jsonify({"detail": "The selected file is empty"}), 400
    if len(content) > 10 * 1024 * 1024:
        return jsonify({"detail": "Choose a file smaller than 10 MB"}), 400
    kind = request.form.get("kind", "document")
    bucket = settings.r2_avatars_bucket if kind == "avatar" else settings.r2_private_bucket
    try:
        storage = get_r2_storage()
        key = storage.upload(
            bucket=bucket,
            owner_id=user["id"],
            file_name=incoming.filename,
            content=content,
            content_type=incoming.mimetype or "application/octet-stream",
        )
    except Exception:
        return jsonify({"detail": "Could not store the file"}), 502
    return jsonify({
        "bucket": bucket,
        "objectKey": key,
        "name": incoming.filename,
        "sizeBytes": len(content),
        "type": incoming.mimetype or "application/octet-stream",
    }), 201


@care_bp.post("/applications")
def submit_application():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    application = {
        **payload,
        "id": uid("app"),
        "userId": user["id"],
        "status": "pending",
        "submittedAt": now_iso(),
        "adminNotes": [],
    }
    return _run_action("SUBMIT_APPLICATION", {"application": application}, user)


@care_bp.post("/applications/<application_id>/approve")
def approve_application(application_id: str):
    user, err = _require_user()
    if err:
        return err
    if user["role"] != "admin":
        return jsonify({"detail": "Admin only"}), 403
    # Tolerate empty bodies (some clients send Content-Type: application/json with no payload).
    _json()
    return _run_action("APPROVE_APPLICATION", {"applicationId": application_id}, user)


@care_bp.post("/applications/<application_id>/more-info")
def request_more_info(application_id: str):
    user, err = _require_user()
    if err:
        return err
    if user["role"] != "admin":
        return jsonify({"detail": "Admin only"}), 403
    payload = _json()
    return _run_action("REQUEST_MORE_INFO", {"applicationId": application_id, "message": payload["message"]}, user)


@care_bp.delete("/applications/<application_id>")
def delete_application(application_id: str):
    """Admin hard-delete — removes the application and any non-approved listing."""
    user, err = _require_user()
    if err:
        return err
    if user["role"] != "admin":
        return jsonify({"detail": "Admin only"}), 403
    store = get_store()
    # Authoritative Supabase delete first so the row cannot reappear from a stale snapshot.
    if hasattr(store, "delete_marketplace_application"):
        try:
            store.delete_marketplace_application(application_id)
        except Exception:
            current_app.logger.exception("Failed to delete application %s", application_id)
            return jsonify({"detail": "Could not delete this application."}), 503
    return _run_action("DELETE_APPLICATION", {"applicationId": application_id}, user)


@care_bp.put("/dietitians/<dietitian_id>/availability")
def update_availability(dietitian_id: str):
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action(
        "UPDATE_AVAILABILITY",
        {"dietitianId": dietitian_id, "availability": payload["availability"]},
        user,
    )


@care_bp.put("/account")
def update_account():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action("UPDATE_ACCOUNT", {"userId": user["id"], **payload}, user)


@care_bp.put("/patient/profile")
def save_profile():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action("UPDATE_PATIENT_PROFILE", {"profile": {**payload, "userId": user["id"]}}, user)


@care_bp.put("/patient/settings")
def save_settings():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action("UPDATE_PATIENT_SETTINGS", {"settings": {**payload, "userId": user["id"]}}, user)


@care_bp.post("/patient/file-share")
def file_share():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action(
        "SET_FILE_SHARE",
        {"ownerId": user["id"], "dietitianUserId": payload["dietitianUserId"], "granted": payload["granted"]},
        user,
    )


@care_bp.post("/patient/file-block")
def file_block():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action(
        "SET_FILE_ACCESS_BLOCK",
        {"ownerId": user["id"], "dietitianUserId": payload["dietitianUserId"], "blocked": payload["blocked"]},
        user,
    )


@care_bp.post("/payments")
def pay():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action("ADD_PAYMENT", {"payment": {**payload, "patientId": user["id"]}}, user)


@care_bp.post("/payment-methods")
def add_method():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    method = {**payload, "id": uid("pm"), "patientId": user["id"]}
    return _run_action("ADD_PAYMENT_METHOD", {"method": method}, user)


@care_bp.post("/payment-methods/<method_id>/default")
def default_method(method_id: str):
    user, err = _require_user()
    if err:
        return err
    return _run_action("SET_DEFAULT_PAYMENT_METHOD", {"patientId": user["id"], "methodId": method_id}, user)


@care_bp.post("/reviews")
def add_review():
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action(
        "ADD_REVIEW",
        {
            "dietitianId": payload["dietitianId"],
            "review": {
                "author": user["name"],
                "authorId": user["id"],
                "rating": payload["rating"],
                "text": payload["text"],
            },
        },
        user,
    )


@care_bp.delete("/reviews/<dietitian_id>")
def delete_review(dietitian_id: str):
    user, err = _require_user()
    if err:
        return err
    return _run_action("DELETE_REVIEW", {"dietitianId": dietitian_id, "authorId": user["id"]}, user)


@care_bp.post("/missed-calls/seen")
def missed_seen():
    user, err = _require_user()
    if err:
        return err
    return _run_action("MARK_MISSED_CALLS_SEEN", {"userId": user["id"]}, user)


@care_bp.post("/conversations/<conversation_id>/read")
def read_conversation(conversation_id: str):
    user, err = _require_user()
    if err:
        return err
    return _run_action("MARK_CONVERSATION_READ", {"conversationId": conversation_id, "userId": user["id"]}, user)


@care_bp.post("/notifications/<notification_id>/read")
def read_notification(notification_id: str):
    user, err = _require_user()
    if err:
        return err
    return _run_action("MARK_NOTIFICATION_READ", {"id": notification_id}, user)


@care_bp.post("/notifications/read-all")
def read_all():
    user, err = _require_user()
    if err:
        return err
    return _run_action("MARK_NOTIFICATIONS_READ", {"userId": user["id"]}, user)


@care_bp.delete("/sessions/<session_id>")
def end_session(session_id: str):
    user, err = _require_user()
    if err:
        return err
    return _run_action("END_SESSION", {"sessionId": session_id}, user)


@care_bp.put("/dietitians/<dietitian_id>/experience")
def update_experience(dietitian_id: str):
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    return _run_action(
        "UPDATE_DIETITIAN_PROFILE",
        {"dietitianId": dietitian_id, "experience": payload["experience"]},
        user,
    )


@care_bp.get("/calls/<call_id>")
def read_call(call_id: str):
    user, err = _require_user()
    if err:
        return err
    store = get_store()
    if hasattr(store, "get_live_call"):
        call = store.get_live_call(call_id)
    else:
        state = store.snapshot()
        call = next((item for item in state.get("liveCalls", []) if item["id"] == call_id), None)
    if not call or user["id"] not in (call["callerId"], call["calleeId"]):
        return jsonify({"detail": "Call not found"}), 404
    return jsonify(public_call(call))


@care_bp.post("/calls/<call_id>/signal")
def signal_call(call_id: str):
    user, err = _require_user()
    if err:
        return err
    payload = _json()
    store = get_store()
    try:
        with _state_lock:
            if hasattr(store, "persist_call_signal"):
                return jsonify(store.persist_call_signal(call_id, user["id"], payload))
            next_state = apply_call_signal(store.snapshot(), call_id, user["id"], payload)
            saved = store.replace(next_state)
    except ValueError as error:
        return jsonify({"detail": str(error)}), 404
    call = next((item for item in saved.get("liveCalls", []) if item["id"] == call_id), None)
    if not call:
        return jsonify({"detail": "Call not found"}), 404
    return jsonify(public_call(call))
