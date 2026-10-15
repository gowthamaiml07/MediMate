import pytest
import jwt
from datetime import datetime, date, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.services.medication_store import medication_store
from app.services.reminders import reminder_service

client = TestClient(app)

USER_A_ID = "33333333-3333-3333-3333-333333333333"
USER_B_ID = "44444444-4444-4444-4444-444444444444"

def create_token(user_id: str, email: str = "patient@medimate.ai") -> str:
    secret = settings.SUPABASE_JWT_SECRET or "super-secret-jwt-key-with-minimum-32-bytes-length"
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "aud": settings.SUPABASE_AUDIENCE,
        "exp": 9999999999
    }
    return jwt.encode(payload, secret, algorithm="HS256")

@pytest.fixture(autouse=True)
def setup_jwt_secret():
    old_secret = settings.SUPABASE_JWT_SECRET
    if not settings.SUPABASE_JWT_SECRET:
        settings.SUPABASE_JWT_SECRET = "super-secret-jwt-key-with-minimum-32-bytes-length"
    yield
    settings.SUPABASE_JWT_SECRET = old_secret

# 1. Confirming reviewed medication details & creating active schedule
def test_create_and_confirm_medication():
    token = create_token(USER_A_ID)
    payload = {
        "name": "Metformin",
        "strength": "500mg",
        "formulation": "Tablet",
        "instructions": "1 tab twice daily after food",
        "frequency": "Twice daily",
        "duration": "30 days",
        "route": "Oral",
        "start_date": "2025-09-01",
        "end_date": "2025-09-30",
        "timing_relation": "After food",
        "scheduled_times": ["08:00", "20:00"],
        "timezone": "Asia/Kolkata",
        "reminder_enabled": True,
        "reminder_offset_minutes": 10,
        "original_source_text": "Tab. Metformin 500mg BID",
        "is_user_edited": False
    }

    response = client.post(
        "/api/v1/medications",
        headers={"Authorization": f"Bearer {token}"},
        json=payload
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Metformin"
    assert data["status"] == "Active"
    assert data["is_verified_by_user"] is True
    assert len(data["scheduled_times"]) == 2
    assert data["timezone"] == "Asia/Kolkata"

# 2. Invalid or ambiguous schedule instructions rejection
def test_ambiguous_schedule_rejected():
    token = create_token(USER_A_ID)
    payload = {
        "name": "Paracetamol",
        "strength": "650mg",
        "formulation": "Tablet",
        "instructions": "Take as needed for pain",
        "frequency": "As needed (SOS)", # Ambiguous / PRN
        "scheduled_times": [],
        "timing_relation": "After food",
        "timezone": "UTC"
    }

    response = client.post(
        "/api/v1/medications",
        headers={"Authorization": f"Bearer {token}"},
        json=payload
    )
    assert response.status_code == 422
    assert "Scheduling clarification required" in response.json()["detail"]

def test_invalid_schedule_time_format():
    token = create_token(USER_A_ID)
    payload = {
        "name": "Amoxicillin",
        "strength": "500mg",
        "formulation": "Capsule",
        "instructions": "Take daily",
        "frequency": "Once daily",
        "scheduled_times": ["25:00"], # Invalid hour
        "timing_relation": "After food",
        "timezone": "UTC"
    }

    response = client.post(
        "/api/v1/medications",
        headers={"Authorization": f"Bearer {token}"},
        json=payload
    )
    assert response.status_code == 400
    assert "Invalid time format" in response.json()["detail"]

# 3. Timezone and date boundary handling
def test_timeline_timezone_conversion():
    token = create_token(USER_A_ID)
    # Create medication scheduled for 08:00 AM Asia/Kolkata (+05:30)
    # 08:00 AM IST is 02:30 AM UTC
    payload = {
        "name": "Levothyroxine",
        "strength": "50mcg",
        "formulation": "Tablet",
        "instructions": "Early morning empty stomach",
        "frequency": "Once daily",
        "duration": "30 days",
        "route": "Oral",
        "start_date": "2025-09-01",
        "end_date": "2025-09-30",
        "timing_relation": "Empty stomach",
        "scheduled_times": ["08:00"],
        "timezone": "Asia/Kolkata",
        "reminder_enabled": True
    }
    create_res = client.post("/api/v1/medications", headers={"Authorization": f"Bearer {token}"}, json=payload)
    assert create_res.status_code == 201

    timeline_res = client.get(
        "/api/v1/medications/timeline/doses?target_date=2025-09-05&days=1&tz=Asia/Kolkata",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert timeline_res.status_code == 200
    doses = timeline_res.json()
    levo = next((d for d in doses if d["medication_name"] == "Levothyroxine"), None)
    assert levo is not None
    assert "08:00 AM" in levo["scheduled_time"]
    # UTC timestamp should have 02:30:00
    assert "02:30:00" in levo["scheduled_for"]

# 4. Duplicate dose-event prevention (Idempotency)
def test_dose_event_idempotency():
    token = create_token(USER_A_ID)
    scheduled_ts = "2025-09-08T08:00:00Z"
    req_body = {
        "schedule_id": "sch-seed-1",
        "scheduled_for": scheduled_ts,
        "status": "Taken",
        "notes": "Taken with breakfast",
        "timezone": "UTC"
    }

    # First log
    res1 = client.post("/api/v1/medications/doses/log", headers={"Authorization": f"Bearer {token}"}, json=req_body)
    assert res1.status_code == 200
    ev_id1 = res1.json()["event_id"]

    # Duplicate submission
    res2 = client.post("/api/v1/medications/doses/log", headers={"Authorization": f"Bearer {token}"}, json=req_body)
    assert res2.status_code == 200
    ev_id2 = res2.json()["event_id"]

    # Must be the exact same event ID (no duplicate rows created)
    assert ev_id1 == ev_id2

# 5. Dose correction with audit record
def test_dose_correction_audit():
    token = create_token(USER_A_ID)
    scheduled_ts = "2025-09-08T13:00:00Z"
    log_res = client.post(
        "/api/v1/medications/doses/log",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "schedule_id": "sch-seed-1",
            "scheduled_for": scheduled_ts,
            "status": "Taken",
            "notes": "Accidentally marked taken"
        }
    )
    ev_id = log_res.json()["event_id"]

    # Correct entry to Skipped with audit reason
    correct_res = client.post(
        f"/api/v1/medications/doses/{ev_id}/correct",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "new_status": "Skipped",
            "correction_reason": "Patient forgot medication at home while traveling"
        }
    )
    assert correct_res.status_code == 200
    data = correct_res.json()
    assert data["new_status"] == "Skipped"
    assert data["original_status"] == "Taken"
    assert data["corrected_at"] is not None

# 6. Pausing, resuming, and discontinuing medications
def test_medication_pause_resume_discontinue():
    token = create_token(USER_A_ID)
    # Create medication
    create_res = client.post(
        "/api/v1/medications",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Omeprazole",
            "strength": "20mg",
            "formulation": "Capsule",
            "instructions": "Before breakfast",
            "frequency": "Once daily",
            "scheduled_times": ["07:30"],
            "timing_relation": "Before food",
            "timezone": "UTC",
            "reminder_enabled": True
        }
    )
    med_id = create_res.json()["id"]

    # 1. Pause
    pause_res = client.patch(
        f"/api/v1/medications/{med_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "Paused", "reason": "Temporarily paused by doctor before lab test"}
    )
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "Paused"

    # Verify pending reminders were cancelled
    rem_res = client.get("/api/v1/medications/reminders", headers={"Authorization": f"Bearer {token}"})
    om_reminders = [r for r in rem_res.json() if r["medication_id"] == med_id]
    for r in om_reminders:
        assert r["status"] == "cancelled"

    # 2. Resume
    resume_res = client.patch(
        f"/api/v1/medications/{med_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "Active", "reason": "Resuming after test results normal"}
    )
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "Active"

    # 3. Discontinue
    disc_res = client.patch(
        f"/api/v1/medications/{med_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "Discontinued", "reason": "Treatment course finished"}
    )
    assert disc_res.status_code == 200
    assert disc_res.json()["status"] == "Discontinued"

# 7. Reminder queue & mock provider status
def test_reminder_queue_mock_provider():
    token = create_token(USER_A_ID)
    rem_res = client.get("/api/v1/medications/reminders", headers={"Authorization": f"Bearer {token}"})
    assert rem_res.status_code == 200
    reminders = rem_res.json()
    assert len(reminders) > 0
    # Every reminder must explicitly declare is_mock = True when credentials absent
    assert all(r["is_mock"] is True for r in reminders)

# 8. User data isolation & unauthorized requests
def test_user_data_isolation():
    token_a = create_token(USER_A_ID)
    token_b = create_token(USER_B_ID)

    # User A creates a private medication
    create_res = client.post(
        "/api/v1/medications",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "name": "PrivateMed",
            "strength": "100mg",
            "formulation": "Tablet",
            "instructions": "Private instruction",
            "frequency": "Once daily",
            "scheduled_times": ["08:00"],
            "timing_relation": "After food",
            "timezone": "UTC"
        }
    )
    med_a_id = create_res.json()["id"]

    # User B attempts to access User A's medication -> 403 Forbidden
    res_b = client.get(
        f"/api/v1/medications/{med_a_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_b.status_code == 403

    # User B attempts to modify User A's medication -> 403 Forbidden
    edit_b = client.put(
        f"/api/v1/medications/{med_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"name": "HackedName"}
    )
    assert edit_b.status_code == 403

    # User B attempts to pause User A's medication -> 403 Forbidden
    pause_b = client.patch(
        f"/api/v1/medications/{med_a_id}/status",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"status": "Paused"}
    )
    assert pause_b.status_code == 403

# 9. Adherence calculation with formula & clinical safety note
def test_adherence_calculation_formula():
    token = create_token(USER_A_ID)
    adh_res = client.get("/api/v1/medications/adherence/summary?days=7", headers={"Authorization": f"Bearer {token}"})
    assert adh_res.status_code == 200
    data = adh_res.json()
    assert "formula_description" in data
    assert "Adherence % = (Taken Doses / Total Past Due Doses) * 100" in data["formula_description"]
    assert "Never take a double or extra dose" in data["missed_dose_guidance"]
    assert data["adherence_rate"] >= 0 and data["adherence_rate"] <= 100
    assert len(data["daily_breakdown"]) == 7
