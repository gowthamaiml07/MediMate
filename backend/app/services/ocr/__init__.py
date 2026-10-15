import logging
from typing import Optional
from app.core.config import settings
from app.services.ocr.base import BaseOCRProvider, OCRResult
from app.services.ocr.mock_provider import MockOCRProvider
from app.services.ocr.gemini_vision import GeminiVisionOCRProvider
from app.services.ocr.openai_vision import OpenAIVisionOCRProvider

logger = logging.getLogger("medimate.ocr")

def get_ocr_provider(provider_name: Optional[str] = None) -> BaseOCRProvider:
    name = (provider_name or settings.DEFAULT_OCR_PROVIDER or "mock").lower()

    if name in ("gemini_vision", "gemini", "google"):
        if settings.GEMINI_API_KEY:
            logger.info("Initializing GeminiVisionOCRProvider")
            return GeminiVisionOCRProvider(
                api_key=settings.GEMINI_API_KEY,
                model=settings.OCR_MODEL or "gemini-1.5-flash"
            )
        logger.warning("GEMINI_API_KEY not configured. Falling back to MockOCRProvider.")
        return MockOCRProvider()

    if name in ("openai_vision", "openai"):
        if settings.OPENAI_API_KEY:
            logger.info("Initializing OpenAIVisionOCRProvider")
            return OpenAIVisionOCRProvider(
                api_key=settings.OPENAI_API_KEY,
                model=settings.OCR_MODEL or "gpt-4o-mini"
            )
        logger.warning("OPENAI_API_KEY not configured. Falling back to MockOCRProvider.")
        return MockOCRProvider()

    # Default fallback
    return MockOCRProvider()

__all__ = [
    "BaseOCRProvider",
    "OCRResult",
    "MockOCRProvider",
    "GeminiVisionOCRProvider",
    "OpenAIVisionOCRProvider",
    "get_ocr_provider",
]
