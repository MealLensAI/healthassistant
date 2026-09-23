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


def test_health_and_demo_accounts(client):
    health = client.get("/api/care/health").get_json()
    assert health["ok"] is True
    accounts = client.get("/api/care/demo-accounts").get_json()
    assert {item["userId"] for item in accounts} >= {"user-sarah", "user-emily", "user-admin", "user-marcus"}


def test_new_patient_onboarding_creates_profile(client):
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
    state = client.get("/api/care/state", headers={"X-User-Id": user["id"]}).get_json()
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
                            "url": "data:application/pdf,license",
                        },
                    ],
                    "status": "pending",
                    "submittedAt": "2026-09-16T12:00:00.000Z",
                    "adminNotes": [],
                }
            },
        },
    ).get_json()
    assert any(item["userId"] == user_id and item["status"] == "pending" for item in submitted["dietitians"])

    admin = {"X-User-Id": "user-admin"}
    approved = client.post("/api/care/applications/app-amina/approve", headers=admin).get_json()
    assert any(item["userId"] == user_id and item["status"] == "approved" for item in approved["dietitians"])


def test_pending_dietitian_cannot_message_patients(client):
    marcus = {"X-User-Id": "user-marcus"}
    blocked = client.post(
        "/api/care/messages",
        headers=marcus,
        json={"conversationId": "conv-marcus-sarah", "text": "Hello from pending"},
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
    sarah = {"X-User-Id": "user-sarah"}
    emily = {"X-User-Id": "user-emily"}
    sent = client.post(
        "/api/care/messages",
        headers=sarah,
        json={"conversationId": "conv-emily", "text": "Can we move Thursday?"},
    ).get_json()
    assert sent["messages"][-1]["text"] == "Can we move Thursday?"
    doctor = client.get("/api/care/state", headers=emily).get_json()
    assert doctor["messages"][-1]["text"] == "Can we move Thursday?"
