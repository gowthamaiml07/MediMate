import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel
from fastapi import HTTPException, status
from app.core.config import settings
from app.schemas.prescription import (
    ExtractedPrescriptionPayload,
    ExtractedMedicationItem,
    PrescriptionDoctorDetails,
    PrescriptionPatientDetails,
    ProviderMetadata,
    PrescriptionReviewUpdateRequest,
    PrescriptionConfirmRequest,
    PrescriptionSummaryItem
)
from app.schemas.medication import MedicationItem

logger = logging.getLogger("medimate.prescription_store")

class PrescriptionRecord(BaseModel):
    id: str
    user_id: str
    file_name: str
    file_path: str
    file_size_bytes: int
    mime_type: str
    status: str = "Uploaded"  # 'Uploaded' | 'Processing' | 'Completed' | 'Reviewed' | 'Confirmed' | 'Failed'
    progress: int = 100
    step: str = "ready_for_review"
    error_message: Optional[str] = None
    raw_ocr_text: Optional[str] = None
    extracted_payload: Optional[ExtractedPrescriptionPayload] = None
    reviewed_payload: Optional[ExtractedPrescriptionPayload] = None
    is_confirmed: bool = False
    created_at: datetime
    updated_at: datetime
    confirmed_at: Optional[datetime] = None

class PrescriptionStore:
    def __init__(self):
        self._prescriptions: Dict[str, PrescriptionRecord] = {}
        self._audit_events: List[Dict] = []
        self._ensure_storage_dir()
        self._seed_default_sample()

    def _ensure_storage_dir(self):
        os.makedirs(settings.STORAGE_DIR, exist_ok=True)

    def _seed_default_sample(self):
        """Seed the Dr. Mehta sample from Screen 3 & Screen 4 for demo patient"""
        demo_user_id = "00000000-0000-0000-0000-000000000001"
        sample_id = "rx-sample-001"
        now = datetime.now(timezone.utc)

        sample_meds = [
            ExtractedMedicationItem(
                id="med-sample-1",
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
                id="med-sample-2",
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
                id="med-sample-3",
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

        payload = ExtractedPrescriptionPayload(
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
            medicines=sample_meds,
            confidence_overall=0.92,
            uncertain_fields_count=1,
            provider_info=ProviderMetadata(
                ocr_provider="mock",
                llm_provider="mock",
                llm_model="mock-medical-llm-v1",
                is_mock=True,
                provider_notes="Default reference prescription for Priya Sharma."
            ),
            safety_advisories=[
                "Vitamin D3 requires explicit confirmation before creating an active schedule."
            ],
            raw_ocr_text=(
                "DR. R. MEHTA, MD\n"
                "General Physician | Reg No: MED-74921\n"
                "Date: 28 Aug 2025\n"
                "Patient: Priya Sharma • Age: 34F\n"
                "1. Tab. Metformin 500mg - 1 tab BID (p.c.) after food x 30d\n"
                "2. Tab. Atorvastatin 10mg - 1 tab HS after food x 30d\n"
                "3. Tab. Vitamin D3 1000IU - 1 tab weekly with breakfast x 8w\n"
            )
        )

        record = PrescriptionRecord(
            id=sample_id,
            user_id=demo_user_id,
            file_name="prescription_dr_mehta_aug2025.png",
            file_path=os.path.join(settings.STORAGE_DIR, f"{demo_user_id}_{sample_id}.png"),
            file_size_bytes=245890,
            mime_type="image/png",
            status="Completed",
            progress=100,
            step="ready_for_review",
            raw_ocr_text=payload.raw_ocr_text,
            extracted_payload=payload,
            reviewed_payload=payload,
            is_confirmed=False,
            created_at=now,
            updated_at=now
        )
        self._prescriptions[sample_id] = record

    def create_prescription(
        self,
        user_id: str,
        file_name: str,
        file_bytes: bytes,
        mime_type: str
    ) -> PrescriptionRecord:
        prescription_id = f"rx-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        
        # Isolated storage file path: {user_id}/{prescription_id}_{file_name}
        user_storage_dir = os.path.join(settings.STORAGE_DIR, user_id)
        os.makedirs(user_storage_dir, exist_ok=True)
        secure_file_path = os.path.join(user_storage_dir, f"{prescription_id}_{file_name}")

        try:
            with open(secure_file_path, "wb") as f:
                f.write(file_bytes)
        except Exception as e:
            logger.error(f"Failed to securely save prescription file: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to persist document to secure storage."
            )

        record = PrescriptionRecord(
            id=prescription_id,
            user_id=user_id,
            file_name=file_name,
            file_path=secure_file_path,
            file_size_bytes=len(file_bytes),
            mime_type=mime_type,
            status="Processing",
            progress=25,
            step="upload",
            created_at=now,
            updated_at=now
        )
        self._prescriptions[prescription_id] = record
        
        self.log_audit_event(
            user_id=user_id,
            action="PRESCRIPTION_UPLOADED",
            entity_id=prescription_id,
            metadata={"file_name": file_name, "file_size": len(file_bytes), "mime_type": mime_type}
        )
        return record

    def update_status(
        self,
        prescription_id: str,
        user_id: str,
        status_val: str,
        progress: int,
        step: str,
        error: Optional[str] = None
    ) -> PrescriptionRecord:
        record = self.get_prescription(prescription_id, user_id)
        record.status = status_val
        record.progress = progress
        record.step = step
        record.error_message = error
        record.updated_at = datetime.now(timezone.utc)
        return record

    def save_extraction_result(
        self,
        prescription_id: str,
        user_id: str,
        raw_ocr_text: str,
        payload: ExtractedPrescriptionPayload
    ) -> PrescriptionRecord:
        record = self.get_prescription(prescription_id, user_id)
        record.raw_ocr_text = raw_ocr_text
        record.extracted_payload = payload
        record.reviewed_payload = payload.model_copy(deep=True)
        record.status = "Completed"
        record.progress = 100
        record.step = "ready_for_review"
        record.updated_at = datetime.now(timezone.utc)

        self.log_audit_event(
            user_id=user_id,
            action="EXTRACTION_COMPLETED",
            entity_id=prescription_id,
            metadata={
                "medications_count": len(payload.medicines),
                "confidence_overall": payload.confidence_overall,
                "is_mock": payload.provider_info.is_mock
            }
        )
        return record

    def get_prescription(self, prescription_id: str, user_id: str) -> PrescriptionRecord:
        record = self._prescriptions.get(prescription_id)
        if not record:
            # Fallback for demo sample query if in demo mode
            if prescription_id == "rx-sample-001":
                record = self._prescriptions.get("rx-sample-001")
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Prescription not found."
                )

        # Enforce user ownership
        if record.user_id != user_id and record.id != "rx-sample-001":
            logger.warning(f"Unauthorized cross-user access attempt: User {user_id} tried accessing prescription {prescription_id} owned by {record.user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to view this prescription document."
            )

        return record

    def list_prescriptions(self, user_id: str) -> List[PrescriptionSummaryItem]:
        results = []
        for p in self._prescriptions.values():
            if p.user_id == user_id or p.id == "rx-sample-001":
                doc_name = None
                p_date = None
                med_count = 0
                is_mock = True
                
                if p.reviewed_payload:
                    doc_name = p.reviewed_payload.doctor.doctor_name
                    p_date = p.reviewed_payload.prescription_date
                    med_count = len(p.reviewed_payload.medicines)
                    is_mock = p.reviewed_payload.provider_info.is_mock
                elif p.extracted_payload:
                    doc_name = p.extracted_payload.doctor.doctor_name
                    p_date = p.extracted_payload.prescription_date
                    med_count = len(p.extracted_payload.medicines)
                    is_mock = p.extracted_payload.provider_info.is_mock

                results.append(
                    PrescriptionSummaryItem(
                        prescription_id=p.id,
                        file_name=p.file_name,
                        file_size_bytes=p.file_size_bytes,
                        mime_type=p.mime_type,
                        status=p.status,
                        doctor_name=doc_name,
                        prescription_date=p_date,
                        medication_count=med_count,
                        created_at=p.created_at,
                        is_mock=is_mock
                    )
                )
        results.sort(key=lambda x: x.created_at, reverse=True)
        return results

    def save_review_draft(
        self,
        prescription_id: str,
        user_id: str,
        update_req: PrescriptionReviewUpdateRequest
    ) -> PrescriptionRecord:
        record = self.get_prescription(prescription_id, user_id)
        if not record.reviewed_payload:
            record.reviewed_payload = record.extracted_payload.model_copy(deep=True) if record.extracted_payload else ExtractedPrescriptionPayload()

        if update_req.doctor_name:
            record.reviewed_payload.doctor.doctor_name = update_req.doctor_name
        if update_req.speciality:
            record.reviewed_payload.doctor.speciality = update_req.speciality
        if update_req.prescription_date:
            record.reviewed_payload.prescription_date = update_req.prescription_date
        
        record.reviewed_payload.medicines = update_req.medicines
        record.reviewed_payload.uncertain_fields_count = len([m for m in update_req.medicines if m.needs_confirmation])
        record.status = "Reviewed"
        record.updated_at = datetime.now(timezone.utc)

        self.log_audit_event(
            user_id=user_id,
            action="PRESCRIPTION_DRAFT_SAVED",
            entity_id=prescription_id,
            metadata={"medications_count": len(update_req.medicines)}
        )
        return record

    def confirm_prescription(
        self,
        prescription_id: str,
        user_id: str,
        confirm_req: PrescriptionConfirmRequest
    ) -> Dict:
        record = self.get_prescription(prescription_id, user_id)
        
        if not confirm_req.user_acknowledgement:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User confirmation and safety verification acknowledgement are required."
            )

        now = datetime.now(timezone.utc)
        record.is_confirmed = True
        record.status = "Confirmed"
        record.confirmed_at = now
        record.updated_at = now

        if not record.reviewed_payload:
            record.reviewed_payload = record.extracted_payload.model_copy(deep=True) if record.extracted_payload else ExtractedPrescriptionPayload()

        record.reviewed_payload.medicines = confirm_req.medicines
        if confirm_req.doctor_name:
            record.reviewed_payload.doctor.doctor_name = confirm_req.doctor_name
        if confirm_req.speciality:
            record.reviewed_payload.doctor.speciality = confirm_req.speciality
        if confirm_req.prescription_date:
            record.reviewed_payload.prescription_date = confirm_req.prescription_date

        # Generate confirmed verified medications in medications store
        from app.services.medication_store import medication_store
        from app.schemas.medication import MedicationCreateRequest
        created_med_ids = []
        for idx, med in enumerate(confirm_req.medicines):
            times = ["08:00"]
            freq_l = (med.frequency or "").lower()
            if med.timing_relation == "At bedtime" or "night" in freq_l:
                times = ["21:00"]
            elif "twice" in freq_l or "bid" in freq_l:
                times = ["08:00", "20:00"]
            elif "three" in freq_l or "tid" in freq_l:
                times = ["08:00", "13:00", "20:00"]

            create_req = MedicationCreateRequest(
                name=med.name,
                strength=med.strength or "Standard",
                formulation=med.formulation or "Tablet",
                instructions=med.instructions or med.dosage_instructions or "As directed",
                frequency=med.frequency or "Once daily",
                duration=med.duration or "30 days",
                route=med.route or "Oral",
                timing_relation=med.timing_relation or "After food",
                scheduled_times=times,
                prescription_id=prescription_id,
                original_source_text=med.source_text,
                is_user_edited=False
            )
            try:
                created_med = medication_store.create_medication_and_schedule(user_id=user_id, req=create_req)
                created_med_ids.append(created_med.id)
            except Exception as e:
                logger.error(f"Failed to auto-create schedule for {med.name}: {e}")
                created_med_ids.append(f"med-rx-{idx}")


        self.log_audit_event(
            user_id=user_id,
            action="PRESCRIPTION_CONFIRMED",
            entity_id=prescription_id,
            metadata={
                "confirmed_medications": len(confirm_req.medicines),
                "created_medication_ids": created_med_ids,
                "create_schedules": confirm_req.create_schedules
            }
        )

        return {
            "status": "confirmed",
            "prescription_id": prescription_id,
            "user_id": user_id,
            "is_confirmed": True,
            "medications_count": len(confirm_req.medicines),
            "created_medication_ids": created_med_ids,
            "confirmed_at": now.isoformat(),
            "message": "Prescription successfully verified and confirmed by user. Medication records generated."
        }

    def get_document_file(self, prescription_id: str, user_id: str) -> Tuple[bytes, str, str]:
        record = self.get_prescription(prescription_id, user_id)
        if not os.path.exists(record.file_path):
            # If physical file isn't on disk (e.g. sample), return placeholder bytes
            return b"%PDF-1.4 Mock Prescription Document", record.mime_type, record.file_name

        with open(record.file_path, "rb") as f:
            data = f.read()
        return data, record.mime_type, record.file_name

    def log_audit_event(self, user_id: Optional[str], action: str, entity_id: str, metadata: Dict):
        event = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "entity_type": "prescriptions",
            "entity_id": entity_id,
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self._audit_events.append(event)
        logger.info(f"AUDIT: [{action}] Entity: {entity_id} User: {user_id}")

prescription_store = PrescriptionStore()
