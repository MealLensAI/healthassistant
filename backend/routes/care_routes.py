"""Dietitian marketplace / patient care API — same Flask process as MealLensAI."""

from __future__ import annotations

from typing import Any

from flask import Blueprint, jsonify, request

from care.db import get_store
from care.seed_data import DEMO_ACCOUNTS, USERS
from care.service import (
    apply_action,
    apply_call_signal,
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

care_bp = Blueprint("care", __name__)


def _json():
    return request.get_json(silent=True) or {}


def _current_user():
    user_id = request.headers.get("X-User-Id") or request.headers.get("X-User-ID")
    if not user_id:
        return None
    state = get_store().snapshot()
    user = next((item for item in state["users"] if item["id"] == user_id), None)
    if not user:
        return None
    return user


def _require_user():
    user = _current_user()
    if not user:
        return None, (jsonify({"detail": "Sign in first"}), 401)
    return user, None


def _run_action(action_type: str, payload: dict[str, Any], user: dict[str, Any]):
    store = get_store()
    action = {"type": action_type, **payload}
    try:
        next_state = apply_action(store.snapshot(), action, user)
    except ValueError as error:
        return jsonify({"detail": str(error)}), 400
    saved = store.replace(next_state)
    current = next((item for item in saved["users"] if item["id"] == user["id"]), user)
    return jsonify({**saved, "currentUser": current})


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
        "externalUserId": body.get("externalUserId") or body.get("external_user_id") or "",
        "email": body.get("email") or "",
        "name": body.get("name") or "",
        "phone": body.get("phone") or "",
        "country": body.get("country") or "",
        "role": body.get("role") or "patient",
    }
    store = get_store()
    try:
        next_state, user = sync_account(store.snapshot(), payload)
    except ValueError as error:
        return jsonify({"detail": str(error)}), 400
    store.replace(next_state)
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
        next_state, user = login_admin(store.snapshot(), email, password, name or None)
    except ValueError as error:
        message = str(error)
        status = 401 if "Incorrect" in message else 400
        return jsonify({"detail": message}), status
    store.replace(next_state)
    return jsonify({"user": user, "token": user["id"]})


@care_bp.get("/state")
def read_state():
    user = _current_user()
    state = get_store().snapshot()
    return jsonify({**state, "currentUser": user})


@care_bp.post("/dev/reset")
def reset():
    return jsonify(get_store().reset())


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
    return _run_action("CANCEL_APPOINTMENT", {"appointmentId": appointment_id}, user)


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
                "uploadedAt": now_iso(),
                "sharedWithId": payload.get("sharedWithId"),
            }
        },
        user,
    )


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
    state = get_store().snapshot()
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
        saved = store.replace(apply_call_signal(store.snapshot(), call_id, user["id"], payload))
    except ValueError as error:
        return jsonify({"detail": str(error)}), 404
    call = next((item for item in saved.get("liveCalls", []) if item["id"] == call_id), None)
    if not call:
        return jsonify({"detail": "Call not found"}), 404
    return jsonify(public_call(call))
