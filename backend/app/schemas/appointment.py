from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class DoctorDirectoryItem(BaseModel):
    id: str
    name: str
    speciality: str
    hospital: str
    phone: Optional[str] = None
    email: Optional[str] = None
    rating: float = 4.9
    consultation_types: List[str] = ["In-Person", "Online"]
    is_verified: bool = True
    available_days: List[str] = ["Monday", "Wednesday", "Friday"]
    clinic_address: Optional[str] = None

class AppointmentAuditRecord(BaseModel):
    action: str  # "created", "rescheduled", "cancelled", "completed", "updated", "notes_updated"
    timestamp: str
    actor: str = "patient"
    details: Optional[str] = None
    previous_state: Optional[Dict[str, Any]] = None

class AppointmentItem(BaseModel):
    id: str
    user_id: Optional[str] = None
    doctor_id: Optional[str] = None
    doctor_name: str
    speciality: str
    appointment_date: str  # ISO YYYY-MM-DD or Display
    appointment_time: str  # e.g. "10:30 AM" or "10:30"
    duration_minutes: int = 30
    visit_type: str = "In-Person"  # "In-Person" | "Online"
    location: Optional[str] = "Apollo Clinic, Room 302"
    clinic_name: Optional[str] = "Apollo Clinic"
    clinic_phone: Optional[str] = "+91 98765 43210"
    clinic_email: Optional[str] = "appointments@apolloclinic.com"
    clinic_address: Optional[str] = "Building 4, Sector 7, Healthcare City"
    teleconsult_url: Optional[str] = None
    status: str = "Upcoming"  # "Upcoming", "Completed", "Cancelled", "Rescheduled"
    is_locally_managed: bool = True
    is_verified_doctor: bool = False
    reminder_offsets: List[int] = [1440, 60]  # 24 hours (1440 mins), 1 hour (60 mins) before
    
    # Healthcare Visit Notes (Patient Personal Notes — Not official medical records)
    visit_purpose: Optional[str] = None
    questions_to_ask: List[str] = []
    personal_notes: Optional[str] = None
    follow_up_instructions: Optional[str] = None
    follow_up_recommended_date: Optional[str] = None
    
    # Legacy & display compatibility
    date: Optional[str] = None
    time: Optional[str] = None
    notes: Optional[str] = None
    
    # Audit trail
    history: List[AppointmentAuditRecord] = []
    cancellation_reason: Optional[str] = None
    rescheduled_from: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class AppointmentCreateRequest(BaseModel):
    doctor_name: str = Field(..., description="Name of the physician or clinician")
    speciality: str = Field(..., description="Medical speciality")
    doctor_id: Optional[str] = None
    appointment_date: str = Field(..., description="Date of appointment (YYYY-MM-DD or DD Mon YYYY)")
    appointment_time: str = Field(..., description="Time of appointment (HH:MM or HH:MM AM/PM)")
    duration_minutes: int = Field(default=30, ge=10, le=240, description="Estimated duration in minutes")
    visit_type: str = Field(default="In-Person", description="'In-Person' or 'Online'")
    location: Optional[str] = Field(default=None, description="Location description or clinic room")
    clinic_name: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_email: Optional[str] = None
    clinic_address: Optional[str] = None
    teleconsult_url: Optional[str] = None
    visit_purpose: Optional[str] = None
    questions_to_ask: List[str] = []
    personal_notes: Optional[str] = None
    follow_up_instructions: Optional[str] = None
    reminder_offsets: List[int] = [1440, 60]
    allow_overlap: bool = Field(default=False, description="Whether to proceed despite overlapping appointment warning")
    timezone: str = "UTC"

class AppointmentUpdateRequest(BaseModel):
    doctor_name: Optional[str] = None
    speciality: Optional[str] = None
    duration_minutes: Optional[int] = None
    visit_type: Optional[str] = None
    location: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_email: Optional[str] = None
    clinic_address: Optional[str] = None
    teleconsult_url: Optional[str] = None
    visit_purpose: Optional[str] = None
    questions_to_ask: Optional[List[str]] = None
    personal_notes: Optional[str] = None
    follow_up_instructions: Optional[str] = None
    reminder_offsets: Optional[List[int]] = None

class AppointmentRescheduleRequest(BaseModel):
    new_date: str = Field(..., description="Target appointment date (YYYY-MM-DD)")
    new_time: str = Field(..., description="Target appointment time (HH:MM AM/PM or HH:MM)")
    reason: Optional[str] = Field(default=None, description="Reason for rescheduling")
    allow_overlap: bool = False
    timezone: str = "UTC"

class AppointmentCancelRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Mandatory cancellation reason for audit record")

class AppointmentOverlapWarning(BaseModel):
    has_overlap: bool
    conflicting_appointment_id: Optional[str] = None
    conflicting_doctor_name: Optional[str] = None
    conflicting_time: Optional[str] = None
    conflicting_date: Optional[str] = None
    message: str

class ICSExportResponse(BaseModel):
    filename: str
    ics_content: str
    disclaimer: str = (
        "Exported as a standard .ics calendar file. Direct external calendar "
        "synchronization (e.g. Google Calendar / Outlook API) is unconfigured. "
        "Import this file manually into your calendar application."
    )

class CalendarDaySummary(BaseModel):
    date: str  # YYYY-MM-DD
    day_number: int
    is_current_month: bool
    appointment_count: int
    statuses: List[str] = []
    appointments: List[AppointmentItem] = []

class CalendarMonthSummary(BaseModel):
    year: int
    month: int
    month_name: str
    total_appointments: int
    days: List[CalendarDaySummary] = []
