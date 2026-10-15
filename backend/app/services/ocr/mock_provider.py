from typing import Dict, Any
from app.services.ocr.base import BaseOCRProvider, OCRResult

class MockOCRProvider(BaseOCRProvider):
    """
    Mock OCR Provider for local testing and development when external OCR credentials
    are not configured. Clearly labeled as mock.
    """
    def __init__(self, model_name: str = "mock-medical-ocr-v1"):
        self.model_name = model_name

    async def extract_text(self, file_bytes: bytes, mime_type: str, file_name: str) -> OCRResult:
        file_name_lower = file_name.lower()
        
        # Check for simulated test scenarios
        if "empty" in file_name_lower or len(file_bytes) == 0:
            return OCRResult(
                raw_text="",
                confidence=0.10,
                provider_name="mock",
                model_name=self.model_name,
                is_mock=True,
                page_count=1,
                metadata={"test_case": "empty"}
            )

        if "blurry" in file_name_lower or "illegible" in file_name_lower:
            return OCRResult(
                raw_text=(
                    "DR. [ILLEGIBLE] ... Clinic\n"
                    "Date: 28 Aug 2025\n"
                    "Patient: Priya Sharma\n"
                    "1. Tab. [ILLEGIBLE] 500mg - 1 tab [ILLEGIBLE] x 30 days\n"
                    "2. Tab. Vitamin D3 [ILLEGIBLE] - [ILLEGIBLE] weekly\n"
                ),
                confidence=0.45,
                provider_name="mock",
                model_name=self.model_name,
                is_mock=True,
                page_count=1,
                metadata={"test_case": "blurry_illegible"}
            )

        if "conflict" in file_name_lower:
            return OCRResult(
                raw_text=(
                    "DR. R. MEHTA, MD\n"
                    "General Physician\n"
                    "Date: 28 Aug 2025\n"
                    "Patient: Priya Sharma\n"
                    "1. Tab. Amoxicillin 500mg - Take 1 tab once daily, take 1 tab morning and night after food x 7 days\n"
                ),
                confidence=0.85,
                provider_name="mock",
                model_name=self.model_name,
                is_mock=True,
                page_count=1,
                metadata={"test_case": "conflicting_instructions"}
            )

        if "missing" in file_name_lower:
            return OCRResult(
                raw_text=(
                    "DR. R. MEHTA, MD\n"
                    "Date: 28 Aug 2025\n"
                    "1. Tab. Metformin - Take as directed\n"
                ),
                confidence=0.75,
                provider_name="mock",
                model_name=self.model_name,
                is_mock=True,
                page_count=1,
                metadata={"test_case": "missing_details"}
            )

        if "multi" in file_name_lower:
            return OCRResult(
                raw_text=(
                    "DR. R. MEHTA, MD\n"
                    "General Physician | Reg No: MED-74921\n"
                    "Metro Specialty Clinic, Bangalore\n"
                    "Date: 28 Aug 2025\n"
                    "Patient: Priya Sharma, 34F\n\n"
                    "Rx:\n"
                    "1. Tab. Metformin 500mg - 1 tab BID (twice daily) p.c. (after food) x 30 days\n"
                    "2. Tab. Atorvastatin 10mg - 1 tab HS (at bedtime) after food x 30 days\n"
                    "3. Tab. Vitamin D3 1000IU - 1 tab weekly with meal x 8 weeks\n"
                    "4. Tab. Pantoprazole 40mg - 1 tab OD empty stomach in morning x 14 days\n"
                    "5. Tab. Paracetamol 650mg - 1 tab SOS (as needed for fever/pain) max 3 tabs daily\n\n"
                    "Dr. R. Mehta [Signature]\n"
                ),
                confidence=0.96,
                provider_name="mock",
                model_name=self.model_name,
                is_mock=True,
                page_count=1,
                metadata={"test_case": "multi_medication"}
            )

        # Standard Dr. Mehta reference transcription matching Screen 3 and 4
        return OCRResult(
            raw_text=(
                "DR. R. MEHTA, MD\n"
                "General Physician | Reg No: MED-74921\n"
                "Metro Specialty Clinic, Bangalore\n"
                "Date: 28 Aug 2025\n"
                "Patient: Priya Sharma • Age: 34F\n\n"
                "Rx:\n"
                "1. Tab. Metformin 500mg - 1 tab BID (p.c.) after food x 30d\n"
                "2. Tab. Atorvastatin 10mg - 1 tab HS after food x 30d\n"
                "3. Tab. Vitamin D3 1000IU - 1 tab weekly with breakfast x 8w [dosage needs confirmation]\n\n"
                "Doctor Signature: Dr. Mehta (Signed)\n"
            ),
            confidence=0.92,
            provider_name="mock",
            model_name=self.model_name,
            is_mock=True,
            page_count=1,
            metadata={"notes": "Standard reference Dr. Mehta prescription transcription"}
        )
