from abc import ABC, abstractmethod
from typing import AsyncIterator, List, Dict, Tuple
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

    @abstractmethod
    async def generate_chat_reply(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str,
        patient_context: str
    ) -> Tuple[str, str, bool]:
        """
        Generates conversational healthcare reply.
        Returns: (reply_text: str, model_name: str, is_mock: bool)
        """
        pass

    @abstractmethod
    async def stream_chat_reply(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str,
        patient_context: str
    ) -> AsyncIterator[str]:
        """
        Streams conversational healthcare reply token by token / chunk by chunk.
        """
        pass
