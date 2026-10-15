from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Response, status
from typing import List, Optional
from datetime import datetime, timezone

from app.schemas.prescription import (
    PrescriptionExtractionResponse,
    PrescriptionDoctorDetails,
    PrescriptionUploadResponse,
    PrescriptionStatusResponse,
    PrescriptionReviewUpdateRequest,
    PrescriptionConfirmRequest,
    PrescriptionSummaryItem,
    ProviderMetadata
)
from app.core.auth import get_current_user, AuthenticatedUser
from app.services.prescription_store import prescription_store
from app.services.extraction_service import extraction_service

router = APIRouter()

@router.post("/upload", response_model=PrescriptionExtractionResponse)
async def upload_prescription(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Intake for prescription upload. Validates format and size, runs OCR & LLM extraction,
    and returns unconfirmed structured candidate data for patient review.
    Scoped strictly to the authenticated user ID.
    """
    record = await extraction_service.process_prescription(
        user_id=current_user.id,
        file=file
    )

    payload = record.reviewed_payload or record.extracted_payload
    doctor = payload.doctor if payload else PrescriptionDoctorDetails()
    medicines = payload.medicines if payload else []
    provider_info = payload.provider_info if payload else ProviderMetadata()
    safety_advisories = payload.safety_advisories if payload else []

    return PrescriptionExtractionResponse(
        prescription_id=record.id,
        user_id=record.user_id,
        status=record.status,
        file_name=record.file_name,
        file_size_bytes=record.file_size_bytes,
        mime_type=record.mime_type,
        extracted_at=record.created_at,
        metadata=doctor,
        medicines=medicines,
        confidence_overall=payload.confidence_overall if payload else 0.92,
        uncertain_fields_count=payload.uncertain_fields_count if payload else 0,
        raw_ocr_text=record.raw_ocr_text,
        provider_info=provider_info,
        safety_advisories=safety_advisories,
        document_url=f"/api/v1/prescriptions/{record.id}/document",
        is_confirmed=record.is_confirmed
    )

@router.get("", response_model=List[PrescriptionSummaryItem])
def list_uploaded_prescriptions(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Returns list of all uploaded prescriptions and processing history for the authenticated user.
    """
    return prescription_store.list_prescriptions(user_id=current_user.id)

@router.get("/{prescription_id}/status", response_model=PrescriptionStatusResponse)
def get_prescription_status(
    prescription_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Poll processing status of prescription extraction.
    """
    record = prescription_store.get_prescription(prescription_id, user_id=current_user.id)
    is_mock = True
    if record.extracted_payload:
        is_mock = record.extracted_payload.provider_info.is_mock

    return PrescriptionStatusResponse(
        prescription_id=record.id,
        status=record.status,
        progress=record.progress,
        step=record.step,
        error=record.error_message,
        is_mock=is_mock,
        updated_at=record.updated_at
    )

@router.get("/{prescription_id}/review", response_model=PrescriptionExtractionResponse)
def get_prescription_review(
    prescription_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Returns candidate extractions for user review.
    Unverified output is not confirmed until explicit user review.
    """
    record = prescription_store.get_prescription(prescription_id, user_id=current_user.id)
    payload = record.reviewed_payload or record.extracted_payload

    doctor = payload.doctor if payload else PrescriptionDoctorDetails()
    medicines = payload.medicines if payload else []
    provider_info = payload.provider_info if payload else ProviderMetadata()
    safety_advisories = payload.safety_advisories if payload else []

    return PrescriptionExtractionResponse(
        prescription_id=record.id,
        user_id=record.user_id,
        status=record.status,
        file_name=record.file_name,
        file_size_bytes=record.file_size_bytes,
        mime_type=record.mime_type,
        extracted_at=record.created_at,
        metadata=doctor,
        medicines=medicines,
        confidence_overall=payload.confidence_overall if payload else 0.92,
        uncertain_fields_count=payload.uncertain_fields_count if payload else 0,
        raw_ocr_text=record.raw_ocr_text,
        provider_info=provider_info,
        safety_advisories=safety_advisories,
        document_url=f"/api/v1/prescriptions/{record.id}/document",
        is_confirmed=record.is_confirmed
    )

@router.put("/{prescription_id}/review", response_model=PrescriptionExtractionResponse)
def update_prescription_review_draft(
    prescription_id: str,
    update_req: PrescriptionReviewUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Saves user corrections to the candidate extraction without activating schedules.
    """
    record = prescription_store.save_review_draft(
        prescription_id=prescription_id,
        user_id=current_user.id,
        update_req=update_req
    )
    payload = record.reviewed_payload
    return PrescriptionExtractionResponse(
        prescription_id=record.id,
        user_id=record.user_id,
        status=record.status,
        file_name=record.file_name,
        file_size_bytes=record.file_size_bytes,
        mime_type=record.mime_type,
        extracted_at=record.created_at,
        metadata=payload.doctor,
        medicines=payload.medicines,
        confidence_overall=payload.confidence_overall,
        uncertain_fields_count=payload.uncertain_fields_count,
        raw_ocr_text=record.raw_ocr_text,
        provider_info=payload.provider_info,
        safety_advisories=payload.safety_advisories,
        document_url=f"/api/v1/prescriptions/{record.id}/document",
        is_confirmed=record.is_confirmed
    )

@router.post("/{prescription_id}/confirm")
def confirm_prescription(
    prescription_id: str,
    confirm_req: PrescriptionConfirmRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Explicit patient confirmation. Converts reviewed candidate extractions
    into verified medication records. Enforces zero-hallucination confirmation safety.
    """
    return prescription_store.confirm_prescription(
        prescription_id=prescription_id,
        user_id=current_user.id,
        confirm_req=confirm_req
    )

@router.get("/{prescription_id}/document")
def get_prescription_document(
    prescription_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Secure document stream endpoint. Enforces patient ownership and prevents public exposure.
    """
    data, mime_type, file_name = prescription_store.get_document_file(
        prescription_id=prescription_id,
        user_id=current_user.id
    )
    return Response(
        content=data,
        media_type=mime_type,
        headers={"Content-Disposition": f'inline; filename="{file_name}"'}
    )
