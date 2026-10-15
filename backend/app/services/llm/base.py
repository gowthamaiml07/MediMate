from abc import ABC, abstractmethod
from app.schemas.prescription import ExtractedPrescriptionPayload

class BaseLLMProvider(ABC):
    @abstractmethod
    async def parse_prescription_text(
        self,
        ocr_text: str,
        file_name: str
    ) -> ExtractedPrescriptionPayload:
        """
        Parses OCR transcribed prescription text into strict Pydantic ExtractedPrescriptionPayload.
        Enforces zero-hallucination medical safety constraints.
        """
        pass
