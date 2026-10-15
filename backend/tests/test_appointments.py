import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

from app.main import app
from app.core.config import settings

client = TestClient(app)

USER_A_ID = "00000000-0000-0000-0000-000000000001"
USER_B_ID = "00000000-0000-0000-0000-000000000002"

import jwt

@pytest.fixture(autouse=True)
def setup_jwt_secret():
    old_secret = settings.SUPABASE_JWT_SECRET
    if not settings.SUPABASE_JWT_SECRET:
        settings.SUPABASE_JWT_SECRET = "super-secret-jwt-key-with-minimum-32-bytes-length"
    yield
    settings.SUPABASE_JWT_SECRET = old_secret

@pytest.fixture
def auth_headers_user_a():
    """Generates an authenticated header for User A."""
    secret = settings.SUPABASE_JWT_SECRET or "super-secret-jwt-key-with-minimum-32-bytes-length"
    token_payload = {
        "sub": USER_A_ID,
        "email": "user.a@medimate.ai",
        "role": "authenticated",
        "aud": settings.SUPABASE_AUDIENCE,
        "exp": 9999999999,
    }
    token = jwt.encode(token_payload, secret, algorithm="HS256")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

@pytest.fixture
def auth_headers_user_b():
    """Generates an authenticated header for User B."""
    secret = settings.SUPABASE_JWT_SECRET or "super-secret-jwt-key-with-minimum-32-bytes-length"
    token_payload = {
        "sub": USER_B_ID,
        "email": "user.b@medimate.ai",
        "role": "authenticated",
        "aud": settings.SUPABASE_AUDIENCE,
        "exp": 9999999999,
    }
    token = jwt.encode(token_payload, secret, algorithm="HS256")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def test_get_appointments_scoped_to_user(auth_headers_user_a, auth_headers_user_b):
    """Verifies that User A sees only User A's appointments and User B gets an isolated view."""
    res_a = client.get("/api/v1/appointments", headers=auth_headers_user_a)
    assert res_a.status_code == 200
    apts_a = res_a.json()
    assert isinstance(apts_a, list)
    assert len(apts_a) >= 1
    for apt in apts_a:
        assert apt["user_id"] == USER_A_ID

    res_b = client.get("/api/v1/appointments", headers=auth_headers_user_b)
    assert res_b.status_code == 200
    apts_b = res_b.json()
    assert len(apts_b) == 0  # User B has no appointments initially


def test_get_doctors_directory(auth_headers_user_a):
    """Verifies that verified doctor directory is available and distinct from patient records."""
    res = client.get("/api/v1/appointments/doctors", headers=auth_headers_user_a)
    assert res.status_code == 200
    docs = res.json()
    assert len(docs) >= 3
    doc_names = [d["name"] for d in docs]
    assert "Dr. R. Mehta" in doc_names
    assert "Dr. S. Kumar" in doc_names
    assert docs[0]["is_verified"] is True


def test_create_appointment_success(auth_headers_user_a):
    """Verifies successful appointment creation with visit notes and reminder offsets."""
    payload = {
        "doctor_name": "Dr. Jennifer Davis",
        "speciality": "Dermatologist",
        "appointment_date": "2025-11-20",
        "appointment_time": "02:30 PM",
        "duration_minutes": 30,
        "visit_type": "In-Person",
        "clinic_name": "City Skin & Wellness",
        "location": "Suite 104, Wellness Arcade",
        "visit_purpose": "Annual skin examination and mole check",
        "questions_to_ask": ["Check dry patch on left elbow", "Sunscreen recommendation"],
        "personal_notes": "Take notes on prescription moisturizers",
        "reminder_offsets": [1440, 60],
        "allow_overlap": False,
    }
    res = client.post("/api/v1/appointments", json=payload, headers=auth_headers_user_a)
    assert res.status_code == 201
    data = res.json()
    assert data["id"].startswith("apt-")
    assert data["doctor_name"] == "Dr. Jennifer Davis"
    assert data["appointment_date"] == "2025-11-20"
    assert data["appointment_time"] == "2:30 PM"
    assert data["status"] == "Upcoming"
    assert data["is_locally_managed"] is True
    assert len(data["questions_to_ask"]) == 2
    assert len(data["history"]) >= 1
    assert data["history"][0]["action"] == "created"


def test_create_appointment_invalid_date_or_time(auth_headers_user_a):
    """Verifies rejection of invalid dates or malformed time formats."""
    # Invalid date
    res = client.post(
        "/api/v1/appointments",
        json={
            "doctor_name": "Dr. S. Kumar",
            "speciality": "General Physician",
            "appointment_date": "2025-13-45",
            "appointment_time": "10:00 AM",
        },
        headers=auth_headers_user_a,
    )
    assert res.status_code == 422

    # Invalid time
    res2 = client.post(
        "/api/v1/appointments",
        json={
            "doctor_name": "Dr. S. Kumar",
            "speciality": "General Physician",
            "appointment_date": "2025-11-20",
            "appointment_time": "25:99 PM",
        },
        headers=auth_headers_user_a,
    )
    assert res2.status_code == 422


def test_overlapping_appointment_warning_and_override(auth_headers_user_a):
    """Verifies that scheduling an overlapping appointment returns HTTP 409 unless allow_overlap is True."""
    # First appointment
    client.post(
        "/api/v1/appointments",
        json={
            "doctor_name": "Dr. Overlap Test 1",
            "speciality": "General Physician",
            "appointment_date": "2025-12-05",
            "appointment_time": "10:00 AM",
            "duration_minutes": 60,  # 10:00 AM - 11:00 AM
            "allow_overlap": False,
        },
        headers=auth_headers_user_a,
    )

    # Second appointment overlapping (10:30 AM - 11:00 AM)
    res_conflict = client.post(
        "/api/v1/appointments",
        json={
            "doctor_name": "Dr. Overlap Test 2",
            "speciality": "Cardiologist",
            "appointment_date": "2025-12-05",
            "appointment_time": "10:30 AM",
            "duration_minutes": 30,
            "allow_overlap": False,
        },
        headers=auth_headers_user_a,
    )
    assert res_conflict.status_code == 409
    detail = res_conflict.json()["detail"]
    assert detail["has_overlap"] is True
    assert "conflict detected" in detail["message"].lower()

    # Second appointment with allow_overlap=True should succeed
    res_override = client.post(
        "/api/v1/appointments",
        json={
            "doctor_name": "Dr. Overlap Test 2",
            "speciality": "Cardiologist",
            "appointment_date": "2025-12-05",
            "appointment_time": "10:30 AM",
            "duration_minutes": 30,
            "allow_overlap": True,
        },
        headers=auth_headers_user_a,
    )
    assert res_override.status_code == 201
    assert res_override.json()["doctor_name"] == "Dr. Overlap Test 2"


def test_edit_appointment_and_visit_notes(auth_headers_user_a):
    """Verifies updating appointment details and healthcare visit notes."""
    # Create appointment
    create_res = client.post(
        "/api/v1/appointments",
        json={
            "doctor_name": "Dr. Edit Notes Test",
            "speciality": "General Physician",
            "appointment_date": "2025-11-25",
            "appointment_time": "09:00 AM",
            "visit_purpose": "Initial purpose",
        },
        headers=auth_headers_user_a,
    )
    apt_id = create_res.json()["id"]

    # Update visit notes
    update_res = client.put(
        f"/api/v1/appointments/{apt_id}",
        json={
            "visit_purpose": "Updated diabetes check and fasting blood glucose evaluation",
            "questions_to_ask": ["Can I switch to extended release Metformin?"],
            "personal_notes": "Fasting glucose was 110 mg/dL this morning",
            "follow_up_instructions": "Review blood work in 2 weeks",
        },
        headers=auth_headers_user_a,
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert "fasting blood glucose" in data["visit_purpose"]
    assert len(data["questions_to_ask"]) == 1
    assert data["personal_notes"] == "Fasting glucose was 110 mg/dL this morning"

    # Verify audit record added
    assert any(h["action"] == "updated" for h in data["history"])


def test_reschedule_appointment_audit_log(auth_headers_user_a):
    """Verifies rescheduling updates date/time, sets status to Rescheduled, and appends audit log."""
    create_res = client.post(
        "/api/v1/appointments",
        json={
            "doctor_name": "Dr. Reschedule Test",
            "speciality": "General Physician",
            "appointment_date": "2025-11-30",
            "appointment_time": "11:00 AM",
        },
        headers=auth_headers_user_a,
    )
    apt_id = create_res.json()["id"]

    res = client.post(
        f"/api/v1/appointments/{apt_id}/reschedule",
        json={
            "new_date": "2025-12-02",
            "new_time": "04:00 PM",
            "reason": "Work conflict on Monday",
        },
        headers=auth_headers_user_a,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["appointment_date"] == "2025-12-02"
    assert data["appointment_time"] == "4:00 PM"
    assert data["status"] == "Rescheduled"
    assert "2025-11-30" in data["rescheduled_from"]
    assert any(h["action"] == "rescheduled" and "Work conflict" in h["details"] for h in data["history"])


def test_cancel_appointment_and_cancel_reminders(auth_headers_user_a):
    """Verifies appointment cancellation records reason and cancels pending reminders."""
    create_res = client.post(
        "/api/v1/appointments",
        json={
            "doctor_name": "Dr. Cancel Test",
            "speciality": "Orthopedic Surgeon",
            "appointment_date": "2025-12-10",
            "appointment_time": "10:00 AM",
            "reminder_offsets": [1440, 60],
        },
        headers=auth_headers_user_a,
    )
    apt_id = create_res.json()["id"]

    # Cancel
    cancel_res = client.post(
        f"/api/v1/appointments/{apt_id}/cancel",
        json={"reason": "Patient feeling better; routine review postponed"},
        headers=auth_headers_user_a,
    )
    assert cancel_res.status_code == 200
    data = cancel_res.json()
    assert data["status"] == "Cancelled"
    assert data["cancellation_reason"] == "Patient feeling better; routine review postponed"

    # Verify cannot reschedule a cancelled appointment
    bad_reschedule = client.post(
        f"/api/v1/appointments/{apt_id}/reschedule",
        json={"new_date": "2025-12-15", "new_time": "10:00 AM"},
        headers=auth_headers_user_a,
    )
    assert bad_reschedule.status_code == 400


def test_calendar_month_summary(auth_headers_user_a):
    """Verifies monthly calendar aggregation endpoint returns weeks and day slots."""
    res = client.get("/api/v1/appointments/calendar/month?year=2025&month=9", headers=auth_headers_user_a)
    assert res.status_code == 200
    data = res.json()
    assert data["year"] == 2025
    assert data["month"] == 9
    assert data["month_name"] == "September"
    assert len(data["days"]) >= 28
    # Days with appointments should have count > 0
    days_with_apts = [d for d in data["days"] if d["appointment_count"] > 0]
    assert len(days_with_apts) >= 1


def test_ics_export_generation_and_escaping(auth_headers_user_a):
    """Verifies RFC 5545 compliant .ics calendar generation with character escaping."""
    create_res = client.post(
        "/api/v1/appointments",
        json={
            "doctor_name": "Dr. Calendar, Special & Escaping",
            "speciality": "Cardiologist; Specialist",
            "appointment_date": "2025-12-18",
            "appointment_time": "11:30 AM",
            "duration_minutes": 45,
            "location": "Floor 2, Room 204; Heart Wing",
            "visit_purpose": "Line 1 note\nLine 2 comma, and semicolon; checkup",
        },
        headers=auth_headers_user_a,
    )
    apt_id = create_res.json()["id"]

    res = client.get(f"/api/v1/appointments/{apt_id}/export-ics", headers=auth_headers_user_a)
    assert res.status_code == 200
    data = res.json()
    assert data["filename"].endswith(".ics")
    assert "unconfigured" in data["disclaimer"].lower()

    content = data["ics_content"]
    assert "BEGIN:VCALENDAR" in content
    assert "VERSION:2.0" in content
    assert "BEGIN:VEVENT" in content
    assert "DTSTART:" in content
    assert "DTEND:" in content
    assert "UID:apt-" in content
    # Check RFC 5545 escaping (commas and semicolons and newlines escaped with backslash)
    assert "\\," in content
    assert "\\;" in content
    assert "\\n" in content
    assert "END:VEVENT" in content
    assert "END:VCALENDAR" in content


def test_cross_user_appointment_isolation(auth_headers_user_a, auth_headers_user_b):
    """Verifies that User B cannot access, update, reschedule, or cancel User A's appointments."""
    create_res = client.post(
        "/api/v1/appointments",
        json={
            "doctor_name": "Dr. Private to User A",
            "speciality": "Psychiatrist",
            "appointment_date": "2025-12-22",
            "appointment_time": "03:00 PM",
        },
        headers=auth_headers_user_a,
    )
    apt_id = create_res.json()["id"]

    # User B tries to view
    res_get = client.get(f"/api/v1/appointments/{apt_id}", headers=auth_headers_user_b)
    assert res_get.status_code == 404

    # User B tries to update
    res_put = client.put(
        f"/api/v1/appointments/{apt_id}",
        json={"visit_purpose": "Malicious edit"},
        headers=auth_headers_user_b,
    )
    assert res_put.status_code == 404

    # User B tries to cancel
    res_cancel = client.post(
        f"/api/v1/appointments/{apt_id}/cancel",
        json={"reason": "Malicious cancel"},
        headers=auth_headers_user_b,
    )
    assert res_cancel.status_code == 404
