"""Care marketplace API tests — Flask blueprint only (no full app bootstrap)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from flask import Flask

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ["CARE_MEMORY_STORE"] = "true"

from care.db import get_store  # noqa: E402
from routes.care_routes import care_bp  # noqa: E402


@pytest.fixture()
def client():
    import care.db as care_db

    care_db._store = None
    os.environ["CARE_MEMORY_STORE"] = "true"
    get_store().reset()

    app = Flask(__name__)
    app.register_blueprint(care_bp, url_prefix="/api/care")
    app.config["TESTING"] = True
    return app.test_client()


def _register_patient(client, email="patient@care.test", name="Pat Patient"):
    return client.post(
        "/api/care/auth/register",
        json={"name": name, "email": email, "phone": "555-0100", "country": "Nigeria", "role": "patient"},
    ).get_json()["user"]


def _register_and_approve_dietitian(client, email="doc@care.test", name="Dr. Approved"):
    created = client.post(
        "/api/care/auth/register-doctor",
        json={"name": name, "email": email, "phone": "555-0200", "country": "Nigeria"},
    ).get_json()
    user_id = created["user"]["id"]
    submitted = client.post(
        "/api/care/actions",
        headers={"X-User-Id": user_id},
        json={
            "type": "SUBMIT_APPLICATION",
            "payload": {
                "application": {
                    "id": f"app-{user_id[:8]}",
                    "userId": user_id,
                    "fullName": name,
                    "email": email,
                    "phone": "555-0200",
                    "country": "Nigeria",
                    "yearsExperience": 5,
                    "bio": "Clinical dietitian.",
                    "specialties": ["Diabetes"],
                    "workplace": "Test Clinic",
                    "languages": ["English"],
                    "education": [{"school": "Test Uni", "degree": "MSc", "year": "2018"}],
                    "experience": [{"role": "Dietitian", "org": "Test Clinic", "years": "Current"}],
                    "documents": [
                        {"kind": "photo", "name": "Photo", "fileName": "photo.jpg", "uploaded": True, "url": ""},
                        {"kind": "license", "name": "License", "fileName": "license.pdf", "uploaded": True, "objectKey": f"{user_id}/license.pdf", "bucket": "private"},
                    ],
                    "status": "pending",
                    "submittedAt": "2026-09-16T12:00:00.000Z",
                    "adminNotes": [],
                }
            },
        },
    ).get_json()
    patch = submitted.get("patch") or submitted
    app_id = next(item["id"] for item in patch["applications"] if item["userId"] == user_id)
    approved = client.post(
        f"/api/care/applications/{app_id}/approve",
        headers={"X-User-Id": "user-admin"},
    ).get_json()
    approved_patch = approved.get("patch") or approved
    listing = next(item for item in approved_patch["dietitians"] if item["userId"] == user_id)
    return created["user"], listing


def _ensure_conversation(client, patient_id: str, dietitian_user_id: str, dietitian_name: str):
    response = client.post(
        "/api/care/actions",
        headers={"X-User-Id": patient_id},
        json={
            "type": "ENSURE_CONVERSATION",
            "payload": {
                "patientId": patient_id,
                "dietitianUserId": dietitian_user_id,
                "dietitianName": dietitian_name,
            },
        },
    )
    assert response.status_code == 200
    state = get_store().snapshot()
    return next(
        item
        for item in state["conversations"]
        if patient_id in item["participantIds"] and dietitian_user_id in item["participantIds"]
    )


def test_health_and_demo_accounts(client):
    health = client.get("/api/care/health").get_json()
    assert health["ok"] is True
    accounts = client.get("/api/care/demo-accounts").get_json()
    ids = {item["userId"] for item in accounts}
    assert "user-sarah" in ids
    assert "user-admin" in ids
    assert "user-emily" not in ids
    assert "user-marcus" not in ids


def test_new_patient_onboarding_creates_profile(client):
    _register_and_approve_dietitian(client)
    created = client.post(
        "/api/care/auth/register",
        json={
            "name": "Nora Adeyemi",
            "email": "nora@care.test",
            "phone": "555-0199",
            "country": "Nigeria",
            "role": "patient",
            "profile": {
                "conditions": [{"name": "Diabetes", "diagnosed": "", "physician": "", "clinic": ""}],
                "allergies": ["Peanuts"],
                "dietPreferences": ["Steady blood sugar"],
            },
        },
    ).get_json()
    user = created["user"]
    assert user["role"] == "patient"
    assert user["avatar"] == ""
    state = client.get("/api/care/state", headers={"X-User-Id": user["id"]}).get_json()
    assert any(item["status"] == "approved" and item.get("verified") for item in state["dietitians"])
    profile = next(item for item in state["patientProfiles"] if item["userId"] == user["id"])
    assert profile["conditions"][0]["name"] == "Diabetes"
    assert "Peanuts" in profile["allergies"]


def test_new_doctor_signup_is_hidden_until_admin_approves(client):
    created = client.post(
        "/api/care/auth/register-doctor",
        json={"name": "Dr. Amina Okoro", "email": "amina@clinic.test", "phone": "555-0100", "country": "Nigeria"},
    ).get_json()
    user_id = created["user"]["id"]
    assert created["user"]["role"] == "dietitian"

    headers = {"X-User-Id": user_id}
    submitted = client.post(
        "/api/care/actions",
        headers=headers,
        json={
            "type": "SUBMIT_APPLICATION",
            "payload": {
                "application": {
                    "id": "app-amina",
                    "userId": user_id,
                    "fullName": "Dr. Amina Okoro",
                    "email": "amina@clinic.test",
                    "phone": "555-0100",
                    "country": "Nigeria",
                    "yearsExperience": 8,
                    "bio": "Clinical dietitian focused on diabetes education.",
                    "specialties": ["Diabetes"],
                    "workplace": "Lagos Clinic",
                    "languages": ["English"],
                    "education": [{"school": "University of Lagos", "degree": "MSc Nutrition", "year": "2016"}],
                    "experience": [{"role": "Dietitian", "org": "Lagos Clinic", "years": "Current"}],
                    "documents": [
                        {"kind": "photo", "name": "Profile Photo", "fileName": "amina.jpg", "uploaded": True, "url": ""},
                        {
                            "kind": "license",
                            "name": "Practice License",
                            "fileName": "amina-license.pdf",
                            "uploaded": True,
                            "objectKey": f"{user_id}/license.pdf",
                            "bucket": "private",
                        },
                    ],
                    "status": "pending",
                    "submittedAt": "2026-09-16T12:00:00.000Z",
                    "adminNotes": [],
                }
            },
        },
    ).get_json()
    patch = submitted.get("patch") or submitted
    pending = [item for item in patch["dietitians"] if item["userId"] == user_id]
    assert pending and pending[0]["status"] == "pending"
    patient_visible = [item for item in patch["dietitians"] if item.get("status") == "approved"]
    assert all(item["userId"] != user_id for item in patient_visible)

    admin = {"X-User-Id": "user-admin"}
    approved = client.post(
        f"/api/care/applications/{next(item['id'] for item in patch['applications'] if item['userId'] == user_id)}/approve",
        headers=admin,
    ).get_json()
    approved_patch = approved.get("patch") or approved
    listing = next(item for item in approved_patch["dietitians"] if item["userId"] == user_id)
    assert listing["status"] == "approved"
    assert listing.get("verified") is True


def test_auth_sync_promotes_allowlisted_admin_email(client):
    synced = client.post(
        "/api/care/auth/sync",
        json={
            "externalUserId": "supabase-admin-001",
            "email": "admin@healthyyou.com",
            "name": "Platform Admin",
            "role": "admin",
        },
    ).get_json()
    assert synced["user"]["role"] == "admin"
    again = client.post(
        "/api/care/auth/sync",
        json={
            "externalUserId": "supabase-admin-001",
            "email": "admin@healthyyou.com",
            "name": "Platform Admin",
            "role": "dietitian",
        },
    ).get_json()
    assert again["user"]["role"] == "admin"
    assert again["user"]["id"] == synced["user"]["id"]


def test_admin_password_login(client, monkeypatch):
    monkeypatch.setenv(
        "CARE_ADMIN_CREDENTIALS",
        "admin@healthyyou.com:test-admin-secret,ops@meallensai.com:other-secret",
    )
    denied = client.post(
        "/api/care/auth/admin-login",
        json={"email": "admin@healthyyou.com", "password": "wrong"},
    )
    assert denied.status_code == 401

    ok = client.post(
        "/api/care/auth/admin-login",
        json={"email": "admin@healthyyou.com", "password": "test-admin-secret"},
    )
    assert ok.status_code == 200
    body = ok.get_json()
    assert body["user"]["role"] == "admin"
    assert body["user"]["email"] == "admin@healthyyou.com"
    assert body["token"] == body["user"]["id"]

    other = client.post(
        "/api/care/auth/admin-login",
        json={"email": "ops@meallensai.com", "password": "other-secret", "name": "Ops Lead"},
    ).get_json()
    assert other["user"]["role"] == "admin"
    assert other["user"]["name"] == "Ops Lead"


def test_admin_password_login_requires_config(client, monkeypatch):
    monkeypatch.delenv("CARE_ADMIN_CREDENTIALS", raising=False)
    monkeypatch.delenv("CARE_ADMIN_PASSWORD", raising=False)
    monkeypatch.setenv("CARE_ADMIN_EMAILS", "admin@healthyyou.com")
    missing = client.post(
        "/api/care/auth/admin-login",
        json={"email": "admin@healthyyou.com", "password": "anything"},
    )
    assert missing.status_code == 400


def test_pending_dietitian_cannot_message_patients(client):
    patient = _register_patient(client)
    pending = client.post(
        "/api/care/auth/register-doctor",
        json={"name": "Dr. Pending", "email": "pending@clinic.test", "phone": "555-0300", "country": "Nigeria"},
    ).get_json()["user"]
    # Create a conversation row the pending dietitian somehow joins — marketplace gate must still block send.
    state = get_store().snapshot()
    from care.service import conversation_id_for, now_iso

    conv_id = conversation_id_for(patient["id"], pending["id"])
    state["conversations"].append(
        {
            "id": conv_id,
            "participantIds": [patient["id"], pending["id"]],
            "lastMessage": "",
            "lastAt": now_iso(),
            "lastReadAt": {},
        }
    )
    get_store().replace(state)
    blocked = client.post(
        "/api/care/messages",
        headers={"X-User-Id": pending["id"]},
        json={"conversationId": conv_id, "text": "Hello from pending"},
    )
    assert blocked.status_code == 400


def test_auth_sync_links_main_app_user_by_email(client):
    synced = client.post(
        "/api/care/auth/sync",
        json={
            "externalUserId": "supabase-user-001",
            "email": "merged.patient@meallens.test",
            "name": "Merged Patient",
            "role": "patient",
        },
    ).get_json()
    assert synced["user"]["email"] == "merged.patient@meallens.test"
    again = client.post(
        "/api/care/auth/sync",
        json={
            "externalUserId": "supabase-user-001",
            "email": "merged.patient@meallens.test",
            "name": "Merged Patient",
        },
    ).get_json()
    assert again["user"]["id"] == synced["user"]["id"]


def test_patient_can_message_and_doctor_sees_it(client):
    patient = _register_patient(client)
    doctor, listing = _register_and_approve_dietitian(client)
    conv = _ensure_conversation(client, patient["id"], doctor["id"], listing["name"])
    sent = client.post(
        "/api/care/messages",
        headers={"X-User-Id": patient["id"]},
        json={"conversationId": conv["id"], "text": "Can we move Thursday?"},
    ).get_json()
    patch = sent.get("patch") or sent
    assert patch["messages"][-1]["text"] == "Can we move Thursday?"
    doctor_state = client.get("/api/care/state", headers={"X-User-Id": doctor["id"]}).get_json()
    assert doctor_state["messages"][-1]["text"] == "Can we move Thursday?"


def test_attachment_and_health_file_persist_together(client):
    patient = _register_patient(client)
    doctor, listing = _register_and_approve_dietitian(client)
    conv = _ensure_conversation(client, patient["id"], doctor["id"], listing["name"])
    attachment = {
        "name": "report.pdf",
        "type": "application/pdf",
        "size": "12 B",
        "objectKey": f"{patient['id']}/report.pdf",
        "bucket": "meallens-care-private",
        "sizeBytes": 12,
    }
    response = client.post(
        "/api/care/actions",
        headers={"X-User-Id": patient["id"]},
        json={
            "type": "SEND_MESSAGE",
            "payload": {"conversationId": conv["id"], "text": "Report", "attachments": [attachment]},
        },
    )
    assert response.status_code == 200
    state = client.get("/api/care/state", headers={"X-User-Id": doctor["id"]}).get_json()
    saved = state["messages"][-1]["attachments"][0]
    assert saved["objectKey"] == attachment["objectKey"]
    assert "data:" not in (saved.get("url") or "")
    # Chat attachments must not appear in patient health files.
    assert not any(file.get("name") == "report.pdf" for file in state["files"])


def test_patient_can_delete_own_health_file(client):
    patient = _register_patient(client)
    other = _register_patient(client, email="other@care.test", name="Other Patient")
    uploaded = client.post(
        "/api/care/files",
        headers={"X-User-Id": patient["id"]},
        json={
            "name": "labs.pdf",
            "category": "labs",
            "size": "4 KB",
            "objectKey": f"{patient['id']}/labs.pdf",
            "bucket": "meallens-care-private",
            "mimeType": "application/pdf",
            "sizeBytes": 4096,
        },
    )
    assert uploaded.status_code == 200
    patch = uploaded.get_json().get("patch") or uploaded.get_json()
    file_id = next(item["id"] for item in patch["files"] if item["name"] == "labs.pdf")

    denied = client.delete(f"/api/care/files/{file_id}", headers={"X-User-Id": other["id"]})
    assert denied.status_code == 400

    deleted = client.delete(f"/api/care/files/{file_id}", headers={"X-User-Id": patient["id"]})
    assert deleted.status_code == 200
    state = client.get("/api/care/state", headers={"X-User-Id": patient["id"]}).get_json()
    assert not any(item.get("id") == file_id for item in state["files"])


def test_attachment_rejects_missing_content_without_saving_message(client):
    patient = _register_patient(client)
    doctor, listing = _register_and_approve_dietitian(client)
    conv = _ensure_conversation(client, patient["id"], doctor["id"], listing["name"])
    before = len(get_store().snapshot()["messages"])
    response = client.post(
        "/api/care/messages",
        headers={"X-User-Id": patient["id"]},
        json={"conversationId": conv["id"], "text": "Report", "attachments": [{"name": "report.pdf"}]},
    )
    assert response.status_code == 400
    assert len(get_store().snapshot()["messages"]) == before


def test_avatar_sync_visible_to_dietitian_and_preserves_newer_care_photo(client):
    payload = {
        "externalUserId": "external-patient",
        "email": "photo@care.test",
        "name": "Patient",
        "avatar": "patients/external-patient/avatar.png",
    }
    user = client.post("/api/care/auth/sync", json=payload).get_json()["user"]
    assert user["avatar"] == "patients/external-patient/avatar.png"
    client.post(
        "/api/care/actions",
        headers={"X-User-Id": user["id"]},
        json={"type": "UPDATE_ACCOUNT", "payload": {"userId": user["id"], "avatar": "patients/external-patient/new-photo.png"}},
    )
    assert client.post("/api/care/auth/sync", json=payload).get_json()["user"]["avatar"] == "patients/external-patient/new-photo.png"


def start_test_call(client):
    patient = _register_patient(client, email="caller-patient@care.test")
    doctor, listing = _register_and_approve_dietitian(client, email="caller-doc@care.test")
    conv = _ensure_conversation(client, patient["id"], doctor["id"], listing["name"])
    response = client.post(
        "/api/care/actions",
        headers={"X-User-Id": doctor["id"]},
        json={
            "type": "START_CALL",
            "payload": {
                "call": {
                    "conversationId": conv["id"],
                    "peerId": patient["id"],
                    "peerName": patient["name"],
                }
            },
        },
    )
    assert response.status_code == 200
    body = response.get_json()
    patch = body.get("patch") or body
    return patch["liveCalls"][0], patient, doctor


def test_unanswered_call_expires_once_and_notifies_both_participants(client):
    from datetime import datetime, timedelta, timezone

    call, patient, doctor = start_test_call(client)
    state = get_store().snapshot()
    next(item for item in state["liveCalls"] if item["id"] == call["id"])["startedAt"] = (
        datetime.now(timezone.utc) - timedelta(seconds=46)
    ).isoformat()
    get_store().replace(state)
    result = client.get("/api/care/state", headers={"X-User-Id": patient["id"]}).get_json()
    assert not result["liveCalls"]
    assert result["messages"][-1]["text"] == "Missed video call"
    assert any(item["title"] == "Missed video call" and item["userId"] == patient["id"] for item in result["notifications"])
    doctor_state = client.get("/api/care/state", headers={"X-User-Id": doctor["id"]}).get_json()
    assert any(item["title"] == "Call not answered" and item["userId"] == doctor["id"] for item in doctor_state["notifications"])
    again = client.get("/api/care/state", headers={"X-User-Id": patient["id"]}).get_json()
    assert len(again["missedCalls"]) == len(result["missedCalls"])
    assert len(again["messages"]) == len(result["messages"])


def test_answered_call_is_recorded_without_missed_call(client):
    call, patient, doctor = start_test_call(client)
    before = len(get_store().snapshot()["missedCalls"])
    answered = client.post(
        "/api/care/actions",
        headers={"X-User-Id": patient["id"]},
        json={"type": "ANSWER_CALL", "payload": {}},
    ).get_json()
    answered_patch = answered.get("patch") or answered
    assert answered_patch["liveCalls"][0]["status"] == "live"
    ended = client.post(
        "/api/care/actions",
        headers={"X-User-Id": doctor["id"]},
        json={"type": "END_CALL", "payload": {}},
    ).get_json()
    ended_patch = ended.get("patch") or ended
    assert ended_patch["messages"][-1]["text"] == "Video call completed (answered)"
    assert "missedCalls" not in ended_patch or len(ended_patch.get("missedCalls") or []) == before


@pytest.mark.parametrize("hangup_role", ["patient", "dietitian"])
def test_hangup_notifies_both_participants_and_clears_their_calls(client, hangup_role):
    from care.realtime import subscribe, unsubscribe, wait_event

    call, patient, doctor = start_test_call(client)
    assert client.post(
        "/api/care/actions", headers={"X-User-Id": patient["id"]},
        json={"type": "ANSWER_CALL", "payload": {}},
    ).status_code == 200
    viewers = [patient["id"], doctor["id"], "unrelated-viewer"]
    queues = {viewer: subscribe(viewer) for viewer in viewers}
    actor = patient if hangup_role == "patient" else doctor
    try:
        result = client.post(
            "/api/care/actions", headers={"X-User-Id": actor["id"]},
            json={"type": "END_CALL", "payload": {"callId": call["id"]}},
        )
        assert result.status_code == 200
        for viewer in viewers[:2]:
            event = wait_event(queues[viewer], timeout=0)
            assert event["type"] == "call_ended"
            assert event["data"] == {"callId": call["id"]}
            pulse = client.get("/api/care/pulse", headers={"X-User-Id": viewer}).get_json()
            assert all(item["id"] != call["id"] for item in pulse["liveCalls"])
            assert client.get(f"/api/care/calls/{call['id']}", headers={"X-User-Id": viewer}).status_code == 404
        assert wait_event(queues["unrelated-viewer"], timeout=0) is None
        assert not any(item.get("peerId") == doctor["id"] for item in get_store().snapshot()["missedCalls"])
        # Duplicate terminal requests must not create another event/history entry.
        history_before = len(get_store().snapshot()["messages"])
        client.post(
            "/api/care/actions", headers={"X-User-Id": actor["id"]},
            json={"type": "END_CALL", "payload": {"callId": call["id"]}},
        )
        assert len(get_store().snapshot()["messages"]) == history_before
        assert wait_event(queues[patient["id"]], timeout=0) is None
    finally:
        for viewer, queue in queues.items():
            unsubscribe(viewer, queue)


def test_read_marker_survives_reload_and_new_message_remains_unread(client):
    patient = _register_patient(client)
    doctor, listing = _register_and_approve_dietitian(client)
    conv = _ensure_conversation(client, patient["id"], doctor["id"], listing["name"])
    client.post(
        "/api/care/actions",
        headers={"X-User-Id": patient["id"]},
        json={"type": "MARK_CONVERSATION_READ", "payload": {"conversationId": conv["id"], "userId": patient["id"]}},
    )
    state = client.get("/api/care/state", headers={"X-User-Id": patient["id"]}).get_json()
    conversation = next(item for item in state["conversations"] if item["id"] == conv["id"])
    read_at = conversation["lastReadAt"][patient["id"]]
    client.post(
        "/api/care/messages",
        headers={"X-User-Id": doctor["id"]},
        json={"conversationId": conv["id"], "text": "New message"},
    )
    state = client.get("/api/care/state", headers={"X-User-Id": patient["id"]}).get_json()
    assert state["messages"][-1]["timestamp"] > read_at


def test_parallel_call_signals_do_not_overwrite_each_other(client):
    from concurrent.futures import ThreadPoolExecutor

    call, patient, doctor = start_test_call(client)

    def send_candidate(index):
        with client.application.test_client() as connection:
            response = connection.post(
                f"/api/care/calls/{call['id']}/signal",
                headers={"X-User-Id": doctor["id"]},
                json={
                    "ice": {
                        "id": f"candidate-{index}",
                        "fromId": doctor["id"],
                        "candidate": {"candidate": f"candidate:{index}"},
                    }
                },
            )
            assert response.status_code == 200

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(send_candidate, range(12)))
    signal = client.get(f"/api/care/calls/{call['id']}", headers={"X-User-Id": patient["id"]}).get_json()
    assert {item["id"] for item in signal["ice"]} == {f"candidate-{index}" for index in range(12)}


def test_chat_attachment_survives_json_database_round_trip(client, tmp_path):
    from care.db import JsonStore

    patient = _register_patient(client)
    doctor, listing = _register_and_approve_dietitian(client)
    conv = _ensure_conversation(client, patient["id"], doctor["id"], listing["name"])
    client.post(
        "/api/care/messages",
        headers={"X-User-Id": patient["id"]},
        json={
            "conversationId": conv["id"],
            "text": "Saved document",
            "attachments": [
                {
                    "name": "persisted.pdf",
                    "size": "8 B",
                    "type": "application/pdf",
                    "objectKey": f"{patient['id']}/persisted.pdf",
                    "bucket": "meallens-care-private",
                    "sizeBytes": 8,
                }
            ],
        },
    )
    database = JsonStore(tmp_path / "care.json")
    database.replace(get_store().snapshot())
    reloaded = JsonStore(tmp_path / "care.json").snapshot()
    att = reloaded["messages"][-1]["attachments"][0]
    assert att.get("objectKey") == f"{patient['id']}/persisted.pdf"
    assert "data:" not in (att.get("url") or "")
    assert not any(file.get("name") == "persisted.pdf" for file in reloaded["files"])


def test_pulse_is_small_and_scoped(client):
    pulse = client.get("/api/care/pulse", headers={"X-User-Id": "user-sarah"}).get_json()
    assert "dietitians" not in pulse
    assert "messages" not in pulse
    assert "conversations" in pulse
    assert "notifications" in pulse
    assert "liveCalls" in pulse


def test_state_never_embeds_file_bytes(client):
    state = client.get("/api/care/state", headers={"X-User-Id": "user-sarah"}).get_json()
    blob = str(state)
    assert "data:application" not in blob
    assert "data:image" not in blob
    assert "base64," not in blob


def test_seed_has_no_demo_dietitians(client):
    state = get_store().snapshot()
    assert state["dietitians"] == []
    assert state["applications"] == []
    assert not any(user["role"] == "dietitian" for user in state["users"])


def test_admin_login_links_auth_uuid_after_password_check(monkeypatch):
    from care.service import login_admin
    from unittest.mock import Mock

    monkeypatch.setenv("CARE_ADMIN_CREDENTIALS", "admin@meallensai.com:configured-password")
    auth_id = "84f496d9-97a0-4b16-9b5e-8d64a775bf42"
    resolver = Mock(return_value=auth_id)
    with pytest.raises(ValueError, match="Incorrect"):
        login_admin({"users": []}, "admin@meallensai.com", "wrong", resolve_auth_id=resolver)
    resolver.assert_not_called()
    state, user = login_admin({"users": []}, "admin@meallensai.com", "configured-password", resolve_auth_id=resolver)
    assert user["id"] == auth_id
    assert user["role"] == "admin"
    resolver.assert_called_once_with("admin@meallensai.com")
    _, again = login_admin(state, "admin@meallensai.com", "configured-password", resolve_auth_id=resolver)
    assert again["id"] == auth_id
    resolver.assert_called_once()


def test_admin_auth_identity_reuses_paginated_user_or_creates(monkeypatch):
    from care.db import SupabaseStore
    from types import SimpleNamespace
    from unittest.mock import Mock

    store = SupabaseStore.__new__(SupabaseStore)
    admin = Mock()
    store.client = SimpleNamespace(auth=SimpleNamespace(admin=admin))
    target = SimpleNamespace(id="84f496d9-97a0-4b16-9b5e-8d64a775bf42", email="Admin@meallensai.com")
    admin.list_users.side_effect = [[SimpleNamespace(email="other@example.com")] * 100, [target]]
    assert store.resolve_admin_auth_id("admin@meallensai.com") == target.id
    admin.list_users.assert_called_with(page=2, per_page=100)
    admin.create_user.assert_not_called()
    admin.list_users.side_effect = None
    admin.list_users.return_value = []
    admin.create_user.return_value = SimpleNamespace(user=target)
    assert store.resolve_admin_auth_id("new@meallensai.com") == target.id
    admin.create_user.assert_called_once()


def test_booking_is_scoped_idempotent_and_status_reaches_all_viewers(client):
    patient = _register_patient(client)
    doctor, listing = _register_and_approve_dietitian(client)
    payload = {"dietitianId": listing["id"], "date": "2026-10-12", "time": "10:00", "topic": "Consult", "kind": "video"}
    headers = {"X-User-Id": patient["id"]}
    for _ in range(2):
        assert client.post('/api/care/appointments', headers=headers, json=payload).status_code == 200
    appointments = [a for a in get_store().snapshot()['appointments'] if a['patientId'] == patient['id']]
    assert len(appointments) == 1
    appointment = appointments[0]
    assert appointment['dietitianId'] == listing['id']
    for viewer in (patient['id'], doctor['id'], 'user-admin'):
        pulse = client.get('/api/care/pulse', headers={'X-User-Id': viewer}).get_json()
        assert any(a['id'] == appointment['id'] for a in pulse['appointments'])
    complete = client.post('/api/care/actions', headers=headers, json={'type': 'COMPLETE_APPOINTMENT', 'payload': {'appointmentId': appointment['id']}})
    assert complete.status_code == 200
    pulse = client.get('/api/care/pulse', headers={'X-User-Id': doctor['id']}).get_json()
    assert next(a for a in pulse['appointments'] if a['id'] == appointment['id'])['status'] == 'completed'
    deleted = client.post(f"/api/care/appointments/{appointment['id']}/cancel", headers=headers)
    assert deleted.status_code == 200
    assert next(a for a in deleted.get_json()['patch']['appointments'] if a['id'] == appointment['id'])['status'] == 'deleted'
    for viewer in (patient['id'], doctor['id']):
        pulse = client.get('/api/care/pulse', headers={'X-User-Id': viewer}).get_json()
        assert not any(a['id'] == appointment['id'] for a in pulse['appointments'])


def test_new_call_creates_conversation_and_keeps_other_calls(client):
    patient = _register_patient(client)
    doctor, _ = _register_and_approve_dietitian(client)
    previous_ids = {c['id'] for c in get_store().snapshot()['liveCalls']}
    response = client.post('/api/care/actions', headers={'X-User-Id': patient['id']}, json={'type': 'START_CALL', 'payload': {'call': {'conversationId': 'live', 'peerId': doctor['id'], 'peerName': doctor['name']}}})
    assert response.status_code == 200
    state = get_store().snapshot()
    call = next(c for c in state['liveCalls'] if c['callerId'] == patient['id'])
    conversation = next(c for c in state['conversations'] if c['id'] == call['conversationId'])
    assert set(conversation['participantIds']) == {patient['id'], doctor['id']}
    assert previous_ids.issubset({c['id'] for c in state['liveCalls']})
    answer = client.post('/api/care/actions', headers={'X-User-Id': doctor['id']}, json={'type': 'ANSWER_CALL', 'payload': {}})
    assert answer.status_code == 200
    assert next(c for c in get_store().snapshot()['liveCalls'] if c['id'] == call['id'])['status'] == 'live'


def test_patient_returning_from_practice_can_message_and_update_photo(client):
    from care.service import sync_account
    patient = _register_patient(client)
    state = get_store().snapshot()
    state, _ = sync_account(state, {**patient, 'externalUserId': patient['id'], 'role': 'dietitian'})
    state, user = sync_account(state, {**patient, 'externalUserId': patient['id'], 'role': 'patient'})
    assert user['role'] == 'patient'
    get_store().replace(state)
    updated = client.post('/api/care/actions', headers={'X-User-Id': patient['id']}, json={'type': 'UPDATE_ACCOUNT', 'payload': {'avatar': f"{patient['id']}/avatar.png"}})
    assert updated.status_code == 200


def test_appointment_only_patient_details_and_files_visible_with_block_respected(client):
    patient = _register_patient(client)
    doctor, listing = _register_and_approve_dietitian(client)
    state = get_store().snapshot()
    state['appointments'].append({'id': 'test-appointment', 'patientId': patient['id'], 'dietitianId': listing['id'], 'date': '2026-10-12', 'time': '10:00', 'status': 'upcoming', 'type': 'video', 'topic': 'Consult'})
    state['files'].append({'id': 'test-file', 'ownerId': patient['id'], 'name': 'Lab.pdf', 'objectKey': f"{patient['id']}/lab.pdf", 'bucket': 'private', 'category': 'labs', 'uploadedAt': '2026-09-27T00:00:00Z', 'size': '1 KB'})
    get_store().replace(state)
    scoped = client.get('/api/care/state', headers={'X-User-Id': doctor['id']}).get_json()
    assert any(u['id'] == patient['id'] and u['name'] == patient['name'] for u in scoped['users'])
    assert any(f['id'] == 'test-file' for f in scoped['files'])
    pulse = client.get('/api/care/pulse', headers={'X-User-Id': doctor['id']}).get_json()
    assert any(u['id'] == patient['id'] for u in pulse['users'])
    state['patientSettings'] = [{'userId': patient['id'], 'blockedFileAccessIds': [doctor['id']]}]
    get_store().replace(state)
    scoped = client.get('/api/care/state', headers={'X-User-Id': doctor['id']}).get_json()
    assert not any(f['id'] == 'test-file' for f in scoped['files'])


def test_supabase_hot_patient_settings_uses_user_id_key():
    from care.db import SupabaseStore
    from types import SimpleNamespace
    from uuid import uuid4
    writes = []
    class Table:
        def upsert(self, rows):
            writes.extend(rows)
            return self
        def execute(self):
            return SimpleNamespace(data=[])
    store = object.__new__(SupabaseStore)
    store.client = SimpleNamespace(table=lambda name: Table())
    store._profile_cache = {}
    user_id = str(uuid4())
    before = {'users': [{'id': user_id, 'name': 'Pat', 'email': 'pat@test.com', 'role': 'patient'}]}
    after = {**before, 'patientSettings': [{'userId': user_id, 'blockedFileAccessIds': []}]}
    assert store.persist_hot_action(before, after, 'UPDATE_PATIENT_SETTINGS')
    assert writes[0]['user_id'] == user_id


def test_supabase_admin_pulse_keeps_all_appointments_and_peer_names():
    from care.db import load_pulse_from_supabase
    from types import SimpleNamespace
    rows = {
        'mp_profiles': [{'id': 'patient', 'name': 'Pat', 'email': 'pat@example.com', 'role': 'patient'}],
        'mp_appointments': [{'id': 'apt', 'patient_id': 'patient', 'dietitian_id': 'listing', 'starts_at': '2026-10-12T10:00:00+00:00', 'status': 'upcoming', 'type': 'video'}],
    }
    class Query:
        def __init__(self, name): self.rows = list(rows.get(name, []))
        def select(self, *_): return self
        def eq(self, key, value):
            self.rows = [r for r in self.rows if r.get(key) == value]
            return self
        def neq(self, key, value):
            self.rows = [r for r in self.rows if r.get(key) != value]
            return self
        def in_(self, key, values):
            self.rows = [r for r in self.rows if r.get(key) in values]
            return self
        def order(self, *args, **kwargs): return self
        def limit(self, count):
            self.rows = self.rows[:count]
            return self
        def or_(self, *_): return self
        def execute(self): return SimpleNamespace(data=self.rows)
    pulse = load_pulse_from_supabase(SimpleNamespace(table=Query), 'admin', 'admin')
    assert [a['id'] for a in pulse['appointments']] == ['apt']
    assert pulse['users'][0]['name'] == 'Pat'
    pulse = load_pulse_from_supabase(SimpleNamespace(table=Query), 'unrelated-patient', 'patient')
    assert pulse['appointments'] == []


def test_call_status_write_does_not_overwrite_concurrent_ice():
    from care.db import SupabaseStore
    from types import SimpleNamespace
    from uuid import uuid4
    from copy import deepcopy
    patient_id, doctor_id, call_id, conversation_id = [str(uuid4()) for _ in range(4)]
    before = {'users': [{'id': patient_id, 'name': 'Pat', 'email': 'p@test.com', 'role': 'patient'}, {'id': doctor_id, 'name': 'Doc', 'email': 'd@test.com', 'role': 'dietitian'}], 'liveCalls': [{'id': call_id, 'callerId': patient_id, 'calleeId': doctor_id, 'conversationId': conversation_id, 'startedAt': '2026-09-27T00:00:00Z', 'status': 'ringing', 'ice': []}]}
    after = deepcopy(before)
    after['liveCalls'][0]['status'] = 'live'
    writes = []
    class Table:
        def update(self, row):
            writes.append(row)
            return self
        def eq(self, *_): return self
        def execute(self): return SimpleNamespace(data=[])
    store = object.__new__(SupabaseStore)
    store.client = SimpleNamespace(table=lambda _: Table())
    store._profile_cache = {}
    assert store.persist_hot_action(before, after, 'ANSWER_CALL')
    assert writes == [{'status': 'live'}]
