from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class ExtractedMedicationItem(BaseModel):
    """
    Structured extraction schema for an individual medication entry on a prescription.
    Follows zero-hallucination medical safety rules.
    """
    id: Optional[str] = None
    name: str = Field(..., description="Medication name exactly as written on prescription")
    strength: Optional[str] = Field(None, description="Strength and dosage unit, if explicitly specified (e.g., 500mg, 10mg)")
    formulation: Optional[str] = Field(None, description="Formulation if specified (e.g., Tablet, Capsule, Syrup, Cream)")
    dosage_instructions: Optional[str] = Field(None, description="Verbatim instructions (e.g., 1 tablet twice daily after food)")
    instructions: Optional[str] = Field("After food", description="Standardized patient instruction for compatibility")
    route: Optional[str] = Field("Oral", description="Route of administration (e.g., Oral, Topical, Inhalation)")
    frequency: Optional[str] = Field(None, description="Frequency of intake (e.g., Twice daily, Once daily at night)")
    timing_relation: Optional[str] = Field("After food", description="Relation to meals: Before food, After food, With food, Empty stomach, At bedtime")
    duration: Optional[str] = Field(None, description="Prescribed duration (e.g., 30 days, 8 weeks)")
    quantity: Optional[str] = Field(None, description="Dispensed quantity if specified (e.g., 60 tabs)")
    refills: Optional[str] = Field(None, description="Number of refills authorized if specified")
    confidence: float = Field(0.90, description="Extraction confidence score between 0.0 and 1.0 (or 0-100)")
    source_text: Optional[str] = Field(None, description="Exact OCR snippet from which this medication entry was extracted")
    is_unclear: bool = Field(False, description="Flagged if handwriting, dosage, or instructions were ambiguous or illegible")
    has_conflicting_instructions: bool = Field(False, description="Flagged if contradictory instructions were found")
    missing_fields: List[str] = Field(default_factory=list, description="List of required clinical fields that were omitted in the prescription")
    needs_confirmation: bool = Field(False, description="True if confidence is low, unclear, or has conflicting instructions")

# Alias for backwards compatibility
ExtractedMedicine = ExtractedMedicationItem

class PrescriptionDoctorDetails(BaseModel):
    doctor_name: Optional[str] = "Dr. R. Mehta"
    speciality: Optional[str] = "General Physician"
    hospital_clinic: Optional[str] = "Metro Specialty Clinic"
    license_number: Optional[str] = None
    confidence: float = 0.95

# Alias for backwards compatibility
PrescriptionMetadata = PrescriptionDoctorDetails

class PrescriptionPatientDetails(BaseModel):
    patient_name: Optional[str] = "Priya Sharma"
    age: Optional[str] = "34F"
    gender: Optional[str] = "Female"
    confidence: float = 0.95

class ProviderMetadata(BaseModel):
    ocr_provider: str = "mock"
    ocr_model: Optional[str] = None
    llm_provider: str = "mock"
    llm_model: Optional[str] = None
    is_mock: bool = True
    provider_notes: Optional[str] = None

class ExtractedPrescriptionPayload(BaseModel):
    doctor: PrescriptionDoctorDetails = Field(default_factory=PrescriptionDoctorDetails)
    patient: PrescriptionPatientDetails = Field(default_factory=PrescriptionPatientDetails)
    prescription_date: Optional[str] = "28 Aug 2025"
    medicines: List[ExtractedMedicationItem] = Field(default_factory=list)
    confidence_overall: float = 0.92
    uncertain_fields_count: int = 0
    provider_info: ProviderMetadata = Field(default_factory=ProviderMetadata)
    safety_advisories: List[str] = Field(default_factory=list)
    raw_ocr_text: Optional[str] = None

class PrescriptionExtractionResponse(BaseModel):
    prescription_id: str
    user_id: Optional[str] = None
    status: str = "completed"
    file_name: str
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = "image/png"
    extracted_at: datetime
    metadata: PrescriptionDoctorDetails
    medicines: List[ExtractedMedicationItem]
    confidence_overall: float = 0.92
    uncertain_fields_count: int = 1
    raw_ocr_text: Optional[str] = None
    provider_info: ProviderMetadata = Field(default_factory=ProviderMetadata)
    safety_advisories: List[str] = Field(default_factory=list)
    document_url: Optional[str] = None
    is_confirmed: bool = False

class PrescriptionUploadResponse(BaseModel):
    prescription_id: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    status: str  # 'Uploaded' | 'Processing' | 'Completed' | 'Failed'
    created_at: datetime
    is_mock: bool = True
    message: str

class PrescriptionStatusResponse(BaseModel):
    prescription_id: str
    status: str  # 'Uploaded' | 'Processing' | 'Completed' | 'Reviewed' | 'Confirmed' | 'Failed'
    progress: int  # 0 to 100
    step: str      # 'upload' | 'ocr' | 'extraction' | 'ready_for_review' | 'confirmed' | 'failed'
    error: Optional[str] = None
    is_mock: bool = True
    updated_at: datetime

class PrescriptionReviewUpdateRequest(BaseModel):
    doctor_name: Optional[str] = None
    speciality: Optional[str] = None
    prescription_date: Optional[str] = None
    medicines: List[ExtractedMedicationItem]
    review_notes: Optional[str] = None

class PrescriptionConfirmRequest(BaseModel):
    medicines: List[ExtractedMedicationItem]
    doctor_name: Optional[str] = None
    speciality: Optional[str] = None
    prescription_date: Optional[str] = None
    create_schedules: bool = True
    user_acknowledgement: bool = True  # Patient certifies they verified information against original Rx

class PrescriptionSummaryItem(BaseModel):
    prescription_id: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    status: str
    doctor_name: Optional[str]
    prescription_date: Optional[str]
    medication_count: int
    created_at: datetime
    is_mock: bool = True
