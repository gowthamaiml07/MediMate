import pytest
import io
import jwt
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.services.prescription_store import prescription_store
from app.services.llm.mock_provider import MockLLMProvider
from app.services.ocr.mock_provider import MockOCRProvider

client = TestClient(app)

USER_A_ID = "11111111-1111-1111-1111-111111111111"
USER_B_ID = "22222222-2222-2222-2222-222222222222"

def create_token(user_id: str, email: str = "test@example.com") -> str:
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


# 1. Valid Image and PDF Uploads
def test_upload_valid_image_png():
    token = create_token(USER_A_ID)
    file_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRfake_png_bytes"
    files = {"file": ("dr_mehta_rx.png", io.BytesIO(file_content), "image/png")}
    
    response = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("Completed", "completed")
    assert data["file_name"] == "dr_mehta_rx.png"
    assert len(data["medicines"]) >= 3
    assert data["medicines"][0]["name"] == "Metformin"
    assert data["provider_info"]["is_mock"] is True

def test_upload_valid_pdf():
    token = create_token(USER_A_ID)
    file_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    files = {"file": ("prescription_dr_mehta.pdf", io.BytesIO(file_content), "application/pdf")}
    
    response = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("Completed", "completed")
    assert data["mime_type"] == "application/pdf"
    assert len(data["medicines"]) >= 1

def test_upload_valid_webp():
    token = create_token(USER_A_ID)
    file_content = b"RIFF\x00\x00\x00\x00WEBPVP8 "
    files = {"file": ("scan.webp", io.BytesIO(file_content), "image/webp")}
    
    response = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert response.status_code == 200
    assert response.json()["file_name"] == "scan.webp"

# 2. Unsupported files and oversized uploads
def test_upload_unsupported_file_extension():
    token = create_token(USER_A_ID)
    file_content = b"executable payload"
    files = {"file": ("malware.exe", io.BytesIO(file_content), "application/octet-stream")}
    
    response = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]

def test_upload_unsupported_mime_type():
    token = create_token(USER_A_ID)
    file_content = b"Plain text file"
    files = {"file": ("notes.txt", io.BytesIO(file_content), "text/plain")}
    
    response = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert response.status_code == 400

def test_upload_empty_file():
    token = create_token(USER_A_ID)
    files = {"file": ("empty.png", io.BytesIO(b""), "image/png")}
    
    response = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

def test_upload_oversized_file():
    token = create_token(USER_A_ID)
    oversized_bytes = b"0" * (11 * 1024 * 1024) # 11 MB > 10MB limit
    files = {"file": ("huge_scan.png", io.BytesIO(oversized_bytes), "image/png")}
    
    response = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert response.status_code == 413
    assert "exceeds maximum allowed size" in response.json()["detail"]

# 3. Empty, blurry, and illegible prescriptions
def test_blurry_illegible_prescription():
    token = create_token(USER_A_ID)
    file_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRblurry"
    files = {"file": ("blurry_prescription.png", io.BytesIO(file_content), "image/png")}
    
    response = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert response.status_code == 200
    data = response.json()
    assert data["uncertain_fields_count"] > 0
    # Checks that unclear flags are set
    unclear_meds = [m for m in data["medicines"] if m["is_unclear"]]
    assert len(unclear_meds) > 0
    assert any("Critical Safety Warning" in adv or "illegible" in adv.lower() for adv in data["safety_advisories"])

# 4. Conflicting instructions
def test_conflicting_instructions_prescription():
    token = create_token(USER_A_ID)
    files = {"file": ("conflict_dosage.png", io.BytesIO(b"\x89PNGfakeconflict"), "image/png")}
    
    response = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert response.status_code == 200
    data = response.json()
    conflicting_meds = [m for m in data["medicines"] if m["has_conflicting_instructions"]]
    assert len(conflicting_meds) > 0
    assert conflicting_meds[0]["needs_confirmation"] is True

# 5. Missing instructions
def test_missing_instructions_prescription():
    token = create_token(USER_A_ID)
    files = {"file": ("missing_details.png", io.BytesIO(b"\x89PNGfakemissing"), "image/png")}
    
    response = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert response.status_code == 200
    data = response.json()
    med = data["medicines"][0]
    assert len(med["missing_fields"]) > 0
    assert med["needs_confirmation"] is True

# 6. Multiple medications on one prescription
def test_multiple_medications_extraction():
    token = create_token(USER_A_ID)
    files = {"file": ("multi_prescription.png", io.BytesIO(b"\x89PNGfakemulti"), "image/png")}
    
    response = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["medicines"]) == 5
    names = [m["name"] for m in data["medicines"]]
    assert "Metformin" in names
    assert "Atorvastatin" in names
    assert "Vitamin D3" in names
    assert "Pantoprazole" in names
    assert "Paracetamol" in names

# 7. Unauthorized and Cross-User Data Access
def test_cross_user_prescription_access_blocked():
    token_a = create_token(USER_A_ID)
    token_b = create_token(USER_B_ID)

    # User A uploads a prescription
    files = {"file": ("private_rx.png", io.BytesIO(b"\x89PNGprivaterx"), "image/png")}
    upload_res = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token_a}"},
        files=files
    )
    assert upload_res.status_code == 200
    rx_id = upload_res.json()["prescription_id"]

    # User B tries to view review of User A's prescription -> 403 Forbidden
    res_b_review = client.get(
        f"/api/v1/prescriptions/{rx_id}/review",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_b_review.status_code == 403

    # User B tries to download User A's document -> 403 Forbidden
    res_b_doc = client.get(
        f"/api/v1/prescriptions/{rx_id}/document",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_b_doc.status_code == 403

    # User B tries to edit User A's review draft -> 403 Forbidden
    res_b_edit = client.put(
        f"/api/v1/prescriptions/{rx_id}/review",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"medicines": []}
    )
    assert res_b_edit.status_code == 403

    # User A CAN access their own prescription
    res_a_review = client.get(
        f"/api/v1/prescriptions/{rx_id}/review",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res_a_review.status_code == 200
    assert res_a_review.json()["prescription_id"] == rx_id

# 8. Saving corrections draft and confirming reviewed data
def test_save_corrections_draft_and_confirmation():
    token = create_token(USER_A_ID)
    files = {"file": ("rx_to_correct.png", io.BytesIO(b"\x89PNGfakecorrect"), "image/png")}
    
    upload_res = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    rx_id = upload_res.json()["prescription_id"]
    extracted_meds = upload_res.json()["medicines"]

    # User makes correction to first medication
    extracted_meds[0]["strength"] = "1000mg (Corrected by Patient)"
    extracted_meds[0]["instructions"] = "With breakfast"
    extracted_meds[0]["needs_confirmation"] = False

    # 1. Save draft
    draft_res = client.put(
        f"/api/v1/prescriptions/{rx_id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"medicines": extracted_meds, "doctor_name": "Dr. R. Mehta, MD (Verified)"}
    )
    assert draft_res.status_code == 200
    assert draft_res.json()["medicines"][0]["strength"] == "1000mg (Corrected by Patient)"
    assert draft_res.json()["status"] == "Reviewed"
    assert draft_res.json()["is_confirmed"] is False

    # 2. Confirm prescription
    confirm_res = client.post(
        f"/api/v1/prescriptions/{rx_id}/confirm",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "medicines": extracted_meds,
            "doctor_name": "Dr. R. Mehta, MD (Verified)",
            "create_schedules": True,
            "user_acknowledgement": True
        }
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "confirmed"
    assert confirm_res.json()["is_confirmed"] is True
    assert len(confirm_res.json()["created_medication_ids"]) > 0

    # 3. Check review endpoint now marks is_confirmed = True
    after_confirm = client.get(
        f"/api/v1/prescriptions/{rx_id}/review",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert after_confirm.status_code == 200
    assert after_confirm.json()["is_confirmed"] is True

# 9. Ensuring unconfirmed extractions cannot activate schedules
def test_unconfirmed_prescription_cannot_activate_without_acknowledgement():
    token = create_token(USER_A_ID)
    files = {"file": ("unconfirmed_test.png", io.BytesIO(b"\x89PNGfakeunconfirmed"), "image/png")}
    
    upload_res = client.post(
        "/api/v1/prescriptions/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    rx_id = upload_res.json()["prescription_id"]
    meds = upload_res.json()["medicines"]

    # Attempting to confirm without user_acknowledgement must fail (Medical safety enforcement)
    bad_confirm = client.post(
        f"/api/v1/prescriptions/{rx_id}/confirm",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "medicines": meds,
            "user_acknowledgement": False
        }
    )
    assert bad_confirm.status_code == 400
    assert "acknowledgement are required" in bad_confirm.json()["detail"]
