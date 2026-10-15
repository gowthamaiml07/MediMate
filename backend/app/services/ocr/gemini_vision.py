import base64
import logging
from typing import Optional
import httpx
from app.services.ocr.base import BaseOCRProvider, OCRResult

logger = logging.getLogger("medimate.ocr.gemini")

class GeminiVisionOCRProvider(BaseOCRProvider):
    """
    Google Gemini Multimodal Vision OCR Provider.
    Extracts text verbatim from prescription images and PDFs.
    """
    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model or "gemini-1.5-flash"

    async def extract_text(self, file_bytes: bytes, mime_type: str, file_name: str) -> OCRResult:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured for GeminiVisionOCRProvider")

        base64_data = base64.b64encode(file_bytes).decode("utf-8")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        
        prompt = (
            "You are an expert clinical document transcription OCR engine. "
            "Transcribe every line, word, number, and medical symbol visible in this prescription document verbatim. "
            "Preserve doctor details, hospital/clinic information, dates, patient details, and medication lines. "
            "If any handwriting or text is illegible or torn, write [ILLEGIBLE]. "
            "Do NOT infer, invent, or guess numbers, units, dosages, or instructions."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64_data
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 2048
            }
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)

            if response.status_code == 429:
                raise RuntimeError("Gemini API rate limit exceeded. Please try again shortly.")
            if response.status_code != 200:
                logger.error(f"Gemini OCR error: {response.status_code} - {response.text}")
                raise RuntimeError(f"Gemini API returned status code {response.status_code}")

            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise RuntimeError("Gemini OCR returned an empty candidate list.")

            content_parts = candidates[0].get("content", {}).get("parts", [])
            transcription = "".join([p.get("text", "") for p in content_parts]).strip()

            return OCRResult(
                raw_text=transcription,
                confidence=0.92,
                provider_name="gemini_vision",
                model_name=self.model,
                is_mock=False,
                page_count=1,
                metadata={"provider": "gemini", "model": self.model}
            )

        except httpx.TimeoutException:
            logger.error("Gemini Vision OCR request timed out.")
            raise RuntimeError("Gemini Vision OCR service timed out.")
        except Exception as e:
            logger.error(f"Gemini Vision OCR failed: {str(e)}")
            raise
