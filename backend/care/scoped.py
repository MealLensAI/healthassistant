"""Viewer-scoped care payloads — never ship the whole marketplace JSON."""

from __future__ import annotations

import re
from typing import Any

from .media import sanitize_state

Json = dict[str, Any]

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.I,
)

def _public_credential_docs(documents: list[Json]) -> list[Json]:
    """Metadata patients can see on approved profiles — never embedded file bytes."""
    kind_map = {
        "license": "license",
        "degree": "degree",
        "cv": "cv",
        "resume": "cv",
        "certificate": "cv",
        "certification": "cv",
        "credential": "cv",
        "id": "license",
        "other": "cv",
    }
    out: list[Json] = []
    for doc in documents or []:
        kind = str(doc.get("kind") or "other").lower()
        if kind in {"photo", "cover", "avatar"}:
            continue
        name = doc.get("name") or doc.get("fileName") or kind.replace("_", " ").title()
        mapped = kind_map.get(kind, "cv")
        out.append(
            {
                "id": doc.get("id") or doc.get("objectKey") or name,
                "name": name,
                "fileName": doc.get("fileName") or name,
                "kind": mapped,
                "objectKey": doc.get("objectKey"),
                "bucket": doc.get("bucket"),
                "url": None,
            }
        )
    return out

# Collections the SPA still hydrates from. Keep this list explicit.
STATE_KEYS = (
    "users",
    "dietitians",
    "applications",
    "conversations",
    "messages",
    "appointments",
    "files",
    "consultationRequests",
    "patientProfiles",
    "patientSettings",
    "deviceSessions",
    "paymentMethods",
    "paymentQuotes",
    "payments",
    "missedCalls",
    "notifications",
    "liveCalls",
)

# Lightweight poll — presence, inbox headers, alerts, appointment status. No catalog/message bodies.
PULSE_KEYS = ("users", "conversations", "liveCalls", "notifications", "missedCalls", "appointments")

MESSAGE_PAGE_DEFAULT = 80


def _ids(items: list[Json], key: str = "id") -> set[str]:
    return {str(item.get(key)) for item in items if item.get(key) is not None}


def viewer_scope(state: Json, viewer: Json, *, message_limit: int = MESSAGE_PAGE_DEFAULT) -> Json:
    """Return only rows this viewer may see, with media bytes already stripped.

    Patients/dietitians get their graph. Admins get applications + catalog metadata
    but still never receive embedded file bytes.
    """
    clean = sanitize_state(state, include_documents=viewer.get("role") == "admin")
    viewer_id = str(viewer.get("id") or "")
    role = viewer.get("role")

    conversations = [
        item
        for item in clean.get("conversations") or []
        if (
            role == "admin"
            or (
                viewer_id in (item.get("participantIds") or [])
                and viewer_id not in (item.get("hiddenFor") or item.get("hidden_for") or [])
            )
        )
    ]
    conversation_ids = _ids(conversations)

    messages = [
        item
        for item in clean.get("messages") or []
        if item.get("conversationId") in conversation_ids
    ]
    # Newest page only — clients fetch older pages via /conversations/:id/messages.
    messages = sorted(messages, key=lambda item: item.get("timestamp") or "", reverse=True)[:message_limit]
    messages.reverse()

    if role == "admin":
        dietitians = clean.get("dietitians") or []
        applications = clean.get("applications") or []
        appointments = clean.get("appointments") or []
        files = clean.get("files") or []
        consultation_requests = clean.get("consultationRequests") or []
        patient_profiles = clean.get("patientProfiles") or []
        patient_settings = clean.get("patientSettings") or []
        notifications = clean.get("notifications") or []
        missed = clean.get("missedCalls") or []
        live_calls = clean.get("liveCalls") or []
        users = clean.get("users") or []
    else:
        dietitians = [
            item
            for item in clean.get("dietitians") or []
            if (
                # Own listing (any status) so applicants can edit.
                item.get("userId") == viewer_id
                # Everyone else: admin-approved + verified only.
                or (item.get("status") == "approved" and bool(item.get("verified")))
            )
        ]
        # Public listings expose credential metadata (no private bytes); owners keep full docs.
        dietitians = [
            item
            if item.get("userId") == viewer_id
            else {**item, "documents": _public_credential_docs(item.get("documents") or [])}
            for item in dietitians
        ]
        # Drop non-UUID demo IDs whenever real UUID listings exist (Supabase).
        live = [item for item in dietitians if _UUID_RE.match(str(item.get("id") or ""))]
        if live:
            own = [item for item in dietitians if item.get("userId") == viewer_id]
            dietitians = list({item["id"]: item for item in [*live, *own]}.values())
        applications = [item for item in clean.get("applications") or [] if item.get("userId") == viewer_id]
        # appointment.dietitianId is the listing id, not the user id.
        listing_ids = {item["id"] for item in clean.get("dietitians") or [] if item.get("userId") == viewer_id}
        appointments = [
            item
            for item in clean.get("appointments") or []
            if (
                (item.get("patientId") == viewer_id or item.get("dietitianId") in listing_ids)
                and item.get("status") != "deleted"
            )
        ]
        # Care-team patients: dietitians see files for patients they have a conversation/appointment with.
        care_patient_ids = {
            item.get("patientId")
            for item in appointments
            if item.get("patientId")
        }
        for conv in conversations:
            for pid in conv.get("participantIds") or []:
                if pid != viewer_id:
                    care_patient_ids.add(pid)
        blocked_owners = {item.get("userId") for item in clean.get("patientSettings") or [] if viewer_id in (item.get("blockedFileAccessIds") or [])}
        files = [
            item
            for item in clean.get("files") or []
            if item.get("ownerId") not in blocked_owners and (viewer_id in {item.get("ownerId"), item.get("sharedWithId")}
            or (
                role == "dietitian"
                and item.get("ownerId") in care_patient_ids
                and item.get("ownerId") != viewer_id
            ))
        ]
        # Include care-team patients' block lists so the chart can respect them.
        if role == "dietitian":
            patient_settings = [
                item
                for item in clean.get("patientSettings") or []
                if item.get("userId") == viewer_id or item.get("userId") in care_patient_ids
            ]
        else:
            patient_settings = [item for item in clean.get("patientSettings") or [] if item.get("userId") == viewer_id]
        consultation_requests = [
            item
            for item in clean.get("consultationRequests") or []
            if viewer_id in {item.get("patientId"), item.get("dietitianId")}
            or item.get("dietitianId") in listing_ids
        ]
        patient_profiles = [
            item
            for item in clean.get("patientProfiles") or []
            if item.get("userId") == viewer_id
            or (
                role == "dietitian"
                and item.get("userId") in care_patient_ids
            )
        ]
        notifications = [item for item in clean.get("notifications") or [] if item.get("userId") == viewer_id]
        missed = [item for item in clean.get("missedCalls") or [] if item.get("userId") == viewer_id]
        live_calls = [
            item
            for item in clean.get("liveCalls") or []
            if viewer_id in {item.get("callerId"), item.get("calleeId")}
        ]
        peer_ids = set()
        for conv in conversations:
            peer_ids.update(conv.get("participantIds") or [])
        for call in live_calls:
            peer_ids.update({call.get("callerId"), call.get("calleeId")})
        peer_ids.update(care_patient_ids)
        peer_ids.add(viewer_id)
        for dietitian in dietitians:
            if dietitian.get("userId"):
                peer_ids.add(dietitian["userId"])
        users = [item for item in clean.get("users") or [] if item.get("id") in peer_ids]

    device_sessions = [item for item in clean.get("deviceSessions") or [] if item.get("userId") == viewer_id]
    # Care payments stay empty — real billing is MealLens Paystack, not mp_*.
    return {
        "users": users,
        "dietitians": dietitians,
        "applications": applications,
        "conversations": conversations,
        "messages": messages,
        "appointments": appointments,
        "files": files,
        "consultationRequests": consultation_requests,
        "patientProfiles": patient_profiles,
        "patientSettings": patient_settings,
        "deviceSessions": device_sessions,
        "paymentMethods": [],
        "paymentQuotes": [],
        "payments": [],
        "missedCalls": missed,
        "notifications": notifications,
        "liveCalls": live_calls,
    }


def pulse_scope(state: Json, viewer: Json) -> Json:
    """Cheap presence/inbox poll — deliberately tiny."""
    scoped = viewer_scope(state, viewer, message_limit=0)
    return {key: scoped.get(key) or [] for key in PULSE_KEYS}


def changed_collections(before: Json, after: Json) -> tuple[str, ...]:
    changed = []
    for key in STATE_KEYS:
        if (before.get(key) or []) != (after.get(key) or []):
            changed.append(key)
    return tuple(changed)


def action_patch(before: Json, after: Json, viewer: Json) -> Json:
    """Return only viewer-visible rows for collections the action touched."""
    keys = changed_collections(before, after)
    scoped_after = viewer_scope(after, viewer)
    if not keys:
        return {}
    patch = {key: scoped_after.get(key) or [] for key in keys if key in scoped_after}
    if "appointments" in keys:
        # Include tombstones so the caller removes a deleted appointment immediately.
        visible_before = {item["id"] for item in viewer_scope(before, viewer).get("appointments", [])}
        patch["appointments"] = [*patch.get("appointments", []), *[item for item in after.get("appointments", []) if item.get("status") == "deleted" and item["id"] in visible_before]]
    return patch


def merge_by_id(existing: list[Json], incoming: list[Json], *, id_key: str = "id") -> list[Json]:
    """Upsert helper for clients applying patches."""
    by_id = {str(item.get(id_key)): item for item in existing if item.get(id_key) is not None}
    order = [str(item.get(id_key)) for item in existing if item.get(id_key) is not None]
    for item in incoming:
        marker = str(item.get(id_key)) if item.get(id_key) is not None else None
        if marker is None:
            continue
        if marker not in by_id:
            order.append(marker)
        by_id[marker] = item
    return [by_id[marker] for marker in order if marker in by_id]
