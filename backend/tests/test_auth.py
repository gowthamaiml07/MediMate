import pytest
from datetime import datetime, timezone, timedelta
import jwt
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)
TEST_SECRET = "test-supabase-jwt-secret-for-unit-testing-32-chars-long"

@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setattr(settings, "SUPABASE_AUDIENCE", "authenticated")
    monkeypatch.setattr(settings, "DEMO_MODE", False)

def create_test_token(user_id: str, email: str, expires_in_seconds: int = 3600, audience: str = "authenticated"):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "aud": audience,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in_seconds)).timestamp()),
        "user_metadata": {"full_name": "Test Patient"}
    }
    return jwt.encode(payload, TEST_SECRET, algorithm="HS256")

def test_health_check_unauthenticated():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_protected_route_missing_token_production():
    # In production (DEMO_MODE=False), missing header must return 401
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]

def test_protected_route_invalid_token():
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_garbage_token"}
    )
    assert response.status_code == 401
    assert "Invalid authorization token" in response.json()["detail"]

def test_protected_route_expired_token():
    expired_token = create_test_token(
        user_id="user-123",
        email="patient@example.com",
        expires_in_seconds=-60 # expired 1 minute ago
    )
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == 401
    assert "Session expired" in response.json()["detail"]

def test_protected_route_valid_token():
    valid_token = create_test_token(
        user_id="user-456",
        email="test.user@medimate.ai",
        expires_in_seconds=3600
    )
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {valid_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "user-456"
    assert data["email"] == "test.user@medimate.ai"
    assert data["is_demo"] is False

def test_appointments_scoped_to_authenticated_user():
    valid_token = create_test_token(
        user_id="user-789",
        email="patient789@example.com"
    )
    response = client.get(
        "/api/v1/appointments",
        headers={"Authorization": f"Bearer {valid_token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_demo_mode_fallback(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["is_demo"] is True
    assert "Priya Sharma" in data["metadata"]["full_name"]
