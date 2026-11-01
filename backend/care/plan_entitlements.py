"""Patient marketplace plan entitlements (Bronze / Silver / Gold).

Dietitian-invite / enterprise membership is a separate product and is not
enforced here. In-memory care tests skip live subscription lookup.
"""

from __future__ import annotations

import os
from typing import Any

Json = dict[str, Any]

OPEN: Json = {
    "tier": "open",
    "marketplace_access": True,
    "max_dietitians": -1,
    "consultations": -1,
    "follow_ups": -1,
}

FREE: Json = {
    "tier": "free",
    "marketplace_access": False,
    "max_dietitians": 0,
    "consultations": 0,
    "follow_ups": 0,
}

BRONZE: Json = {
    "tier": "bronze",
    "marketplace_access": False,
    "max_dietitians": 0,
    "consultations": 0,
    "follow_ups": 0,
}

SILVER: Json = {
    "tier": "silver",
    "marketplace_access": True,
    "max_dietitians": -1,
    "consultations": 1,
    "follow_ups": 2,
}

GOLD: Json = {
    "tier": "gold",
    "marketplace_access": True,
    "max_dietitians": -1,
    "consultations": 1,
    "follow_ups": 6,
}

_COUNTABLE_STATUSES = {"upcoming", "completed"}


def normalize_plan_name(plan_name: str | None) -> str:
    raw = (plan_name or "").strip().lower()
    if not raw or raw in {"unknown", "none", "plan"}:
        return "free"
    if "gold" in raw:
        return "gold"
    if "bronze" in raw or "$10" in raw:
        return "bronze"
    if "silver" in raw:
        return "silver"
    # Legacy duration SKUs: paid AI + marketplace (grandfather as Silver,
    # longer terms as Gold so existing subscribers keep care access).
    if any(token in raw for token in ("six_month", "six month", "$120", "yearly", "1 year", "$240")):
        return "gold"
    if any(token in raw for token in ("monthly", "1 month", "$20")):
        return "silver"
    return "free"


def entitlements_for_plan(plan_name: str | None) -> Json:
    tier = normalize_plan_name(plan_name)
    return {
        "free": FREE,
        "bronze": BRONZE,
        "silver": SILVER,
        "gold": GOLD,
    }.get(tier, FREE).copy()


def _unlimited(value: int) -> bool:
    return value < 0


def infer_visit_kind(topic: str | None, stored: str | None = None) -> str:
    if stored in {"consultation", "follow_up"}:
        return stored
    text = (topic or "").strip().lower()
    if text.startswith("follow-up") or text.startswith("follow up") or "follow-up" in text:
        return "follow_up"
    return "consultation"


def countable_patient_appointments(state: Json, patient_id: str) -> list[Json]:
    return [
        item
        for item in (state.get("appointments") or [])
        if item.get("patientId") == patient_id and item.get("status") in _COUNTABLE_STATUSES
    ]


def appointment_usage(state: Json, patient_id: str) -> Json:
    rows = countable_patient_appointments(state, patient_id)
    consultations = 0
    follow_ups = 0
    dietitian_ids: list[str] = []
    seen: set[str] = set()
    for item in rows:
        kind = infer_visit_kind(item.get("topic"), item.get("visitKind") or item.get("visit_kind"))
        if kind == "follow_up":
            follow_ups += 1
        else:
            consultations += 1
        listing_id = str(item.get("dietitianId") or "")
        if listing_id and listing_id not in seen:
            seen.add(listing_id)
            dietitian_ids.append(listing_id)
    next_kind = "consultation" if consultations == 0 else "follow_up"
    return {
        "consultations": consultations,
        "follow_ups": follow_ups,
        "dietitian_ids": dietitian_ids,
        "next_kind": next_kind,
    }


def listing_id_for_user(state: Json, user_id: str | None) -> str | None:
    if not user_id:
        return None
    listing = next((item for item in (state.get("dietitians") or []) if item.get("userId") == user_id), None)
    return str(listing["id"]) if listing and listing.get("id") else None


def patient_plan_entitlements(user_id: str | None) -> Json:
    """Look up live entitlements. Memory-store tests stay open so existing care API tests pass."""
    if not user_id:
        return FREE.copy()
    if (os.getenv("CARE_MEMORY_STORE") or "").strip().lower() in {"1", "true", "yes"}:
        return OPEN.copy()
    try:
        from services.subscription_service import SubscriptionService

        status = SubscriptionService().get_user_subscription_status(user_id)
        data = (status or {}).get("data") or {}
        if data.get("entitlements"):
            return dict(data["entitlements"])
        subscription = data.get("subscription") or {}
        if not data.get("has_active_subscription"):
            return FREE.copy()
        return entitlements_for_plan(subscription.get("plan_name"))
    except Exception:
        return FREE.copy()


def assert_patient_can_use_marketplace(
    state: Json,
    actor: Json | None,
    *,
    listing_id: str | None,
    kind: str,
) -> Json:
    """Raise ValueError when a patient is not allowed to book / message / call."""
    if not actor or actor.get("role") != "patient":
        return OPEN.copy()
    entitlements = patient_plan_entitlements(actor.get("id"))
    if not entitlements.get("marketplace_access"):
        tier = entitlements.get("tier") or "free"
        if tier == "bronze":
            raise ValueError("Bronze includes AI tools only. Upgrade to Silver or Gold to book a dietitian.")
        raise ValueError("Marketplace access requires a Silver or Gold plan.")
    if kind == "SEND_MESSAGE":
        return entitlements
    if kind not in {"ADD_APPOINTMENT", "START_CALL"}:
        return entitlements
    if kind == "START_CALL" and _has_reserved_visit(state, actor["id"], listing_id):
        return entitlements
    usage = appointment_usage(state, actor["id"])
    consult_cap = int(entitlements.get("consultations") or 0)
    follow_cap = int(entitlements.get("follow_ups") or 0)
    next_kind = usage["next_kind"]
    if next_kind == "consultation" and not _unlimited(consult_cap) and usage["consultations"] >= consult_cap:
        raise ValueError("You have used the consultation included in your plan. Upgrade to continue.")
    if next_kind == "follow_up" and not _unlimited(follow_cap) and usage["follow_ups"] >= follow_cap:
        raise ValueError("You have used the follow-up calls included in your plan. Upgrade to Gold for six follow-ups.")
    return entitlements


def _has_reserved_visit(state: Json, patient_id: str, listing_id: str | None) -> bool:
    if not listing_id:
        return False
    return any(
        item.get("patientId") == patient_id
        and item.get("dietitianId") == listing_id
        and item.get("status") == "upcoming"
        for item in (state.get("appointments") or [])
    )
