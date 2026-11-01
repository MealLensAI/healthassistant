import pytest

from care.plan_entitlements import (
    BRONZE,
    GOLD,
    SILVER,
    appointment_usage,
    assert_patient_can_use_marketplace,
    entitlements_for_plan,
    infer_visit_kind,
    normalize_plan_name,
)


def test_plan_name_mapping():
    assert normalize_plan_name("Bronze") == "bronze"
    assert normalize_plan_name("$10 Bronze") == "bronze"
    assert normalize_plan_name("silver") == "silver"
    assert normalize_plan_name("$20 Monthly") == "silver"
    assert normalize_plan_name("Gold") == "gold"
    assert normalize_plan_name("$120 Six Months") == "gold"
    assert normalize_plan_name(None) == "free"


def test_entitlements_split_marketplace_from_ai():
    bronze = entitlements_for_plan("bronze")
    silver = entitlements_for_plan("silver")
    gold = entitlements_for_plan("gold")
    assert bronze["marketplace_access"] is False
    assert silver["marketplace_access"] is True
    assert silver["consultations"] == 1
    assert silver["follow_ups"] == 2
    assert gold["follow_ups"] == 6
    assert gold["max_dietitians"] == 1
    assert gold["consultations"] + gold["follow_ups"] == 7


def test_first_visit_is_consultation_then_follow_ups():
    state = {
        "appointments": [
            {
                "patientId": "pat",
                "dietitianId": "doc",
                "status": "upcoming",
                "topic": "Initial consultation with Ada",
                "visitKind": "consultation",
            }
        ]
    }
    usage = appointment_usage(state, "pat")
    assert usage["consultations"] == 1
    assert usage["follow_ups"] == 0
    assert usage["next_kind"] == "follow_up"
    assert infer_visit_kind("Follow-up with Ada") == "follow_up"


def test_bronze_cannot_use_marketplace(monkeypatch):
    monkeypatch.setattr("care.plan_entitlements.patient_plan_entitlements", lambda _uid: BRONZE.copy())
    actor = {"id": "pat", "role": "patient"}
    with pytest.raises(ValueError, match="Bronze"):
        assert_patient_can_use_marketplace({}, actor, listing_id="doc", kind="ADD_APPOINTMENT")


def test_silver_blocks_fourth_appointment_and_second_dietitian(monkeypatch):
    monkeypatch.setattr("care.plan_entitlements.patient_plan_entitlements", lambda _uid: SILVER.copy())
    actor = {"id": "pat", "role": "patient"}
    state = {
        "appointments": [
            {"patientId": "pat", "dietitianId": "doc-a", "status": "upcoming", "visitKind": "consultation", "topic": "Initial consultation"},
            {"patientId": "pat", "dietitianId": "doc-a", "status": "upcoming", "visitKind": "follow_up", "topic": "Follow-up 1"},
            {"patientId": "pat", "dietitianId": "doc-a", "status": "completed", "visitKind": "follow_up", "topic": "Follow-up 2"},
        ]
    }
    with pytest.raises(ValueError, match="follow-up"):
        assert_patient_can_use_marketplace(state, actor, listing_id="doc-a", kind="ADD_APPOINTMENT")
    with pytest.raises(ValueError, match="one dietitian"):
        assert_patient_can_use_marketplace(state, actor, listing_id="doc-b", kind="START_CALL")


def test_gold_allows_seven_visits(monkeypatch):
    monkeypatch.setattr("care.plan_entitlements.patient_plan_entitlements", lambda _uid: GOLD.copy())
    actor = {"id": "pat", "role": "patient"}
    rows = [
        {"patientId": "pat", "dietitianId": "doc-a", "status": "upcoming", "visitKind": "consultation", "topic": "Consult"},
    ]
    rows.extend(
        {
            "patientId": "pat",
            "dietitianId": "doc-a",
            "status": "upcoming",
            "visitKind": "follow_up",
            "topic": f"Follow-up {index}",
        }
        for index in range(5)
    )
    state = {"appointments": rows}
    # 1 consult + 5 follow-ups already used; sixth follow-up is still allowed.
    assert_patient_can_use_marketplace(state, actor, listing_id="doc-a", kind="ADD_APPOINTMENT")
    rows.append(
        {"patientId": "pat", "dietitianId": "doc-a", "status": "upcoming", "visitKind": "follow_up", "topic": "Follow-up 6"}
    )
    with pytest.raises(ValueError, match="follow-up"):
        assert_patient_can_use_marketplace(state, actor, listing_id="doc-a", kind="ADD_APPOINTMENT")
