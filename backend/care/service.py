from __future__ import annotations

import copy
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from .seed_data import default_availability
from .config import settings
from .media import account_avatar

Json = dict[str, Any]


def uid(prefix: str) -> str:
    # Supabase marketplace primary keys are UUIDs.  Preserve readable IDs for
    # the local demo data, but never attempt to write those demo IDs remotely.
    if settings.use_supabase:
        return str(uuid.uuid4())
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _looks_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except (TypeError, ValueError):
        return False


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def next_weekday() -> str:
    date = datetime.now(timezone.utc)
    days = (1 - date.weekday()) % 7 or 7
    return (date + timedelta(days=days)).date().isoformat()


def conversation_id_for(patient_id: str, dietitian_user_id: str) -> str:
    # Always UUID v5 so SPA + Supabase share the same conversation primary key.
    members = ":".join(sorted([patient_id, dietitian_user_id]))
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"meallens-care:{members}"))


def _user_is_dietitian(state: Json, user_id: str | None) -> bool:
    if not user_id:
        return False
    user = next((item for item in state.get("users") or [] if item.get("id") == user_id), None)
    if (user or {}).get("role") == "dietitian":
        return True
    # Role can be missing from a partial snapshot — listing ownership is authoritative.
    return any(item.get("userId") == user_id for item in state.get("dietitians") or [])


def notification_href_for(state: Json, user_id: str | None, *, surface: str, resource_id: str = "") -> str:
    """Deep-link a notification to the surface the recipient actually uses."""
    dietitian = _user_is_dietitian(state, user_id)
    if surface == "messages":
        if dietitian:
            return f"/dietitian/messages/{resource_id}" if resource_id else "/dietitian/messages"
        return f"/messages/{resource_id}" if resource_id else "/messages"
    if surface == "appointments":
        return "/dietitian/appointments" if dietitian else "/appointments"
    if surface == "practice_home":
        return "/dietitian" if dietitian else "/dietitians"
    if surface == "admin_application":
        return f"/admin/applications/{resource_id}" if resource_id else "/admin"
    if surface == "admin_bookings":
        return "/admin/bookings"
    return "/dietitians"


def notify_admins_of_booking(state: Json, *, patient_name: str, dietitian_name: str, date: str, time: str) -> None:
    body = f"{patient_name} booked {dietitian_name} on {date} at {time}."
    for admin in [user for user in state.get("users") or [] if user.get("role") == "admin"]:
        state.setdefault("notifications", []).insert(
            0,
            {
                "id": uid("ntf"),
                "userId": admin["id"],
                "kind": "info",
                "title": "New appointment booked",
                "body": body,
                "href": notification_href_for(state, admin["id"], surface="admin_bookings"),
                "createdAt": now_iso(),
                "read": False,
            },
        )


def score_reviews(reviews: list[Json]) -> dict[str, Any]:
    count = len(reviews)
    rating = round(sum(item.get("rating") or 0 for item in reviews) / count, 1) if count else 0
    return {"reviews": reviews, "reviewCount": count, "rating": rating}


def upsert_pending_dietitian(dietitians: list[Json], application: Json) -> list[Json]:
    existing = next((item for item in dietitians if item["userId"] == application["userId"]), None)
    photo = next(((doc.get("objectKey") or doc.get("url")) for doc in application.get("documents", []) if doc.get("kind") == "photo"), "")
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
                "objectKey": doc.get("objectKey"),
                "bucket": doc.get("bucket"),
                "mimeType": doc.get("mimeType"),
                "sizeBytes": doc.get("sizeBytes"),
            }
        )
    status = application.get("status")
    next_status = "approved" if status == "approved" else "needs_info" if status == "needs_info" else "pending"
    next_item = {
        "id": (existing or {}).get("id") or uid("dt"),
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
    # Supabase Auth's UUID is the account identity.  Do not identify a care
    # profile by email when a UUID is present: a recreated account can reuse an
    # email, and matching it to the prior UUID would expose that account's
    # profile, files, appointments, and avatar.
    user = (
        next((item for item in next_state.get("users", []) if item.get("id") == external_user_id), None)
        if external_user_id
        else next((item for item in next_state.get("users", []) if str(item.get("email") or "").lower() == email), None)
    )
    if user:
        if payload.get('avatar') and not user.get('avatar'):
            from .media import sanitize_asset_ref
            user['avatar'] = sanitize_asset_ref(payload['avatar'])
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
        # The host supplies the active patient/practice role on every sync.
        # A previous visit to a practice URL must not permanently lock a patient out.
        if role in {"patient", "dietitian"} and user.get("role") != role:
            user = {
                **user,
                "role": role,
                "title": "Dietitian" if role == "dietitian" else "Patient",
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
    from .media import sanitize_asset_ref
    user = {
        "id": user_id,
        "name": name,
        "email": email,
        "role": resolved_role,
        "avatar": sanitize_asset_ref(payload.get("avatar") or ""),
        "country": str(payload.get("country") or "").strip(),
        "title": "Admin" if resolved_role == "admin" else ("Dietitian" if resolved_role == "dietitian" else None),
        "phone": str(payload.get("phone") or "").strip(),
    }
    next_state["users"] = [*(next_state.get("users") or []), user]
    if resolved_role == "patient":
        profiles = [item for item in (next_state.get("patientProfiles") or []) if item.get("userId") != user["id"]]
        next_state["patientProfiles"] = [{**empty_patient_profile(user["id"], name), "userId": user["id"]}, *profiles]
    return next_state, user


def login_admin(
    state: Json, email: str, password: str, name: str | None = None,
    resolve_auth_id: Callable[[str], str] | None = None,
) -> tuple[Json, Json]:
    """Authenticate an env-allowlisted admin with email + password."""
    from care.config import settings

    email_key = str(email or "").strip().lower()
    if not email_key or "@" not in email_key:
        raise ValueError("A valid email is required")
    if not settings.admin_credentials:
        raise ValueError("Admin password login is not configured. Set CARE_ADMIN_CREDENTIALS or CARE_ADMIN_PASSWORD.")
    if not settings.verify_admin_password(email_key, password):
        raise ValueError("Incorrect email or password")

    # Resolve only after credentials pass; the UUID must reference auth.users.
    existing = next((item for item in state.get("users", []) if str(item.get("email", "")).lower() == email_key), None)
    external_id = existing["id"] if existing else (resolve_auth_id(email_key) if resolve_auth_id else uid("admin"))
    display = (name or "").strip() or email_key.split("@")[0].replace(".", " ").title()
    return sync_account(
        state,
        {
            "email": email_key,
            "name": display,
            "role": "admin",
            "externalUserId": external_id,
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
        from .media import sanitize_attachment

        conversation = next((item for item in next_state['conversations'] if item['id'] == action['conversationId']), None)
        # Resolve ghost/legacy ids by participant pair so patients can still reply.
        if (not conversation or actor_id not in (conversation.get("participantIds") or [])) and actor_id:
            peer_id = action.get("peerId")
            if peer_id:
                conversation = next(
                    (
                        item
                        for item in next_state["conversations"]
                        if actor_id in (item.get("participantIds") or [])
                        and peer_id in (item.get("participantIds") or [])
                    ),
                    None,
                )
                if conversation:
                    action = {**action, "conversationId": conversation["id"]}
                else:
                    # Auto-open the thread when ENSURE_CONVERSATION never landed
                    # (common after a flaky snapshot) so send does not 400.
                    conv_id = conversation_id_for(actor_id, peer_id)
                    conversation = {
                        "id": conv_id,
                        "participantIds": [actor_id, peer_id],
                        "lastMessage": "",
                        "lastAt": now_iso(),
                        "lastReadAt": {},
                    }
                    next_state["conversations"].append(conversation)
                    action = {**action, "conversationId": conv_id}
        if not conversation or actor_id not in conversation['participantIds']:
            raise ValueError('Conversation not found')
        attachments = action.get('attachments') or []
        clean_attachments = []
        for file in attachments:
            url = file.get('url') or ''
            object_key = file.get('objectKey') or ''
            if url.startswith('data:'):
                raise ValueError('Upload the file first, then attach the stored object key.')
            if len(url) > 14 * 1024 * 1024:
                raise ValueError('Choose a file smaller than 10 MB.')
            if not object_key and not url.startswith(('https://', 'http://')):
                raise ValueError('Attachment content is missing')
            clean = sanitize_attachment(file)
            clean_attachments.append(clean)
            # Message attachments stay on the message only — not patient health files.
        timestamp = now_iso()
        client_id = action.get("messageId") or action.get("id")
        message_id = str(client_id) if client_id and _looks_uuid(str(client_id)) else uid("msg")
        # Idempotent resend / optimistic retry with the same client id.
        existing_msg = next((item for item in next_state["messages"] if item.get("id") == message_id), None)
        if existing_msg:
            return next_state
        message = {
            "id": message_id,
            "conversationId": action["conversationId"],
            "senderId": actor_id,
            "text": action["text"],
            "timestamp": timestamp,
            "attachments": clean_attachments,
            "status": "sent",
            "deliveredAt": None,
            "readAt": None,
        }
        next_state["messages"].append(message)
        for conversation in next_state["conversations"]:
            if conversation["id"] == action["conversationId"]:
                conversation["lastMessage"] = action["text"]
                conversation["lastAt"] = timestamp
        return next_state

    if kind == "MARK_MESSAGE_DELIVERED":
        message_ids = action.get("messageIds") or ([action["messageId"]] if action.get("messageId") else [])
        if not actor_id or not message_ids:
            return next_state
        stamp = now_iso()
        for message in next_state["messages"]:
            if message.get("id") not in message_ids:
                continue
            if message.get("senderId") == actor_id:
                continue
            conversation = next(
                (item for item in next_state["conversations"] if item["id"] == message.get("conversationId")),
                None,
            )
            if not conversation or actor_id not in (conversation.get("participantIds") or []):
                continue
            if message.get("status") in ("delivered", "read"):
                continue
            message["status"] = "delivered"
            message["deliveredAt"] = stamp
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
        if request.get("status") != "pending":
            return next_state
        request["status"] = action["status"]
        if action["status"] == "accepted":
            dietitian = next((item for item in next_state["dietitians"] if item["id"] == request["dietitianId"]), None)
            if dietitian:
                visit_date = next_weekday()
                next_state["appointments"].insert(
                    0,
                    {
                        "id": uid("apt"),
                        "patientId": request["patientId"],
                        "dietitianId": dietitian["id"],
                        "date": visit_date,
                        "time": "14:00",
                        "status": "upcoming",
                        "type": "video",
                        "topic": "New consultation",
                    },
                )
                patient = next((item for item in next_state.get("users") or [] if item.get("id") == request["patientId"]), None)
                notify_admins_of_booking(
                    next_state,
                    patient_name=(patient or {}).get("name") or "A patient",
                    dietitian_name=dietitian.get("name") or "a dietitian",
                    date=visit_date,
                    time="14:00",
                )
        return next_state

    if kind == "UPLOAD_FILE":
        next_state["files"].insert(0, {**action["file"], "id": uid("file")})
        return next_state

    if kind == "DELETE_FILE":
        if not actor:
            raise ValueError("Sign in first")
        file_id = str(action.get("fileId") or "").strip()
        if not file_id:
            raise ValueError("File not found")
        target = next((item for item in next_state.get("files") or [] if item.get("id") == file_id), None)
        if not target:
            raise ValueError("File not found")
        # Only the owning patient (or admin) may delete health files.
        if actor.get("role") != "admin" and target.get("ownerId") != actor_id:
            raise ValueError("You can only delete your own health files.")
        next_state["files"] = [item for item in next_state.get("files") or [] if item.get("id") != file_id]
        return next_state

    if kind == "SUBMIT_APPLICATION":
        if not actor:
            raise ValueError("Sign in first")
        # /dietitian/apply is the registration path — never block on a stale patient role.
        if actor.get("role") != "dietitian":
            actor = {**actor, "role": "dietitian"}
        actor_id = actor["id"]
        # Ensure the actor is present in users so UUID persist filters keep the row.
        users = list(next_state.get("users") or [])
        if any(item.get("id") == actor_id for item in users):
            next_state["users"] = [
                {**item, "role": "dietitian"} if item.get("id") == actor_id else item for item in users
            ]
        else:
            next_state["users"] = [*users, dict(actor)]
        previous = next((item for item in next_state["applications"] if item["userId"] == actor_id), None)
        incoming = action.get("application") or {}
        app_id = previous["id"] if previous else None
        try:
            if app_id:
                uuid.UUID(str(app_id))
            else:
                raise ValueError("missing")
        except (ValueError, TypeError, AttributeError):
            try:
                uuid.UUID(str(incoming.get("id") or ""))
                app_id = str(incoming["id"])
            except (ValueError, TypeError, AttributeError, KeyError):
                app_id = uid("app")
        try:
            years = int(float(incoming.get("yearsExperience") or 0))
        except (TypeError, ValueError, OverflowError):
            years = 0
        if years < 0 or years > 80:
            years = 0
        application = {
            **incoming,
            "id": app_id,
            "userId": actor_id,
            "yearsExperience": years,
            "status": "pending",
            "submittedAt": now_iso(),
            "adminNotes": (previous or {}).get("adminNotes", []),
        }
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
                    "href": notification_href_for(
                        next_state, admin["id"], surface="admin_application", resource_id=application["id"]
                    ),
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
        if not actor or actor.get("role") != "admin":
            raise ValueError("Admin only")
        application = next((item for item in next_state["applications"] if item["id"] == action["applicationId"]), None)
        if not application:
            raise ValueError("Application not found")
        application["status"] = "approved"
        application["adminNotes"] = [*(application.get("adminNotes") or []), f"Approved by {actor_name}"]
        next_state["dietitians"] = upsert_pending_dietitian(next_state["dietitians"], application)
        for dietitian in next_state["dietitians"]:
            if dietitian["userId"] == application["userId"]:
                dietitian["status"] = "approved"
                dietitian["verified"] = True
                dietitian["featured"] = True
        next_state["notifications"].insert(
            0,
            {
                "id": uid("ntf"),
                "userId": application["userId"],
                "kind": "info",
                "title": "You're approved",
                "body": "Your dietitian application was approved. Open your practice to set availability.",
                "href": notification_href_for(next_state, application["userId"], surface="practice_home"),
                "createdAt": now_iso(),
                "read": False,
            },
        )
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
        next_state["notifications"].insert(
            0,
            {
                "id": uid("ntf"),
                "userId": application["userId"],
                "kind": "info",
                "title": "More information needed",
                "body": action.get("message") or "An admin asked for more details on your application.",
                "href": "/dietitian/apply",
                "createdAt": now_iso(),
                "read": False,
            },
        )
        return next_state

    if kind == "DELETE_APPLICATION":
        if not actor or actor.get("role") != "admin":
            raise ValueError("Admin only")
        application_id = action.get("applicationId")
        application = next((item for item in next_state["applications"] if item["id"] == application_id), None)
        user_id = application.get("userId") if application else None
        next_state["applications"] = [
            item for item in next_state["applications"] if item["id"] != application_id
        ]
        if user_id:
            next_state["dietitians"] = [
                item
                for item in next_state["dietitians"]
                if not (item.get("userId") == user_id and item.get("status") != "approved")
            ]
        return next_state

    if kind in {"CANCEL_APPOINTMENT", "DELETE_APPOINTMENT", "COMPLETE_APPOINTMENT"}:
        appointment = next((item for item in next_state["appointments"] if item["id"] == action.get("appointmentId")), None)
        listing = next((item for item in next_state["dietitians"] if appointment and item["id"] == appointment["dietitianId"]), None)
        if not appointment or not actor or (actor.get("role") != "admin" and actor_id not in {appointment["patientId"], (listing or {}).get("userId")}):
            raise ValueError("Appointment not found")
        if kind == "COMPLETE_APPOINTMENT" and appointment.get("status") == "deleted":
            raise ValueError("This appointment has been deleted")

    if kind == "CANCEL_APPOINTMENT":
        for appointment in next_state["appointments"]:
            if appointment["id"] == action["appointmentId"]:
                # Trash / delete from UI → deleted (not completed). Legacy cancel still ok.
                appointment["status"] = action.get("status") or "deleted"
        return next_state

    if kind == "DELETE_APPOINTMENT":
        for appointment in next_state["appointments"]:
            if appointment["id"] == action["appointmentId"]:
                appointment["status"] = "deleted"
        return next_state

    if kind == "DELETE_CONVERSATION":
        conv_id = action.get("conversationId")
        if not actor_id or not conv_id:
            raise ValueError("Conversation not found")
        conversation = next((item for item in next_state["conversations"] if item["id"] == conv_id), None)
        if not conversation or actor_id not in (conversation.get("participantIds") or []):
            raise ValueError("Conversation not found")
        # Hard-delete the thread so it cannot return via pulse (works without hidden_for column).
        next_state["conversations"] = [item for item in next_state["conversations"] if item["id"] != conv_id]
        next_state["messages"] = [item for item in next_state["messages"] if item.get("conversationId") != conv_id]
        return next_state

    if kind == "ADD_APPOINTMENT":
        listing = next((item for item in next_state["dietitians"] if item["id"] == action["dietitianId"]), None)
        if not listing or listing.get("status") != "approved":
            raise ValueError("This dietitian is not available for booking")
        if not actor or action["patientId"] != actor_id:
            raise ValueError("Sign in as the patient to book")
        if any(item["patientId"] == actor_id and item["dietitianId"] == listing["id"] and item["date"] == action["date"] and item["time"] == action["time"] and item["status"] == "upcoming" for item in next_state["appointments"]):
            return next_state
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
        dietitian_user_id = listing.get("userId")
        if dietitian_user_id:
            next_state["notifications"].insert(
                0,
                {
                    "id": uid("ntf"),
                    "userId": dietitian_user_id,
                    "kind": "info",
                    "title": "New appointment booked",
                    "body": f"{actor_name} booked {action['date']} at {action['time']}.",
                    "href": notification_href_for(next_state, dietitian_user_id, surface="appointments"),
                    "createdAt": now_iso(),
                    "read": False,
                },
            )
        next_state["notifications"].insert(
            0,
            {
                "id": uid("ntf"),
                "userId": actor_id,
                "kind": "info",
                "title": "Appointment confirmed",
                "body": f"Your visit with {listing.get('name') or 'your dietitian'} is set for {action['date']} at {action['time']}.",
                "href": notification_href_for(next_state, actor_id, surface="appointments"),
                "createdAt": now_iso(),
                "read": False,
            },
        )
        notify_admins_of_booking(
            next_state,
            patient_name=actor_name,
            dietitian_name=listing.get("name") or "a dietitian",
            date=action["date"],
            time=action["time"],
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
        stamp = now_iso()
        for conversation in next_state["conversations"]:
            if conversation["id"] == action["conversationId"] and actor_id in conversation["participantIds"]:
                conversation["lastReadAt"] = {**(conversation.get("lastReadAt") or {}), actor_id: stamp}
                for message in next_state["messages"]:
                    if message.get("conversationId") != conversation["id"]:
                        continue
                    if message.get("senderId") == actor_id:
                        continue
                    message["status"] = "read"
                    message["readAt"] = stamp
                    if not message.get("deliveredAt"):
                        message["deliveredAt"] = stamp
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
                    value = action[key]
                    if key == "avatar":
                        from .media import storage_key_for_asset

                        value = storage_key_for_asset(value)
                    user[key] = value
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
                    value = action[src]
                    if dest in ("avatar", "coverImage"):
                        from .media import storage_key_for_asset

                        value = storage_key_for_asset(value)
                    listing[dest] = value
        elif account_user and account_user.get("role") == "dietitian":
            from .media import storage_key_for_asset

            stub = {
                # UUID so Supabase upsert + catalog refresh keep cover/avatar.
                "id": uid("dt"),
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
                "avatar": storage_key_for_asset(action.get("avatar") or account_user.get("avatar") or ""),
                "coverImage": storage_key_for_asset(action.get("coverImage") or ""),
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
        if not peer or peer_id == actor_id:
            raise ValueError("Choose another care team member to call")
        conversation = next((item for item in next_state["conversations"] if set(item.get("participantIds") or []) == {actor_id, peer_id}), None)
        if conversation:
            conv_id = conversation["id"]
        else:
            conv_id = conversation_id_for(actor_id, peer_id)
            next_state["conversations"].append({"id": conv_id, "participantIds": [actor_id, peer_id], "lastMessage": "Video call", "lastAt": now_iso(), "lastReadAt": {}})
        # Honor client callId (UUID) so WebRTC signals don't race a server-generated id.
        client_call_id = call.get("callId") or action.get("callId")
        call_id = str(client_call_id) if client_call_id and _looks_uuid(str(client_call_id)) else uid("call")
        next_state["liveCalls"] = [*next_state["liveCalls"],
            {
                "id": call_id,
                "conversationId": conv_id,
                "callerId": actor_id,
                "calleeId": peer_id,
                "callerName": actor_name,
                "callerAvatar": account_avatar(actor, next_state["dietitians"], next_state.get("applications")),
                "calleeName": call.get("peerName") or (peer or {}).get("name") or "Care",
                "calleeAvatar": account_avatar(peer, next_state["dietitians"], next_state.get("applications")),
                "status": "ringing",
                "startedAt": now_iso(),
                "offer": None,
                "answer": None,
                "ice": [],
            }
        ]
        next_state["notifications"].insert(
            0,
            {
                "id": uid("ntf"),
                "userId": peer_id,
                "kind": "info",
                "title": "Incoming video call",
                "body": f"{actor_name} is calling you.",
                "href": notification_href_for(next_state, peer_id, surface="messages", resource_id=conv_id),
                "createdAt": now_iso(),
                "read": False,
            },
        )
        return next_state

    if kind == "ANSWER_CALL":
        for item in next_state.get("liveCalls", []):
            if item["calleeId"] == actor_id and item["status"] == "ringing":
                item["status"] = "live"
                for notification in next_state['notifications']:
                    if notification.get('userId') == actor_id and notification.get('href', '').endswith(item['conversationId']) and notification.get('title') == 'Incoming video call':
                        notification['read'] = True
        return next_state

    if kind == "END_CALL":
        remaining = []
        for item in next_state.get("liveCalls", []):
            if actor_id not in (item["callerId"], item["calleeId"]) or (action.get("callId") and item["id"] != action["callId"]):
                remaining.append(item)
                continue
            for notification in next_state['notifications']:
                if notification.get('userId') == item['calleeId'] and notification.get('title') == 'Incoming video call' and notification.get('href', '').endswith(item['conversationId']):
                    notification['read'] = True
            missed = item['status'] == 'ringing'
            call_text = 'Missed video call' if missed else 'Video call completed (answered)'
            if missed:
                for target, title, body in [
                    (item['calleeId'], 'Missed video call', f"You missed a call from {item['callerName']}."),
                    (item['callerId'], 'Call not answered', f"{item['calleeName']} did not answer your call."),
                ]:
                    next_state['notifications'].insert(0, {
                        'id': uid('notif'), 'userId': target, 'title': title, 'body': body,
                        'href': notification_href_for(
                            next_state, target, surface="messages", resource_id=item["conversationId"]
                        ),
                        'createdAt': now_iso(), 'read': False,
                    })
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
                    "text": call_text,
                    "timestamp": now_iso(),
                    "attachments": [],
                }
            )
            for conversation in next_state["conversations"]:
                if conversation["id"] == item["conversationId"]:
                    conversation["lastMessage"] = call_text
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
    # Replace offer until answered so a recreated peer connection can publish fresh SDP.
    if payload.get("offer") and actor_id == call["callerId"] and not call.get("answer"):
        if call.get("offer") != payload["offer"]:
            call["offer"] = payload["offer"]
            call["ice"] = []
    if payload.get("answer") and actor_id == call["calleeId"] and not call.get("answer"):
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


def expire_ringing_calls(state: Json, now: datetime | None = None) -> Json:
    now = now or datetime.now(timezone.utc)
    for call in list(state.get('liveCalls', [])):
        if call.get('status') != 'ringing':
            continue
        try:
            started = datetime.fromisoformat(call['startedAt'].replace('Z', '+00:00'))
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
        except (KeyError, ValueError):
            continue
        if (now - started).total_seconds() >= 45:
            actor = next((user for user in state['users'] if user['id'] == call['callerId']), None)
            state = apply_action(state, {'type': 'END_CALL', 'callId': call['id']}, actor)
    return state
