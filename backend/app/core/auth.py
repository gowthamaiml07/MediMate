import logging
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
import jwt
from app.core.config import settings

logger = logging.getLogger("medimate.auth")
security = HTTPBearer(auto_error=False)

class AuthenticatedUser(BaseModel):
    id: str
    email: Optional[str] = None
    role: str = "authenticated"
    is_demo: bool = False
    metadata: Dict[str, Any] = {}

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> AuthenticatedUser:
    """
    Validates Supabase JWT from incoming Authorization: Bearer <token> header.
    In development with DEMO_MODE=True, safely provides the demonstration patient identity
    if no credentials or a demo token is supplied.
    """
    if not credentials:
        if settings.DEMO_MODE:
            logger.info("Demo mode: Providing Priya Sharma demo identity for uncredentialed request.")
            return AuthenticatedUser(
                id="00000000-0000-0000-0000-000000000001",
                email="priya.sharma@example.com",
                role="authenticated",
                is_demo=True,
                metadata={"full_name": "Priya Sharma"}
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Handle demo credentials in development mode
    if token in ("demo_jwt_token_medimate", "demo-token"):
        if settings.DEMO_MODE:
            return AuthenticatedUser(
                id="00000000-0000-0000-0000-000000000001",
                email="priya.sharma@example.com",
                role="authenticated",
                is_demo=True,
                metadata={"full_name": "Priya Sharma"}
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Demo tokens are disabled in production mode.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate real Supabase JWT
    if not settings.SUPABASE_JWT_SECRET:
        # If JWT secret is not yet configured, check if we're in demo mode
        if settings.DEMO_MODE:
            logger.warning("SUPABASE_JWT_SECRET not configured. Accepting token under DEMO_MODE.")
            try:
                unverified = jwt.decode(token, options={"verify_signature": False})
                return AuthenticatedUser(
                    id=unverified.get("sub", "00000000-0000-0000-0000-000000000001"),
                    email=unverified.get("email", "patient@medimate.ai"),
                    role=unverified.get("role", "authenticated"),
                    is_demo=False,
                    metadata=unverified.get("user_metadata", {})
                )
            except Exception:
                return AuthenticatedUser(
                    id="00000000-0000-0000-0000-000000000001",
                    email="priya.sharma@example.com",
                    role="authenticated",
                    is_demo=True
                )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server authentication configuration missing (SUPABASE_JWT_SECRET)."
        )

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience=settings.SUPABASE_AUDIENCE,
            options={"verify_exp": True}
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed token: missing subject claim.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return AuthenticatedUser(
            id=str(user_id),
            email=payload.get("email"),
            role=payload.get("role", "authenticated"),
            is_demo=False,
            metadata=payload.get("user_metadata", {})
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.error(f"JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
