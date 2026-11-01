"""Call portraits retain the participant's own profile/listing photo after reload."""

from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from care.db import load_pulse_from_supabase, state_from_tables
from care.media import account_avatar
from care.service import apply_action


def _tables():
    return {
        "profiles": [
            {"id": "patient", "name": "Patient", "email": "pat@example.test", "role": "patient", "avatar_key": "patient/photo.jpg"},
            {"id": "doctor", "name": "Dietitian", "email": "doc@example.test", "role": "dietitian", "avatar_key": None},
        ],
        "dietitians": [
            {"id": "listing", "user_id": "doctor", "name": "Dietitian", "avatar_key": "doctor/registration.jpg", "status": "approved", "verified": True},
            {"id": "doctor", "user_id": "other-doctor", "name": "Someone else", "avatar_key": "other-doctor/wrong.jpg"},
        ],
        "live_calls": [{"id": "call", "conversation_id": "conv", "caller_id": "doctor", "callee_id": "patient", "status": "live"}],
    }


@pytest.mark.parametrize("caller_id", ["doctor", "patient"])
def test_start_call_uses_canonical_participant_photos(caller_id):
    state = state_from_tables({**_tables(), "live_calls": []})
    state["appointments"] = [
        {
            "id": "apt",
            "patientId": "patient",
            "dietitianId": "listing",
            "date": "2026-10-12",
            "time": "10:00",
            "status": "upcoming",
            "type": "video",
            "topic": "Consult",
            "visitKind": "consultation",
        }
    ]
    peer_id = "patient" if caller_id == "doctor" else "doctor"
    actor = next(user for user in state["users"] if user["id"] == caller_id)
    updated = apply_action(state, {
        "type": "START_CALL",
        "call": {"peerId": peer_id, "peerName": "Peer", "peerAvatar": "someone-else/injected.jpg"},
    }, actor)
    call = updated["liveCalls"][0]
    portraits = {call["callerId"]: call["callerAvatar"], call["calleeId"]: call["calleeAvatar"]}
    assert portraits == {"doctor": "doctor/registration.jpg", "patient": "patient/photo.jpg"}


def test_full_hydration_and_filtered_pulse_preserve_dietitian_listing_photo():
    tables = _tables()
    state = state_from_tables(tables)
    rows = {f"mp_{name}": values for name, values in tables.items()}
    queries = []

    class Query:
        def __init__(self, name):
            self.name = name
            self.rows = list(rows.get(name, []))
        def select(self, *_): return self
        def eq(self, key, value):
            self.rows = [row for row in self.rows if row.get(key) == value]
            return self
        def neq(self, key, value):
            self.rows = [row for row in self.rows if row.get(key) != value]
            return self
        def in_(self, key, values):
            queries.append((self.name, key, list(values)))
            self.rows = [row for row in self.rows if row.get(key) in values]
            return self
        def order(self, *args, **kwargs): return self
        def limit(self, count):
            self.rows = self.rows[:count]
            return self
        def or_(self, *_): return self
        def execute(self): return SimpleNamespace(data=self.rows)

    pulse = load_pulse_from_supabase(SimpleNamespace(table=Query), "patient")
    for result in (state, pulse):
        assert result["liveCalls"][0]["callerAvatar"] == "doctor/registration.jpg"
        assert result["liveCalls"][0]["calleeAvatar"] == "patient/photo.jpg"
    assert ("mp_dietitians", "user_id", ["doctor"]) in queries


def test_profile_photo_precedence_and_application_owner_isolation():
    doctor = {"id": "doctor", "role": "dietitian", "avatar": "doctor/new.jpg"}
    listings = [{"userId": "doctor", "avatar": "doctor/old.jpg"}]
    applications = [
        {"userId": "stranger", "documents": [{"kind": "photo", "objectKey": "stranger/photo.jpg"}]},
        {"userId": "doctor", "documents": [{"kind": "photo", "objectKey": "doctor/application.jpg"}]},
    ]
    assert account_avatar(doctor, listings, applications) == "doctor/new.jpg"
    doctor["avatar"] = ""
    assert account_avatar(doctor, listings, applications) == "doctor/old.jpg"
    assert account_avatar(doctor, [], applications) == "doctor/application.jpg"
    assert account_avatar(doctor, [], applications[:1]) == ""
    assert account_avatar({**doctor, "role": "patient"}, listings, applications) == ""


def test_call_photo_keys_are_signed_for_response_only(monkeypatch):
    import routes.care_routes as routes

    signed_keys = []
    def sign(*, bucket, key, **_):
        signed_keys.append((bucket, key))
        return f"https://avatars.example.test/{key}"
    monkeypatch.setattr(routes, "get_r2_storage", lambda: SimpleNamespace(signed_download_url=sign))
    state = state_from_tables(_tables())
    response = routes._sign_avatars(state)
    assert response["liveCalls"][0]["callerAvatar"] == "https://avatars.example.test/doctor/registration.jpg"
    assert state["liveCalls"][0]["callerAvatar"] == "doctor/registration.jpg"
    assert (routes.settings.r2_avatars_bucket, "doctor/registration.jpg") in signed_keys
