import uuid
import asyncio
from typing import List, Dict, Tuple, AsyncIterator
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

    def _synthesize_mock_reply(self, query: str, patient_context: str) -> str:
        q = (query or "").lower().strip()
        ctx_lower = (patient_context or "").lower()

        # 1. Suggested prompt: "Help me understand my prescription instructions"
        if "understand my prescription" in q or "prescription instructions" in q:
            return (
                "Here is an overview of how to understand your prescription instructions:\n\n"
                "• **Medication Name & Strength:** Identifies the active therapeutic drug and the exact amount per unit (e.g. 500mg).\n"
                "• **Frequency & Timing:** 'BID' means twice daily, 'OD' means once daily, and 'Weekly' means once a week. 'p.c.' means post cibum (after meals).\n"
                "• **Route & Formulation:** Usually oral tablets or capsules taken with a full glass of water.\n\n"
                "**Your Active Prescriptions Breakdown:**\n"
                "1. **Metformin 500mg:** Take 1 tablet twice daily (08:00 AM & 01:00 PM) after meals with water.\n"
                "2. **Atorvastatin 10mg:** Take 1 tablet once daily at night (10:00 PM). Avoid grapefruit.\n"
                "3. **Vitamin D3 1000IU:** Take 1 capsule weekly with breakfast.\n\n"
                "Always check your confirmed medication list and consult your doctor if any instruction appears unclear."
            )

        # 2. Suggested prompt: "What does this medicine information mean?"
        if "what does this medicine information mean" in q or "medicine information mean" in q or "interpret medicine" in q:
            return (
                "Medicine information provides essential clinical guidance about how a drug works, proper administration, and safe usage:\n\n"
                "• **Active Ingredient:** The chemical compound that produces the therapeutic benefit (e.g., Metformin for glycemic control).\n"
                "• **Indications:** The specific medical conditions the drug is prescribed to manage.\n"
                "• **Timing Relation:** Indicates whether to take the medicine before food (a.c.), after food (p.c.), or at bedtime (h.s.) to optimize absorption or prevent stomach upset.\n"
                "• **Common Side Effects:** Expected, mild physiological reactions (such as temporary nausea or dry cough) that usually resolve as your body adapts.\n\n"
                "You can inspect verified monographs for each of your medications directly in MediMate."
            )

        # 3. Suggested prompt: "Show my upcoming appointments"
        if "upcoming appointment" in q or "show my appointment" in q or "when is my next appointment" in q:
            if "upcoming scheduled appointments" in ctx_lower and "no upcoming appointments" not in ctx_lower:
                return (
                    "**Your Upcoming Scheduled Appointments:**\n\n"
                    "• **Dr. S. Kumar** (Endocrinologist & Diabetologist)\n"
                    "  Date & Time: **12 Sep 2025 at 10:30 AM**\n"
                    "  Location: Apollo Clinic, Sector 7 [In-Person]\n\n"
                    "You can generate a Doctor Visit Summary from your navigation menu to take along your active medication list and adherence records."
                )
            else:
                return (
                    "You currently do not have any upcoming appointments scheduled in your MediMate calendar. "
                    "You can schedule a new doctor consultation anytime from the Appointments page."
                )

        # 4. Suggested prompt: "Help me prepare questions for my doctor"
        if "prepare questions" in q or "questions for my doctor" in q:
            return (
                "Here are recommended questions to ask your doctor during your upcoming visit:\n\n"
                "1. **Treatment Goals:** 'Are my current blood sugar and cholesterol levels within target ranges on my current regimen?'\n"
                "2. **Side Effect Management:** 'Are the mild digestive symptoms I occasionally experience expected, and how can I minimize them?'\n"
                "3. **Duration & Refills:** 'How long will I continue this current dosage before we recheck lab work?'\n"
                "4. **Interactions:** 'Are there any over-the-counter supplements or pain relievers I should avoid with my current prescriptions?'\n"
                "5. **Lifestyle Alignment:** 'What specific dietary or activity adjustments would best complement my medication plan?'\n\n"
                "Tip: You can print or download your Doctor Summary report from MediMate to share with your physician."
            )

        # 5. Suggested prompt: "Explain how medication reminders work"
        if "medication reminders work" in q or "how do reminders work" in q:
            return (
                "**How MediMate Medication Reminders Work:**\n\n"
                "1. **Configured Timings:** Reminders are automatically scheduled based on your confirmed prescription frequencies (e.g. 08:00 AM and 01:00 PM for Metformin).\n"
                "2. **Advance Notifications:** You receive an alert 10 minutes prior to your scheduled dose time, including food relation guidance (e.g., 'Take after food with water').\n"
                "3. **One-Tap Logging:** When taking your medication, tap **Take Dose** to log adherence in real time. If needed, you can record a dose as 'Skipped' with an optional note.\n"
                "4. **Adherence Analytics:** MediMate records your dose history to calculate your 7-day adherence rate, helping you and your healthcare team evaluate treatment consistency."
            )

        # 6. Specific drug queries
        if "metformin" in q:
            return (
                "**Metformin (Oral Biguanide Antidiabetic)**\n\n"
                "• **Purpose:** Helps regulate blood glucose levels by decreasing liver sugar production and improving insulin response.\n"
                "• **How to Take:** Take with or right after meals with water to avoid stomach upset.\n"
                "• **Common Side Effects:** Temporary nausea, diarrhea, or mild stomach discomfort when starting or adjusting doses.\n"
                "• **Important:** Do not drink excessive alcohol while on Metformin."
            )

        if "atorvastatin" in q:
            return (
                "**Atorvastatin (Statin Cholesterol Regulator)**\n\n"
                "• **Purpose:** Lowers low-density lipoprotein (LDL) cholesterol and protects cardiovascular health.\n"
                "• **How to Take:** Usually taken once daily at bedtime.\n"
                "• **Precaution:** Avoid excessive grapefruit juice, which can raise medicine concentrations in your bloodstream.\n"
                "• **Doctor Alert:** Contact your doctor if you experience unexplained muscle aches or fatigue."
            )

        if "vitamin d3" in q or "vitamin" in q:
            return (
                "**Vitamin D3 / Cholecalciferol (1000 IU)**\n\n"
                "• **Purpose:** Supports calcium absorption, bone mineralization, and immune defense.\n"
                "• **How to Take:** Take once weekly with a meal containing dietary healthy fats (like breakfast or lunch) for optimal absorption.\n"
                "• **Side Effects:** Very well tolerated at standard prescribed doses."
            )

        # 7. General fallback
        return (
            f"Regarding your query: '{query}'\n\n"
            "Based on your confirmed health record, your current active medications include Metformin 500mg BID, "
            "Atorvastatin 10mg OD, and Vitamin D3 1000IU weekly. "
            "Please ensure you follow your prescribed mealtime schedule. If you have questions about changing your medication "
            "or are experiencing new symptoms, please consult your prescribing clinician."
        )

    async def generate_chat_reply(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str,
        patient_context: str
    ) -> Tuple[str, str, bool]:
        """
        Generates deterministic, context-aware healthcare reply in local mock mode.
        Discloses mock status transparently (is_mock=True).
        """
        last_user_query = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user_query = m.get("content", "")
                break

        reply = self._synthesize_mock_reply(last_user_query, patient_context)
        return reply, self.model_name, True

    async def stream_chat_reply(
        self,
        messages: List[Dict[str, str]],
        system_instruction: str,
        patient_context: str
    ) -> AsyncIterator[str]:
        """
        Streams conversational reply in simulated chunks for realistic SSE streaming testing.
        """
        reply, _, _ = await self.generate_chat_reply(messages, system_instruction, patient_context)
        
        # Split into readable word chunks of 3-5 words
        words = reply.split(" ")
        chunk_size = 4
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size]) + " "
            yield chunk
            await asyncio.sleep(0.03)

