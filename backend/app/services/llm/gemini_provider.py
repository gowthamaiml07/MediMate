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

logger = logging.getLogger("medimate.llm.gemini")

MEDICAL_EXTRACTION_SYSTEM_PROMPT = """
You are a medical prescription data extraction engine. You extract structured medication information from prescription OCR text.
You MUST adhere strictly to these CRITICAL MEDICAL SAFETY RULES:
1. NEVER invent missing medication details. If a dose, frequency, duration, or route is absent, set it to null and include it in 'missing_fields'.
2. NEVER guess a dose, frequency, duration, route, or administration time.
3. Do NOT silently resolve conflicting instructions. If instructions conflict, set 'has_conflicting_instructions' to true and 'needs_confirmation' to true.
4. Mark unclear, illegible, or low-confidence fields with 'is_unclear': true and 'needs_confirmation': true.
5. Provide the verbatim 'source_text' from the OCR text for every extracted medicine.
6. Return purely valid JSON with no markdown formatting or commentary.

Return JSON in this structure:
{
  "doctor": {"doctor_name": string or null, "speciality": string or null, "hospital_clinic": string or null, "license_number": string or null},
  "patient": {"patient_name": string or null, "age": string or null, "gender": string or null},
  "prescription_date": string or null,
  "medicines": [
    {
      "name": string,
      "strength": string or null,
      "formulation": string or null,
      "dosage_instructions": string or null,
      "instructions": string or null,
      "route": string or null,
      "frequency": string or null,
      "timing_relation": "Before food" | "After food" | "With food" | "Empty stomach" | "At bedtime",
      "duration": string or null,
      "quantity": string or null,
      "refills": string or null,
      "confidence": float (0.0 to 1.0),
      "source_text": string,
      "is_unclear": boolean,
      "has_conflicting_instructions": boolean,
      "missing_fields": [string],
      "needs_confirmation": boolean
    }
  ],
  "confidence_overall": float (0.0 to 1.0),
  "uncertain_fields_count": integer,
  "safety_advisories": [string]
}
"""

class GeminiLLMProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model or "gemini-1.5-flash"

    async def parse_prescription_text(
        self,
        ocr_text: str,
        file_name: str
    ) -> ExtractedPrescriptionPayload:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured for GeminiLLMProvider")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        user_content = f"Prescription Document Filename: {file_name}\n\nPrescription OCR Text:\n{ocr_text}"

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": MEDICAL_EXTRACTION_SYSTEM_PROMPT},
                        {"text": user_content}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "application/json"
            }
        }

        # Safe limited retry loop for transient failures or malformed JSON
        last_error = None
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, json=payload)

                if response.status_code == 429:
                    raise RuntimeError("Gemini API rate limit exceeded.")
                if response.status_code != 200:
                    raise RuntimeError(f"Gemini API returned HTTP {response.status_code}: {response.text}")

                data = response.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    raise RuntimeError("Gemini returned empty candidate choices.")

                raw_json_str = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
                parsed = json.loads(raw_json_str)

                # Validate against strict Pydantic models
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
                        ocr_provider="gemini_vision",
                        llm_provider="gemini",
                        llm_model=self.model,
                        is_mock=False,
                        provider_notes=f"Extracted using Gemini API model {self.model}"
                    ),
                    safety_advisories=parsed.get("safety_advisories", []),
                    raw_ocr_text=ocr_text
                )

            except (json.JSONDecodeError, ValidationError) as ve:
                last_error = ve
                logger.warning(f"Gemini output parsing/validation failed on attempt {attempt + 1}: {ve}")
                # Retry once
                continue
            except httpx.TimeoutException:
                raise RuntimeError("Gemini LLM request timed out.")
            except Exception as e:
                raise RuntimeError(f"Gemini LLM extraction failed: {str(e)}")

        raise RuntimeError(f"Failed to extract structured medication payload after retries: {str(last_error)}")
