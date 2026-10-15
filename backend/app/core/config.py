import os
from typing import List, Optional
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "MediMate API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() in ("true", "1")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ]
    
    # LLM Providers (OpenAI, Gemini, Groq, Mock)
    DEFAULT_LLM_PROVIDER: str = os.getenv("DEFAULT_LLM_PROVIDER", "gemini")
    LLM_MODEL: Optional[str] = os.getenv("LLM_MODEL", None)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")
    
    # OCR Services (mock, gemini_vision, openai_vision)
    DEFAULT_OCR_PROVIDER: str = os.getenv("DEFAULT_OCR_PROVIDER", "mock")
    OCR_MODEL: Optional[str] = os.getenv("OCR_MODEL", None)
    OCR_API_KEY: Optional[str] = os.getenv("OCR_API_KEY")

    # Document Upload & Storage Settings
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit matching database constraint
    ALLOWED_UPLOAD_MIME_TYPES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ]
    ALLOWED_UPLOAD_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".webp", ".pdf"]
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "storage/prescriptions")
    SIGNED_URL_EXPIRATION_SECONDS: int = 900  # 15 minutes short-lived link
    
    # Supabase / Database Integration
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY: Optional[str] = os.getenv("SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    SUPABASE_JWT_SECRET: Optional[str] = os.getenv("SUPABASE_JWT_SECRET")
    SUPABASE_AUDIENCE: str = os.getenv("SUPABASE_AUDIENCE", "authenticated")
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")

settings = Settings()

