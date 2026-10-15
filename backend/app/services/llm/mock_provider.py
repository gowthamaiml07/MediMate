import uuid
from typing import List
from app.schemas.prescription import (
    ExtractedPrescriptionPayload,
    ExtractedMedicationItem,
    PrescriptionDoctorDetails,
    PrescriptionPatientDetails,
    ProviderMetadata
)
from app.services.llm.base import BaseLLMProvider

class MockLLMProvider(BaseLLMProvider):
    """
    Mock LLM Provider for local development and offline testing.
    Produces deterministic, schema-compliant medical extractions with explicit mock labeling.
    """
    def __init__(self, model_name: str = "mock-medical-llm-v1"):
        self.model_name = model_name

    async def parse_prescription_text(
        self,
        ocr_text: str,
        file_name: str
    ) -> ExtractedPrescriptionPayload:
        text_lower = (ocr_text or "").lower()
        file_lower = (file_name or "").lower()

        # 1. Empty or illegible document scenario
        if not ocr_text or len(ocr_text.strip()) == 0 or "empty" in file_lower:
            return ExtractedPrescriptionPayload(
                doctor=PrescriptionDoctorDetails(doctor_name=None, speciality=None, confidence=0.0),
                patient=PrescriptionPatientDetails(patient_name=None, age=None, gender=None, confidence=0.0),
                prescription_date=None,
                medicines=[],
                confidence_overall=0.0,
                uncertain_fields_count=0,
                provider_info=ProviderMetadata(
                    ocr_provider="mock",
                    llm_provider="mock",
                    llm_model=self.model_name,
                    is_mock=True,
                    provider_notes="Mock LLM executed in local development mode."
                ),
                safety_advisories=[
                    "No readable prescription text was found. Please ensure the document is clear, well-lit, and not obstructed."
                ],
                raw_ocr_text=ocr_text
            )

        # 2. Blurry / Illegible handwriting scenario
        if "[illegible]" in text_lower or "blurry" in file_lower or "illegible" in file_lower:
            meds: List[ExtractedMedicationItem] = [
                ExtractedMedicationItem(
                    id=str(uuid.uuid4()),
                    name="[Illegible Medication]",
                    strength="500mg",
                    formulation="Tablet",
                    dosage_instructions="1 tab [ILLEGIBLE] x 30 days",
                    instructions="Take as instructed",
                    route="Oral",
                    frequency=None,
                    timing_relation="After food",
                    duration="30 days",
                    quantity=None,
                    confidence=0.45,
                    source_text="1. Tab. [ILLEGIBLE] 500mg - 1 tab [ILLEGIBLE] x 30 days",
                    is_unclear=True,
                    has_conflicting_instructions=False,
                    missing_fields=["medication_name", "frequency"],
                    needs_confirmation=True
                ),
                ExtractedMedicationItem(
                    id=str(uuid.uuid4()),
                    name="Vitamin D3",
                    strength=None,
                    formulation="Tablet",
                    dosage_instructions="[ILLEGIBLE] weekly",
                    instructions="Weekly",
                    route="Oral",
                    frequency="Once weekly",
                    timing_relation="After food",
                    duration=None,
                    quantity=None,
                    confidence=0.48,
                    source_text="2. Tab. Vitamin D3 [ILLEGIBLE] - [ILLEGIBLE] weekly",
                    is_unclear=True,
                    has_conflicting_instructions=False,
                    missing_fields=["strength", "duration"],
                    needs_confirmation=True
                )
            ]
            return ExtractedPrescriptionPayload(
                doctor=PrescriptionDoctorDetails(
                    doctor_name="[Unclear Doctor Name]",
                    speciality="General Physician",
                    confidence=0.50
                ),
                patient=PrescriptionPatientDetails(
                    patient_name="Priya Sharma",
                    confidence=0.70
                ),
                prescription_date="28 Aug 2025",
                medicines=meds,
                confidence_overall=0.46,
                uncertain_fields_count=2,
                provider_info=ProviderMetadata(
                    ocr_provider="mock",
                    llm_provider="mock",
                    llm_model=self.model_name,
                    is_mock=True,
                    provider_notes="Simulated blurry/illegible OCR & LLM extraction."
                ),
                safety_advisories=[
                    "Critical Safety Warning: One or more medications on this prescription are illegible or missing vital dosage parameters. Please contact your prescribing physician or pharmacist before taking."
                ],
                raw_ocr_text=ocr_text
            )

        # 3. Conflicting instructions scenario
        if "conflict" in text_lower or "conflict" in file_lower:
            meds = [
                ExtractedMedicationItem(
                    id=str(uuid.uuid4()),
                    name="Amoxicillin",
                    strength="500mg",
                    formulation="Tablet",
                    dosage_instructions="Take 1 tab once daily, take 1 tab morning and night after food x 7 days",
                    instructions="Conflicting: once daily vs morning and night",
                    route="Oral",
                    frequency="Conflicting instructions",
                    timing_relation="After food",
                    duration="7 days",
                    quantity=None,
                    confidence=0.60,
                    source_text="1. Tab. Amoxicillin 500mg - Take 1 tab once daily, take 1 tab morning and night after food x 7 days",
                    is_unclear=False,
                    has_conflicting_instructions=True,
                    missing_fields=[],
                    needs_confirmation=True
                )
            ]
            return ExtractedPrescriptionPayload(
                doctor=PrescriptionDoctorDetails(
                    doctor_name="Dr. R. Mehta",
                    speciality="General Physician",
                    confidence=0.95
                ),
                patient=PrescriptionPatientDetails(
                    patient_name="Priya Sharma",
                    confidence=0.95
                ),
                prescription_date="28 Aug 2025",
                medicines=meds,
                confidence_overall=0.60,
                uncertain_fields_count=1,
                provider_info=ProviderMetadata(
                    ocr_provider="mock",
                    llm_provider="mock",
                    llm_model=self.model_name,
                    is_mock=True,
                    provider_notes="Simulated conflicting prescription instructions."
                ),
                safety_advisories=[
                    "Contradictory dosage frequency was detected for Amoxicillin ('once daily' vs 'morning and night'). Do not consume until confirmed with your clinician."
                ],
                raw_ocr_text=ocr_text
            )

        # 4. Missing fields scenario
        if "missing" in text_lower or "missing" in file_lower:
            meds = [
                ExtractedMedicationItem(
                    id=str(uuid.uuid4()),
                    name="Metformin",
                    strength=None,
                    formulation="Tablet",
                    dosage_instructions="Take as directed",
                    instructions="As directed",
                    route="Oral",
                    frequency=None,
                    timing_relation="After food",
                    duration=None,
                    quantity=None,
                    confidence=0.70,
                    source_text="1. Tab. Metformin - Take as directed",
                    is_unclear=False,
                    has_conflicting_instructions=False,
                    missing_fields=["strength", "frequency", "duration"],
                    needs_confirmation=True
                )
            ]
            return ExtractedPrescriptionPayload(
                doctor=PrescriptionDoctorDetails(
                    doctor_name="Dr. R. Mehta",
                    speciality="General Physician",
                    confidence=0.90
                ),
                patient=PrescriptionPatientDetails(
                    patient_name="Priya Sharma",
                    confidence=0.90
                ),
                prescription_date="28 Aug 2025",
                medicines=meds,
                confidence_overall=0.70,
                uncertain_fields_count=1,
                provider_info=ProviderMetadata(
                    ocr_provider="mock",
                    llm_provider="mock",
                    llm_model=self.model_name,
                    is_mock=True,
                    provider_notes="Simulated missing dosage parameters."
                ),
                safety_advisories=[
                    "Strength and specific dosage instructions were not specified on the prescription. Manual review required."
                ],
                raw_ocr_text=ocr_text
            )

        # 5. Multiple medications scenario
        if "multi" in file_lower or "pantoprazole" in text_lower:
            meds = [
                ExtractedMedicationItem(
                    id=str(uuid.uuid4()),
                    name="Metformin",
                    strength="500mg",
                    formulation="Tablet",
                    dosage_instructions="1 tab twice daily (BID) after food",
                    instructions="After food",
                    route="Oral",
                    frequency="Twice daily",
                    timing_relation="After food",
                    duration="30 days",
                    quantity="60 tabs",
                    confidence=0.95,
                    source_text="1. Tab. Metformin 500mg - 1 tab BID (twice daily) p.c. (after food) x 30 days",
                    is_unclear=False,
                    has_conflicting_instructions=False,
                    missing_fields=[],
                    needs_confirmation=False
                ),
                ExtractedMedicationItem(
                    id=str(uuid.uuid4()),
                    name="Atorvastatin",
                    strength="10mg",
                    formulation="Tablet",
                    dosage_instructions="1 tab at bedtime (HS) after food",
                    instructions="At bedtime",
                    route="Oral",
                    frequency="Once daily at night",
                    timing_relation="At bedtime",
                    duration="30 days",
                    quantity="30 tabs",
                    confidence=0.92,
                    source_text="2. Tab. Atorvastatin 10mg - 1 tab HS (at bedtime) after food x 30 days",
                    is_unclear=False,
                    has_conflicting_instructions=False,
                    missing_fields=[],
                    needs_confirmation=False
                ),
                ExtractedMedicationItem(
                    id=str(uuid.uuid4()),
                    name="Vitamin D3",
                    strength="1000IU",
                    formulation="Tablet",
                    dosage_instructions="1 tab once weekly with meal",
                    instructions="With a meal",
                    route="Oral",
                    frequency="Once weekly",
                    timing_relation="With food",
                    duration="8 weeks",
                    quantity="8 tabs",
                    confidence=0.88,
                    source_text="3. Tab. Vitamin D3 1000IU - 1 tab weekly with meal x 8 weeks",
                    is_unclear=False,
                    has_conflicting_instructions=False,
                    missing_fields=[],
                    needs_confirmation=True
                ),
                ExtractedMedicationItem(
                    id=str(uuid.uuid4()),
                    name="Pantoprazole",
                    strength="40mg",
                    formulation="Tablet",
                    dosage_instructions="1 tab once daily on empty stomach in morning",
                    instructions="Empty stomach",
                    route="Oral",
                    frequency="Once daily in morning",
                    timing_relation="Empty stomach",
                    duration="14 days",
                    quantity="14 tabs",
                    confidence=0.94,
                    source_text="4. Tab. Pantoprazole 40mg - 1 tab OD empty stomach in morning x 14 days",
                    is_unclear=False,
                    has_conflicting_instructions=False,
                    missing_fields=[],
                    needs_confirmation=False
                ),
                ExtractedMedicationItem(
                    id=str(uuid.uuid4()),
                    name="Paracetamol",
                    strength="650mg",
                    formulation="Tablet",
                    dosage_instructions="1 tab as needed for fever/pain (max 3 tabs daily)",
                    instructions="As needed",
                    route="Oral",
                    frequency="As needed (SOS)",
                    timing_relation="After food",
                    duration="As needed",
                    quantity=None,
                    confidence=0.90,
                    source_text="5. Tab. Paracetamol 650mg - 1 tab SOS (as needed for fever/pain) max 3 tabs daily",
                    is_unclear=False,
                    has_conflicting_instructions=False,
                    missing_fields=[],
                    needs_confirmation=False
                )
            ]
            return ExtractedPrescriptionPayload(
                doctor=PrescriptionDoctorDetails(
                    doctor_name="Dr. R. Mehta",
                    speciality="General Physician",
                    hospital_clinic="Metro Specialty Clinic, Bangalore",
                    license_number="MED-74921",
                    confidence=0.96
                ),
                patient=PrescriptionPatientDetails(
                    patient_name="Priya Sharma",
                    age="34F",
                    gender="Female",
                    confidence=0.95
                ),
                prescription_date="28 Aug 2025",
                medicines=meds,
                confidence_overall=0.92,
                uncertain_fields_count=1,
                provider_info=ProviderMetadata(
                    ocr_provider="mock",
                    llm_provider="mock",
                    llm_model=self.model_name,
                    is_mock=True,
                    provider_notes="Multi-medication prescription extracted in mock development mode."
                ),
                safety_advisories=[
                    "Please verify Vitamin D3 dosage instructions with your physician or pharmacist."
                ],
                raw_ocr_text=ocr_text
            )

        # Standard Dr. Mehta 3-medication extraction matching reference screens
        standard_meds = [
            ExtractedMedicationItem(
                id=str(uuid.uuid4()),
                name="Metformin",
                strength="500mg",
                formulation="Tablet",
                dosage_instructions="1 tab twice daily after food",
                instructions="After food",
                route="Oral",
                frequency="Twice daily after food",
                timing_relation="After food",
                duration="30 days",
                quantity="60 tabs",
                confidence=0.95,
                source_text="1. Tab. Metformin 500mg - 1 tab BID (p.c.) after food x 30d",
                is_unclear=False,
                has_conflicting_instructions=False,
                missing_fields=[],
                needs_confirmation=False
            ),
            ExtractedMedicationItem(
                id=str(uuid.uuid4()),
                name="Atorvastatin",
                strength="10mg",
                formulation="Tablet",
                dosage_instructions="1 tab once daily at bedtime",
                instructions="At bedtime",
                route="Oral",
                frequency="Once daily at night",
                timing_relation="At bedtime",
                duration="30 days",
                quantity="30 tabs",
                confidence=0.92,
                source_text="2. Tab. Atorvastatin 10mg - 1 tab HS after food x 30d",
                is_unclear=False,
                has_conflicting_instructions=False,
                missing_fields=[],
                needs_confirmation=False
            ),
            ExtractedMedicationItem(
                id=str(uuid.uuid4()),
                name="Vitamin D3",
                strength="1000IU",
                formulation="Tablet",
                dosage_instructions="1 tab once weekly with breakfast",
                instructions="With a meal",
                route="Oral",
                frequency="Once weekly",
                timing_relation="With food",
                duration="8 weeks",
                quantity="8 tabs",
                confidence=0.88,
                source_text="3. Tab. Vitamin D3 1000IU - 1 tab weekly with breakfast x 8w [dosage needs confirmation]",
                is_unclear=False,
                has_conflicting_instructions=False,
                missing_fields=[],
                needs_confirmation=True
            )
        ]

        return ExtractedPrescriptionPayload(
            doctor=PrescriptionDoctorDetails(
                doctor_name="Dr. R. Mehta",
                speciality="General Physician",
                hospital_clinic="Metro Specialty Clinic, Bangalore",
                license_number="MED-74921",
                confidence=0.95
            ),
            patient=PrescriptionPatientDetails(
                patient_name="Priya Sharma",
                age="34F",
                gender="Female",
                confidence=0.95
            ),
            prescription_date="28 Aug 2025",
            medicines=standard_meds,
            confidence_overall=0.92,
            uncertain_fields_count=1,
            provider_info=ProviderMetadata(
                ocr_provider="mock",
                llm_provider="mock",
                llm_model=self.model_name,
                is_mock=True,
                provider_notes="Dr. Mehta reference prescription extracted in mock development mode."
            ),
            safety_advisories=[
                "Vitamin D3 has an uncertainty note. Please check dosage before confirming."
            ],
            raw_ocr_text=ocr_text
        )
