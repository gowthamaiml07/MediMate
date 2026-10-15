from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel

class OCRResult(BaseModel):
    raw_text: str
    confidence: float
    provider_name: str
    model_name: Optional[str] = None
    is_mock: bool = False
    page_count: int = 1
    metadata: Dict[str, Any] = {}

class BaseOCRProvider(ABC):
    @abstractmethod
    async def extract_text(self, file_bytes: bytes, mime_type: str, file_name: str) -> OCRResult:
        """
        Extract readable raw text from a prescription document (PDF or image).
        Preserves original handwritten or printed characters verbatim.
        """
        pass
