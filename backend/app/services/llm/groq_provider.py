import json
import logging
from typing import Optional
import httpx
from pydantic import ValidationError
from app.schemas.prescription import (
    ExtractedPrescriptionPayload,
    ExtractedMedicationItem,
    PrescriptionDoctorDetails,
    PrescriptionPatientDetails,
    ProviderMetadata
)
from app.services.llm.base import BaseLLMProvider
from app.services.llm.gemini_provider import MEDICAL_EXTRACTION_SYSTEM_PROMPT

logger = logging.getLogger("medimate.llm.groq")

class GroqLLMProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: str = "llama-3.3-70b-versatile"):
        self.api_key = api_key
        self.model = model or "llama-3.3-70b-versatile"

    async def parse_prescription_text(
        self,
        ocr_text: str,
        file_name: str
    ) -> ExtractedPrescriptionPayload:
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not configured for GroqLLMProvider")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": MEDICAL_EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": f"Filename: {file_name}\n\nPrescription OCR Text:\n{ocr_text}"}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.0,
            "max_tokens": 2048
        }

        last_error = None
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)

                if response.status_code == 429:
                    raise RuntimeError("Groq API rate limit exceeded.")
                if response.status_code != 200:
                    raise RuntimeError(f"Groq API returned HTTP {response.status_code}: {response.text}")

                data = response.json()
                choices = data.get("choices", [])
                if not choices:
                    raise RuntimeError("Groq returned empty completion choices.")

                raw_json_str = choices[0].get("message", {}).get("content", "{}")
                parsed = json.loads(raw_json_str)

                meds = [ExtractedMedicationItem(**m) for m in parsed.get("medicines", [])]
                doc = PrescriptionDoctorDetails(**(parsed.get("doctor") or {}))
                patient = PrescriptionPatientDetails(**(parsed.get("patient") or {}))

                return ExtractedPrescriptionPayload(
                    doctor=doc,
                    patient=patient,
                    prescription_date=parsed.get("prescription_date"),
                    medicines=meds,
                    confidence_overall=float(parsed.get("confidence_overall", 0.90)),
                    uncertain_fields_count=int(parsed.get("uncertain_fields_count", len([m for m in meds if m.needs_confirmation]))),
                    provider_info=ProviderMetadata(
                        ocr_provider="mock",
                        llm_provider="groq",
                        llm_model=self.model,
                        is_mock=False,
                        provider_notes=f"Extracted using Groq model {self.model}"
                    ),
                    safety_advisories=parsed.get("safety_advisories", []),
                    raw_ocr_text=ocr_text
                )

            except (json.JSONDecodeError, ValidationError) as ve:
                last_error = ve
                logger.warning(f"Groq output parsing failed on attempt {attempt + 1}: {ve}")
                continue
            except httpx.TimeoutException:
                raise RuntimeError("Groq LLM request timed out.")
            except Exception as e:
                raise RuntimeError(f"Groq LLM extraction failed: {str(e)}")

        raise RuntimeError(f"Failed to extract structured medication payload: {str(last_error)}")
