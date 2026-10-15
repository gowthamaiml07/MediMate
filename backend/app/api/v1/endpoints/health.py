from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE,
        "llm_provider": settings.DEFAULT_LLM_PROVIDER,
        "ocr_provider": settings.DEFAULT_OCR_PROVIDER
    }
