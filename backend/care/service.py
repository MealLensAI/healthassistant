from __future__ import annotations

import copy
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from .seed_data import default_availability

Json = dict[str, Any]


def uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def next_weekday() -> str:
    date = datetime.now(timezone.utc)
    days = (1 - date.weekday()) % 7 or 7
    return (date + timedelta(days=days)).date().isoformat()


def conversation_id_for(patient_id: str, dietitian_user_id: str) -> str:
    return "conv-" + "-".join(sorted([patient_id, dietitian_user_id]))


def score_reviews(reviews: list[Json]) -> dict[str, Any]:
    count = len(reviews)
    rating = round(sum(item.get("rating") or 0 for item in reviews) / count, 1) if count else 0
    return {"reviews": reviews, "reviewCount": count, "rating": rating}


def upsert_pending_dietitian(dietitians: list[Json], application: Json) -> list[Json]:
    existing = next((item for item in dietitians if item["userId"] == application["userId"]), None)
    photo = next((doc.get("url") for doc in application.get("documents", []) if doc.get("kind") == "photo"), "")
    documents = []
    for doc in application.get("documents", []):
        kind = doc.get("kind")
        mapped = "photo" if kind == "photo" else "license" if kind == "license" else "cv" if kind == "cv" else "degree"
        found = next((item for item in (existing or {}).get("documents", []) if item.get("fileName") == doc.get("fileName")), None)
        documents.append(
            {
                "id": (found or {}).get("id") or uid("doc"),
                "name": doc.get("name"),
                "kind": mapped,
                "fileName": doc.get("fileName"),
                "url": doc.get("url"),
            }
        )
    status = application.get("status")
    next_status = "approved" if status == "approved" else "needs_info" if status == "needs_info" else "pending"
    next_item = {
        "id": (existing or {}).get("id") or f"dt-{application['userId'].replace('user-', '')}",
        "userId": application["userId"],
        "name": application["fullName"],
        "title": (existing or {}).get("title") or "Dietitian",
        "country": application.get("country") or "",
        "specialties": application.get("specialties") or [],
        "conditions": application.get("specialties") or [],
        "yearsExperience": application.get("yearsExperience") or 0,
        "rating": (existing or {}).get("rating") or 0,
        "reviewCount": (existing or {}).get("reviewCount") or 0,
        "bio": application.get("bio") or "",
        "languages": application.get("languages") or [],
        "workplace": application.get("workplace") or "",
        "avatar": (existing or {}).get("avatar") or photo or "",
        "coverImage": (existing or {}).get("coverImage") or "",
        "verified": status == "approved",
        "featured": status == "approved",
        "education": application.get("education") or [],
        "experience": application.get("experience") or [],
        "documents": documents,
        "reviews": (existing or {}).get("reviews") or [],
        "availability": (existing or {}).get("availability") or default_availability(),
        "status": next_status,
    }
    if existing:
        return [{**item, **next_item, "id": item["id"]} if item["userId"] == application["userId"] else item for item in dietitians]
    return [*dietitians, next_item]


def empty_patient_profile(user_id: str, name: str) -> Json:
    first = (name.split() or [name])[0]
    return {
        "userId": user_id,
        "legalName": name,
        "preferredName": first,
        "dateOfBirth": "",
        "age": 0,
        "biologicalSex": "",
        "genderIdentity": "",
        "primaryLanguage": "English",
        "phone": "",
        "emergencyContact": "",
        "emergencyPhone": "",
        "conditions": [{"name": "", "diagnosed": "", "physician": "", "clinic": ""}],
        "heightCm": 0,
        "weightKg": 0,
        "targetWeightKg": "",
        "bmi": 0,
        "weightHistory": "",
        "allergies": [],
        "intolerances": [],
        "dietPreferences": [],
        "medications": "",
        "supplements": "",
        "occupation": "",
        "sleep": "",
        "exercise": "",
        "alcohol": "",
        "smoking": "",
    }


def register_account(state: Json, payload: Json) -> tuple[Json, Json]:
    name = str(payload.get("name") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    phone = str(payload.get("phone") or "").strip()
    country = str(payload.get("country") or "").strip()
    role = str(payload.get("role") or "patient").strip()
    if role not in ("patient", "dietitian"):
        raise ValueError("Choose patient or dietitian")
    if not name or "@" not in email:
        raise ValueError("Name and a valid email are required")
    if any(str(item.get("email") or "").lower() == email for item in state.get("users", [])):
        raise ValueError("That email is already registered")
    user = {
        "id": uid("user"),
        "name": name,
        "email": email,
        "role": role,
        "avatar": "",
        "country": country,
        "title": "Dietitian" if role == "dietitian" else None,
        "phone": phone,
    }
    next_state = copy.deepcopy(state)
    next_state["users"] = [*(next_state.get("users") or []), user]
    if role == "patient":
        incoming = payload.get("profile") if isinstance(payload.get("profile"), dict) else {}
        profile = {**empty_patient_profile(user["id"], name), **incoming, "userId": user["id"], "phone": phone or incoming.get("phone") or ""}
        profiles = [item for item in (next_state.get("patientProfiles") or []) if item.get("userId") != user["id"]]
        next_state["patientProfiles"] = [profile, *profiles]
    return next_state, user


def register_doctor(state: Json, payload: Json) -> tuple[Json, Json]:
    return register_account(state, {**payload, "role": "dietitian"})


def _dietitian_listing(state: Json, user_id: str) -> Json | None:
    return next((item for item in state.get("dietitians", []) if item.get("userId") == user_id), None)


def dietitian_marketplace_open(state: Json, user_id: str) -> bool:
    listing = _dietitian_listing(state, user_id)
    return bool(listing and listing.get("status") == "approved")


DIETITIAN_MARKETPLACE_ACTIONS = {
    "SEND_MESSAGE",
    "START_CALL",
    "ANSWER_CALL",
    "RESPOND_CONSULTATION",
    "COMPLETE_APPOINTMENT",
}


def _guard_dietitian_marketplace(state: Json, actor: Json | None, kind: str) -> None:
    if not actor or actor.get("role") != "dietitian":
        return
    if kind not in DIETITIAN_MARKETPLACE_ACTIONS:
        return
    if dietitian_marketplace_open(state, actor["id"]):
        return
    raise ValueError(
        "Complete your registration and wait for admin approval before messaging patients, taking calls, or managing appointments."
    )


def sync_account(state: Json, payload: Json) -> tuple[Json, Json]:
    from care.config import settings

    email = str(payload.get("email") or "").strip().lower()
    name = str(payload.get("name") or "").strip()
    external_user_id = str(payload.get("externalUserId") or "").strip()
    role = str(payload.get("role") or "patient").strip()
    if role not in ("patient", "dietitian", "admin"):
        role = "patient"
    # Only allowlisted emails may become / stay admin via sync.
    if role == "admin" and not settings.is_admin_email(email):
        role = "patient"
    if not email or "@" not in email:
        raise ValueError("A valid email is required")
    if not name:
        name = email.split("@")[0]

    next_state = copy.deepcopy(state)
    user = next((item for item in next_state.get("users", []) if str(item.get("email") or "").lower() == email), None)
    if user:
        # Never downgrade credential-review admins.
        if user.get("role") == "admin" or settings.is_admin_email(email):
            user = {
                **user,
                "role": "admin",
                "title": user.get("title") or "Admin",
                "name": name or user.get("name"),
            }
            next_state["users"] = [
                user if item.get("id") == user["id"] else item for item in next_state.get("users", [])
            ]
            return next_state, user
        # Org/dietitian accounts may open marketplace after an earlier patient sync — upgrade role.
        if role == "dietitian" and user.get("role") != "dietitian":
            user = {
                **user,
                "role": "dietitian",
                "title": user.get("title") or "Dietitian",
                "name": name or user.get("name"),
            }
            next_state["users"] = [
                user if item.get("id") == user["id"] else item for item in next_state.get("users", [])
            ]
        elif name and name != user.get("name"):
            user = {**user, "name": name}
            next_state["users"] = [
                user if item.get("id") == user["id"] else item for item in next_state.get("users", [])
            ]
        return next_state, user

    user_id = external_user_id or uid("user")
    if any(item.get("id") == user_id for item in next_state.get("users", [])):
        user_id = uid("user")
    resolved_role = "admin" if settings.is_admin_email(email) else role
    user = {
        "id": user_id,
        "name": name,
        "email": email,
        "role": resolved_role,
        "avatar": "",
        "country": str(payload.get("country") or "").strip(),
        "title": "Admin" if resolved_role == "admin" else ("Dietitian" if resolved_role == "dietitian" else None),
        "phone": str(payload.get("phone") or "").strip(),
    }
    next_state["users"] = [*(next_state.get("users") or []), user]
    if resolved_role == "patient":
        profiles = [item for item in (next_state.get("patientProfiles") or []) if item.get("userId") != user["id"]]
        next_state["patientProfiles"] = [{**empty_patient_profile(user["id"], name), "userId": user["id"]}, *profiles]
    return next_state, user


def login_admin(state: Json, email: str, password: str, name: str | None = None) -> tuple[Json, Json]:
    """Authenticate an env-allowlisted admin with email + password."""
    from care.config import settings

    email_key = str(email or "").strip().lower()
    if not email_key or "@" not in email_key:
        raise ValueError("A valid email is required")
    if not settings.admin_credentials:
        raise ValueError("Admin password login is not configured. Set CARE_ADMIN_CREDENTIALS or CARE_ADMIN_PASSWORD.")
    if not settings.verify_admin_password(email_key, password):
        raise ValueError("Incorrect email or password")

    display = (name or "").strip() or email_key.split("@")[0].replace(".", " ").title()
    return sync_account(
        state,
        {
            "email": email_key,
            "name": display,
            "role": "admin",
            "externalUserId": f"admin-{email_key}",
        },
    )


def apply_action(state: Json, action: Json, actor: Json | None) -> Json:
    next_state = copy.deepcopy(state)
    next_state.setdefault("liveCalls", [])
    kind = action.get("type")
    actor_id = (actor or {}).get("id")
    actor_name = (actor or {}).get("name") or "Admin"
    _guard_dietitian_marketplace(next_state, actor, kind)

    if kind == "SEND_MESSAGE":
        timestamp = now_iso()
        message = {
            "id": uid("msg"),
            "conversationId": action["conversationId"],
            "senderId": action.get("senderId") or actor_id,
            "text": action["text"],
            "timestamp": timestamp,
            "attachments": action.get("attachments") or [],
        }
        next_state["messages"].append(message)
        for conversation in next_state["conversations"]:
            if conversation["id"] == action["conversationId"]:
                conversation["lastMessage"] = action["text"]
                conversation["lastAt"] = timestamp
        return next_state

    if kind == "ENSURE_CONVERSATION":
        existing = next(
            (
                item
                for item in next_state["conversations"]
                if action["patientId"] in item["participantIds"] and action["dietitianUserId"] in item["participantIds"]
            ),
            None,
        )
        if existing:
            return next_state
        conv_id = conversation_id_for(action["patientId"], action["dietitianUserId"])
        next_state["conversations"].append(
            {
                "id": conv_id,
                "participantIds": [action["patientId"], action["dietitianUserId"]],
                "lastMessage": f"Conversation started with {action['dietitianName']}",
                "lastAt": now_iso(),
                "lastReadAt": {},
            }
        )
        return next_state

    if kind == "REQUEST_CONSULTATION":
        request = {**action["request"], "id": uid("req")}
        next_state["consultationRequests"].insert(0, request)
        return next_state

    if kind == "RESPOND_CONSULTATION":
        request = next((item for item in next_state["consultationRequests"] if item["id"] == action["id"]), None)
        if not request:
            return next_state
        request["status"] = action["status"]
        if action["status"] == "accepted":
            dietitian = next((item for item in next_state["dietitians"] if item["id"] == request["dietitianId"]), None)
            if dietitian:
                next_state["appointments"].insert(
                    0,
                    {
                        "id": uid("apt"),
                        "patientId": request["patientId"],
                        "dietitianId": dietitian["id"],
                        "date": next_weekday(),
                        "time": "14:00",
                        "status": "upcoming",
                        "type": "video",
                        "topic": "New consultation",
                    },
                )
        return next_state

    if kind == "UPLOAD_FILE":
        next_state["files"].insert(0, {**action["file"], "id": uid("file")})
        return next_state

    if kind == "SUBMIT_APPLICATION":
        application = action["application"]
        is_update = any(item["userId"] == application["userId"] for item in next_state["applications"])
        next_state["applications"] = [application, *[item for item in next_state["applications"] if item["userId"] != application["userId"]]]
        next_state["dietitians"] = upsert_pending_dietitian(next_state["dietitians"], application)
        for admin in [user for user in next_state["users"] if user["role"] == "admin"]:
            next_state["notifications"].insert(
                0,
                {
                    "id": uid("ntf"),
                    "userId": admin["id"],
                    "kind": "registration",
                    "title": "Dietitian registration updated" if is_update else "New dietitian registration",
                    "body": (
                        f"{application['fullName']} updated their dietitian registration and is waiting for review."
                        if is_update
                        else f"{application['fullName']} registered as a dietitian and is waiting for verification."
                    ),
                    "href": f"/admin/applications/{application['id']}",
                    "createdAt": application["submittedAt"],
                    "read": False,
                },
            )
        return next_state

    if kind == "UPDATE_AVAILABILITY":
        for dietitian in next_state["dietitians"]:
            if dietitian["id"] == action["dietitianId"]:
                dietitian["availability"] = action["availability"]
        return next_state

    if kind == "APPROVE_APPLICATION":
        application = next((item for item in next_state["applications"] if item["id"] == action["applicationId"]), None)
        if not application:
            return next_state
        application["status"] = "approved"
        application["adminNotes"] = [*(application.get("adminNotes") or []), f"Approved by {actor_name}"]
        next_state["dietitians"] = upsert_pending_dietitian(next_state["dietitians"], application)
        for dietitian in next_state["dietitians"]:
            if dietitian["userId"] == application["userId"]:
                dietitian["status"] = "approved"
                dietitian["verified"] = True
                dietitian["featured"] = True
        return next_state

    if kind == "REQUEST_MORE_INFO":
        application = next((item for item in next_state["applications"] if item["id"] == action["applicationId"]), None)
        if not application:
            return next_state
        application["status"] = "needs_info"
        application["moreInfoRequest"] = action["message"]
        application["adminNotes"] = [*(application.get("adminNotes") or []), f"{actor_name}: {action['message']}"]
        for dietitian in next_state["dietitians"]:
            if dietitian["userId"] == application["userId"]:
                dietitian["status"] = "needs_info"
        return next_state

    if kind == "CANCEL_APPOINTMENT":
        for appointment in next_state["appointments"]:
            if appointment["id"] == action["appointmentId"]:
                appointment["status"] = "cancelled"
        return next_state

    if kind == "ADD_APPOINTMENT":
        next_state["appointments"].insert(
            0,
            {
                "id": uid("apt"),
                "patientId": action["patientId"],
                "dietitianId": action["dietitianId"],
                "date": action["date"],
                "time": action["time"],
                "status": "upcoming",
                "type": action["kind"],
                "topic": action["topic"],
            },
        )
        return next_state

    if kind == "ADD_PAYMENT":
        payment = {
            **action["payment"],
            "id": uid("pay"),
            "status": "paid",
            "paidAt": now_iso(),
            "receipt": f"INV-{uuid.uuid4().int % 9000 + 1000}",
        }
        next_state["payments"].insert(0, payment)
        for quote in next_state["paymentQuotes"]:
            if quote["id"] == action["payment"].get("quoteId"):
                quote["status"] = "paid"
        return next_state

    if kind == "UPDATE_PATIENT_PROFILE":
        profiles = [item for item in next_state["patientProfiles"] if item["userId"] != action["profile"]["userId"]]
        next_state["patientProfiles"] = [action["profile"], *profiles]
        return next_state

    if kind == "UPDATE_PATIENT_SETTINGS":
        settings = [item for item in next_state["patientSettings"] if item["userId"] != action["settings"]["userId"]]
        next_state["patientSettings"] = [action["settings"], *settings]
        return next_state

    if kind == "END_SESSION":
        next_state["deviceSessions"] = [item for item in next_state["deviceSessions"] if item["id"] != action["sessionId"]]
        return next_state

    if kind == "SET_FILE_SHARE":
        settings_row = next((item for item in next_state["patientSettings"] if item["userId"] == action["ownerId"]), None)
        blocked_ids = (settings_row or {}).get("blockedFileAccessIds") or []
        if action.get("granted") and action["dietitianUserId"] in blocked_ids:
            return next_state
        for file in next_state["files"]:
            if file["ownerId"] != action["ownerId"]:
                continue
            if action.get("granted"):
                if not file.get("sharedWithId"):
                    file["sharedWithId"] = action["dietitianUserId"]
            elif file.get("sharedWithId") == action["dietitianUserId"]:
                file["sharedWithId"] = None
        return next_state

    if kind == "SET_FILE_ACCESS_BLOCK":
        for settings in next_state["patientSettings"]:
            if settings["userId"] != action["ownerId"]:
                continue
            blocked = set(settings.get("blockedFileAccessIds") or [])
            if action.get("blocked"):
                blocked.add(action["dietitianUserId"])
            else:
                blocked.discard(action["dietitianUserId"])
            settings["blockedFileAccessIds"] = list(blocked)
        if action.get("blocked"):
            for file in next_state["files"]:
                if file["ownerId"] == action["ownerId"] and file.get("sharedWithId") == action["dietitianUserId"]:
                    file["sharedWithId"] = None
        return next_state

    if kind == "SET_DEFAULT_PAYMENT_METHOD":
        for method in next_state["paymentMethods"]:
            if method["patientId"] == action["patientId"]:
                method["isDefault"] = method["id"] == action["methodId"]
        return next_state

    if kind == "ADD_PAYMENT_METHOD":
        method = action["method"]
        if method.get("isDefault"):
            for item in next_state["paymentMethods"]:
                if item["patientId"] == method["patientId"]:
                    item["isDefault"] = False
        next_state["paymentMethods"].insert(0, method)
        return next_state

    if kind == "UPDATE_DIETITIAN_PROFILE":
        for dietitian in next_state["dietitians"]:
            if dietitian["id"] == action["dietitianId"]:
                dietitian["experience"] = action["experience"]
        return next_state

    if kind == "ADD_REVIEW":
        for dietitian in next_state["dietitians"]:
            if dietitian["id"] != action["dietitianId"]:
                continue
            existing = next((item for item in dietitian["reviews"] if item.get("authorId") == action["review"]["authorId"]), None)
            review = {
                "id": (existing or {}).get("id") or uid("rv"),
                "author": action["review"]["author"],
                "authorId": action["review"]["authorId"],
                "rating": action["review"]["rating"],
                "text": action["review"]["text"],
                "date": datetime.now(timezone.utc).date().isoformat(),
            }
            reviews = [review if item.get("id") == review["id"] else item for item in dietitian["reviews"]] if existing else [review, *dietitian["reviews"]]
            dietitian.update(score_reviews(reviews))
        return next_state

    if kind == "DELETE_REVIEW":
        for dietitian in next_state["dietitians"]:
            if dietitian["id"] == action["dietitianId"]:
                dietitian.update(score_reviews([item for item in dietitian["reviews"] if item.get("authorId") != action["authorId"]]))
        return next_state

    if kind == "MARK_MISSED_CALLS_SEEN":
        for item in next_state["missedCalls"]:
            if item["userId"] == action["userId"]:
                item["seen"] = True
        return next_state

    if kind == "MARK_CONVERSATION_READ":
        for conversation in next_state["conversations"]:
            if conversation["id"] == action["conversationId"]:
                conversation["lastReadAt"] = {**(conversation.get("lastReadAt") or {}), action["userId"]: now_iso()}
        return next_state

    if kind == "MARK_NOTIFICATION_READ":
        for item in next_state["notifications"]:
            if item["id"] == action["id"]:
                item["read"] = True
        return next_state

    if kind == "MARK_NOTIFICATIONS_READ":
        for item in next_state["notifications"]:
            if item["userId"] == action["userId"]:
                item["read"] = True
        return next_state

    if kind == "UPDATE_ACCOUNT":
        user_id = action["userId"]
        account_user = None
        for user in next_state["users"]:
            if user["id"] != user_id:
                continue
            account_user = user
            for key in ("name", "email", "phone", "country", "title", "avatar"):
                if action.get(key) is not None:
                    user[key] = action[key]
        listing = next((item for item in next_state["dietitians"] if item["userId"] == user_id), None)
        mapping = {
            "name": "name",
            "country": "country",
            "workplace": "workplace",
            "title": "title",
            "bio": "bio",
            "yearsExperience": "yearsExperience",
            "specialties": "specialties",
            "languages": "languages",
            "avatar": "avatar",
            "coverImage": "coverImage",
        }
        if listing:
            for src, dest in mapping.items():
                if action.get(src) is not None:
                    listing[dest] = action[src]
        elif account_user and account_user.get("role") == "dietitian":
            stub = {
                "id": f"dt-{user_id.replace('user-', '', 1)}",
                "userId": user_id,
                "name": action.get("name") or account_user.get("name") or "",
                "title": action.get("title") or account_user.get("title") or "",
                "country": action.get("country") or account_user.get("country") or "",
                "specialties": action.get("specialties") or [],
                "conditions": action.get("specialties") or [],
                "yearsExperience": action.get("yearsExperience") or 0,
                "rating": 0,
                "reviewCount": 0,
                "bio": action.get("bio") or "",
                "languages": action.get("languages") or [],
                "workplace": action.get("workplace") or "",
                "avatar": action.get("avatar") or account_user.get("avatar") or "",
                "coverImage": action.get("coverImage") or "",
                "verified": False,
                "featured": False,
                "education": [],
                "experience": [],
                "documents": [],
                "reviews": [],
                "availability": default_availability(),
                "status": "pending",
            }
            next_state["dietitians"] = [*(next_state.get("dietitians") or []), stub]
        return next_state

    if kind == "COMPLETE_APPOINTMENT":
        for appointment in next_state["appointments"]:
            if appointment["id"] == action["appointmentId"]:
                appointment["status"] = "completed"
        return next_state

    if kind == "START_CALL":
        peer_id = action.get("peerId") or (action.get("call") or {}).get("peerId")
        call = action.get("call") or action
        if not actor_id or not peer_id:
            return next_state
        conv_id = call.get("conversationId") or action.get("conversationId") or conversation_id_for(actor_id, peer_id)
        if conv_id == "live":
            conv_id = conversation_id_for(actor_id, peer_id)
        existing = next(
            (
                item
                for item in next_state.get("liveCalls", [])
                if {item["callerId"], item["calleeId"]} == {actor_id, peer_id}
            ),
            None,
        )
        if existing:
            return next_state
        peer = next((item for item in next_state["users"] if item["id"] == peer_id), None)
        next_state["liveCalls"] = [
            {
                "id": uid("call"),
                "conversationId": conv_id,
                "callerId": actor_id,
                "calleeId": peer_id,
                "callerName": actor_name,
                "callerAvatar": (actor or {}).get("avatar") or "",
                "calleeName": call.get("peerName") or (peer or {}).get("name") or "Care",
                "calleeAvatar": call.get("peerAvatar") or (peer or {}).get("avatar") or "",
                "status": "ringing",
                "startedAt": now_iso(),
                "offer": None,
                "answer": None,
                "ice": [],
            }
        ]
        href = f"/dietitian/messages/{conv_id}" if (peer or {}).get("role") == "dietitian" else f"/messages/{conv_id}"
        next_state["notifications"].insert(
            0,
            {
                "id": uid("ntf"),
                "userId": peer_id,
                "kind": "info",
                "title": "Incoming video call",
                "body": f"{actor_name} is calling you.",
                "href": href,
                "createdAt": now_iso(),
                "read": False,
            },
        )
        return next_state

    if kind == "ANSWER_CALL":
        for item in next_state.get("liveCalls", []):
            if item["calleeId"] == actor_id and item["status"] == "ringing":
                item["status"] = "live"
        return next_state

    if kind == "END_CALL":
        remaining = []
        for item in next_state.get("liveCalls", []):
            if actor_id not in (item["callerId"], item["calleeId"]):
                remaining.append(item)
                continue
            if item["status"] == "ringing":
                next_state["missedCalls"].insert(
                    0,
                    {
                        "id": uid("miss"),
                        "userId": item["calleeId"],
                        "peerId": item["callerId"],
                        "peerName": item["callerName"],
                        "createdAt": now_iso(),
                        "seen": False,
                    },
                )
            next_state["messages"].append(
                {
                    "id": uid("msg"),
                    "conversationId": item["conversationId"],
                    "senderId": actor_id,
                    "text": "Video call ended",
                    "timestamp": now_iso(),
                    "attachments": [],
                }
            )
            for conversation in next_state["conversations"]:
                if conversation["id"] == item["conversationId"]:
                    conversation["lastMessage"] = "Video call ended"
                    conversation["lastAt"] = now_iso()
        next_state["liveCalls"] = remaining
        return next_state

    raise ValueError(f"Unknown action {kind}")


def public_call(call: Json) -> Json:
    return {
        "id": call["id"],
        "conversationId": call.get("conversationId") or call.get("conversation_id"),
        "callerId": call.get("callerId") or call.get("caller_id"),
        "calleeId": call.get("calleeId") or call.get("callee_id"),
        "status": call.get("status") or "ringing",
        "offer": call.get("offer"),
        "answer": call.get("answer"),
        "ice": call.get("ice") or [],
    }


def apply_call_signal(state: Json, call_id: str, actor_id: str, payload: Json) -> Json:
    next_state = copy.deepcopy(state)
    call = next((item for item in next_state.get("liveCalls", []) if item["id"] == call_id), None)
    if not call:
        raise ValueError("Call not found")
    if actor_id not in (call["callerId"], call["calleeId"]):
        raise ValueError("Not in this call")
    if payload.get("offer") and not call.get("offer"):
        call["offer"] = payload["offer"]
    if payload.get("answer") and not call.get("answer"):
        call["answer"] = payload["answer"]
    ice = list(call.get("ice") or [])
    incoming = payload.get("ice") or []
    if isinstance(incoming, dict):
        incoming = [incoming]
    for item in incoming:
        candidate = item.get("candidate") if isinstance(item, dict) else None
        marker = (item.get("id") if isinstance(item, dict) else None) or uid("ice")
        if any(existing.get("id") == marker for existing in ice):
            continue
        ice.append(
            {
                "id": marker,
                "fromId": item.get("fromId") or actor_id,
                "candidate": candidate or item,
            }
        )
    call["ice"] = ice[-48:]
    return next_state
