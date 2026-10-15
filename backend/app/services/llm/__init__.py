import logging
from typing import Optional
from app.core.config import settings
from app.services.llm.base import BaseLLMProvider
from app.services.llm.mock_provider import MockLLMProvider
from app.services.llm.gemini_provider import GeminiLLMProvider
from app.services.llm.openai_provider import OpenAILLMProvider
from app.services.llm.groq_provider import GroqLLMProvider

logger = logging.getLogger("medimate.llm")

def get_llm_provider(provider_name: Optional[str] = None) -> BaseLLMProvider:
    name = (provider_name or settings.DEFAULT_LLM_PROVIDER or "mock").lower()

    if name in ("gemini", "google"):
        if settings.GEMINI_API_KEY:
            logger.info("Initializing GeminiLLMProvider")
            return GeminiLLMProvider(
                api_key=settings.GEMINI_API_KEY,
                model=settings.LLM_MODEL or "gemini-1.5-flash"
            )
        logger.warning("GEMINI_API_KEY not configured. Falling back to MockLLMProvider.")
        return MockLLMProvider()

    if name in ("openai", "gpt"):
        if settings.OPENAI_API_KEY:
            logger.info("Initializing OpenAILLMProvider")
            return OpenAILLMProvider(
                api_key=settings.OPENAI_API_KEY,
                model=settings.LLM_MODEL or "gpt-4o-mini"
            )
        logger.warning("OPENAI_API_KEY not configured. Falling back to MockLLMProvider.")
        return MockLLMProvider()

    if name == "groq":
        if settings.GROQ_API_KEY:
            logger.info("Initializing GroqLLMProvider")
            return GroqLLMProvider(
                api_key=settings.GROQ_API_KEY,
                model=settings.LLM_MODEL or "llama-3.3-70b-versatile"
            )
        logger.warning("GROQ_API_KEY not configured. Falling back to MockLLMProvider.")
        return MockLLMProvider()

    # Default fallback
    return MockLLMProvider()

__all__ = [
    "BaseLLMProvider",
    "MockLLMProvider",
    "GeminiLLMProvider",
    "OpenAILLMProvider",
    "GroqLLMProvider",
    "get_llm_provider",
]
