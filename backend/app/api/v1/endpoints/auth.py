from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.config import settings

router = APIRouter()

class UserLogin(BaseModel):
    email: str
    password: str

class UserSignup(BaseModel):
    name: str
    email: str
    password: str

@router.get("/me")
def get_authenticated_user_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Returns the currently authenticated user's profile and session claims.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "is_demo": current_user.is_demo,
        "metadata": current_user.metadata
    }

@router.post("/verify")
def verify_session_token(current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Verifies that the provided Bearer token is valid and unexpired.
    """
    return {
        "valid": True,
        "user_id": current_user.id,
        "is_demo": current_user.is_demo
    }

@router.post("/login")
def login(credentials: UserLogin):
    """
    Development fallback authentication route.
    Production applications authenticate via Supabase Auth client directly.
    """
    if not settings.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direct login endpoint disabled. Use Supabase Auth client."
        )

    if credentials.email and credentials.password:
        return {
            "access_token": "demo_jwt_token_medimate",
            "token_type": "bearer",
            "user": {
                "id": "00000000-0000-0000-0000-000000000001",
                "name": "Priya Sharma",
                "email": credentials.email,
                "role": "patient",
                "is_demo": True
            }
        }
    raise HTTPException(status_code=400, detail="Invalid credentials")

@router.post("/signup")
def signup(data: UserSignup):
    """
    Development fallback registration route.
    Production applications authenticate via Supabase Auth client directly.
    """
    if not settings.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direct signup endpoint disabled. Use Supabase Auth client."
        )

    return {
        "message": "User registered successfully",
        "user": {
            "id": "00000000-0000-0000-0000-000000000001",
            "name": data.name,
            "email": data.email,
            "is_demo": True
        }
    }
