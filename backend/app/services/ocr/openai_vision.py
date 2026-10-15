import base64
import logging
from typing import Optional
import httpx
from app.services.ocr.base import BaseOCRProvider, OCRResult

logger = logging.getLogger("medimate.ocr.openai")

class OpenAIVisionOCRProvider(BaseOCRProvider):
    """
    OpenAI Multimodal Vision OCR Provider (e.g. gpt-4o-mini, gpt-4o).
    Extracts text verbatim from prescription images.
    """
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model or "gpt-4o-mini"

    async def extract_text(self, file_bytes: bytes, mime_type: str, file_name: str) -> OCRResult:
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is not configured for OpenAIVisionOCRProvider")

        base64_data = base64.b64encode(file_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{base64_data}"
        
        prompt = (
            "You are an expert clinical document transcription OCR engine. "
            "Transcribe every line, word, number, and medical symbol visible in this prescription document verbatim. "
            "Preserve doctor details, hospital/clinic information, dates, patient details, and medication lines. "
            "If any handwriting or text is illegible or torn, write [ILLEGIBLE]. "
            "Do NOT infer, invent, or guess numbers, units, dosages, or instructions."
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url}
                        }
                    ]
                }
            ],
            "max_tokens": 2048,
            "temperature": 0.1
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)

            if response.status_code == 429:
                raise RuntimeError("OpenAI API rate limit exceeded. Please try again shortly.")
            if response.status_code != 200:
                logger.error(f"OpenAI OCR error: {response.status_code} - {response.text}")
                raise RuntimeError(f"OpenAI API returned status code {response.status_code}")

            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                raise RuntimeError("OpenAI OCR returned no completion choices.")

            transcription = choices[0].get("message", {}).get("content", "").strip()

            return OCRResult(
                raw_text=transcription,
                confidence=0.94,
                provider_name="openai_vision",
                model_name=self.model,
                is_mock=False,
                page_count=1,
                metadata={"provider": "openai", "model": self.model}
            )

        except httpx.TimeoutException:
            logger.error("OpenAI Vision OCR request timed out.")
            raise RuntimeError("OpenAI Vision OCR service timed out.")
        except Exception as e:
            logger.error(f"OpenAI Vision OCR failed: {str(e)}")
            raise
