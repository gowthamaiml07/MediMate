import os
import logging
from typing import Optional
from fastapi import HTTPException, UploadFile, status
from app.core.config import settings
from app.services.ocr import get_ocr_provider
from app.services.llm import get_llm_provider
from app.services.prescription_store import prescription_store, PrescriptionRecord

logger = logging.getLogger("medimate.extraction_service")

class ExtractionService:
    def validate_file(self, file_name: str, file_bytes: bytes, content_type: Optional[str]) -> str:
        """
        Validates file MIME type, extension, and size limits strictly.
        """
        if not file_bytes or len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty. Please provide a valid prescription document."
            )

        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413),
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB."
            )

        ext = os.path.splitext(file_name)[1].lower()
        if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)}"
            )

        # Detect or sanitize MIME type
        detected_mime = content_type or "application/octet-stream"
        if ext in (".jpg", ".jpeg") and detected_mime == "application/octet-stream":
            detected_mime = "image/jpeg"
        elif ext == ".png" and detected_mime == "application/octet-stream":
            detected_mime = "image/png"
        elif ext == ".webp" and detected_mime == "application/octet-stream":
            detected_mime = "image/webp"
        elif ext == ".pdf" and detected_mime == "application/octet-stream":
            detected_mime = "application/pdf"

        if detected_mime not in settings.ALLOWED_UPLOAD_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported MIME type '{detected_mime}'. Allowed formats: PDF, PNG, JPEG, WebP."
            )

        return detected_mime

    async def process_prescription(
        self,
        user_id: str,
        file: UploadFile,
        ocr_provider_override: Optional[str] = None,
        llm_provider_override: Optional[str] = None
    ) -> PrescriptionRecord:
        """
        End-to-end pipeline: Intake -> Validation -> Storage -> OCR -> LLM Parsing -> Storage
        """
        file_bytes = await file.read()
        file_name = file.filename or "uploaded_prescription.jpg"
        mime_type = self.validate_file(file_name, file_bytes, file.content_type)

        # 1. Store initial intake record
        record = prescription_store.create_prescription(
            user_id=user_id,
            file_name=file_name,
            file_bytes=file_bytes,
            mime_type=mime_type
        )

        try:
            # 2. OCR Step
            prescription_store.update_status(
                prescription_id=record.id,
                user_id=user_id,
                status_val="Processing",
                progress=50,
                step="ocr"
            )
            ocr_provider = get_ocr_provider(ocr_provider_override)
            ocr_result = await ocr_provider.extract_text(
                file_bytes=file_bytes,
                mime_type=mime_type,
                file_name=file_name
            )

            # 3. LLM Extraction Step
            prescription_store.update_status(
                prescription_id=record.id,
                user_id=user_id,
                status_val="Processing",
                progress=75,
                step="extraction"
            )
            llm_provider = get_llm_provider(llm_provider_override)
            extracted_payload = await llm_provider.parse_prescription_text(
                ocr_text=ocr_result.raw_text,
                file_name=file_name
            )
            
            # Sync provider metadata
            extracted_payload.provider_info.ocr_provider = ocr_result.provider_name
            extracted_payload.provider_info.ocr_model = ocr_result.model_name
            extracted_payload.provider_info.is_mock = (ocr_result.is_mock or extracted_payload.provider_info.is_mock)
            extracted_payload.raw_ocr_text = ocr_result.raw_text

            # 4. Save results to store
            completed_record = prescription_store.save_extraction_result(
                prescription_id=record.id,
                user_id=user_id,
                raw_ocr_text=ocr_result.raw_text,
                payload=extracted_payload
            )
            return completed_record

        except Exception as e:
            logger.error(f"Prescription processing error for {record.id}: {str(e)}")
            prescription_store.update_status(
                prescription_id=record.id,
                user_id=user_id,
                status_val="Failed",
                progress=100,
                step="failed",
                error=str(e)
            )
            raise

extraction_service = ExtractionService()
