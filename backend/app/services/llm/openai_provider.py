import json
import logging
from typing import Optional, List, Dict, Tuple, AsyncIterator
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

logger = logging.getLogger("medimate.llm.openai")

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

class OpenAILLMProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model or "gpt-4o-mini"

    async def parse_prescription_text(
        self,
        ocr_text: str,
        file_name: str
    ) -> ExtractedPrescriptionPayload:
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is not configured for OpenAILLMProvider")

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
                    response = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)

                if response.status_code == 429:
                    raise RuntimeError("OpenAI API rate limit exceeded.")
                if response.status_code != 200:
                    raise RuntimeError(f"OpenAI API returned HTTP {response.status_code}: {response.text}")

                data = response.json()
                choices = data.get("choices", [])
                if not choices:
                    raise RuntimeError("OpenAI returned empty completion choices.")

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
                    confidence_overall=float(parsed.get("confidence_overall", 0.92)),
                    uncertain_fields_count=int(parsed.get("uncertain_fields_count", len([m for m in meds if m.needs_confirmation]))),
                    provider_info=ProviderMetadata(
                        ocr_provider="openai_vision",
                        llm_provider="openai",
                        llm_model=self.model,
                        is_mock=False,
                        provider_notes=f"Extracted using OpenAI model {self.model}"
                    ),
                    safety_advisories=parsed.get("safety_advisories", []),
                    raw_ocr_text=ocr_text
                )

            except (json.JSONDecodeError, ValidationError) as ve:
                last_error = ve
                logger.warning(f"OpenAI output parsing failed on attempt {attempt + 1}: {ve}")
                continue
            except httpx.TimeoutException:
                raise RuntimeError("OpenAI LLM request timed out.")
            except Exception as e:
                raise RuntimeError(f"OpenAI LLM extraction failed: {str(e)}")

        raise RuntimeError(f"Failed to extract structured medication payload: {str(last_error)}")

    async def generate_chat_reply(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str,
        patient_context: str
    ) -> Tuple[str, str, bool]:
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is not configured.")

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        full_system = f"{system_instruction}\n\n[CONFIRMED PATIENT HEALTH CONTEXT]:\n{patient_context}"
        chat_messages = [{"role": "system", "content": full_system}]
        for m in messages:
            chat_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})

        payload = {
            "model": self.model,
            "messages": chat_messages,
            "temperature": 0.2,
            "max_tokens": 1024
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)

        if response.status_code == 429:
            raise RuntimeError("OpenAI rate limit exceeded.")
        if response.status_code != 200:
            raise RuntimeError(f"OpenAI API returned HTTP {response.status_code}: {response.text}")

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("OpenAI returned empty completion choices.")

        reply_text = choices[0].get("message", {}).get("content", "")
        return reply_text.strip(), self.model, False

    async def stream_chat_reply(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str,
        patient_context: str
    ) -> AsyncIterator[str]:
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is not configured.")

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        full_system = f"{system_instruction}\n\n[CONFIRMED PATIENT HEALTH CONTEXT]:\n{patient_context}"
        chat_messages = [{"role": "system", "content": full_system}]
        for m in messages:
            chat_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})

        payload = {
            "model": self.model,
            "messages": chat_messages,
            "temperature": 0.2,
            "max_tokens": 1024,
            "stream": True
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    raise RuntimeError(f"OpenAI streaming failed HTTP {response.status_code}: {err_body.decode()}")

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if not data_str or data_str == "[DONE]":
                            continue
                        try:
                            parsed = json.loads(data_str)
                            choices = parsed.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                text_piece = delta.get("content", "")
                                if text_piece:
                                    yield text_piece
                        except Exception:
                            continue

