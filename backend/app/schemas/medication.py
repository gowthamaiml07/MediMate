from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, date

class MedicationItem(BaseModel):
    """
    Backwards-compatible medication summary used across dashboard and schedule timelines.
    """
    id: str
    user_id: Optional[str] = None
    name: str
    strength: str
    formulation: Optional[str] = "Tablet"
    category: Optional[str] = "Prescription"
    instructions: str
    timing: str
    frequency: str
    duration: Optional[str] = "30 days"
    route: Optional[str] = "Oral"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "Upcoming"  # "Taken", "Upcoming", "Missed", "Skipped", "Snoozed", "Active", "Paused", "Discontinued"
    medication_status: Optional[str] = "Active"  # "Active", "Paused", "Completed", "Discontinued"
    scheduled_time: str
    is_taken: bool = False
    next_dose: Optional[str] = None
    original_source_text: Optional[str] = None
    is_user_edited: bool = False
    is_verified_by_user: bool = True

class MedicationDetail(BaseModel):
    id: str
    user_id: str
    prescription_id: Optional[str] = None
    name: str
    strength: str
    formulation: str = "Tablet"
    category: str = "Prescription"
    instructions: str
    frequency: str
    duration: Optional[str] = "30 days"
    route: str = "Oral"
    start_date: str
    end_date: Optional[str] = None
    status: str = "Active"  # "Active", "Paused", "Completed", "Discontinued"
    next_scheduled_dose: Optional[str] = None
    scheduled_times: List[str] = []
    timing_relation: str = "After food"
    timezone: str = "UTC"
    reminder_enabled: bool = True
    reminder_offset_minutes: int = 10
    original_source_text: Optional[str] = None
    user_corrections: Dict[str, Any] = {}
    is_user_edited: bool = False
    is_verified_by_user: bool = True
    created_at: datetime
    updated_at: datetime

class MedicationCreateRequest(BaseModel):
    name: str
    strength: str
    formulation: str = "Tablet"
    instructions: str
    frequency: str
    duration: Optional[str] = "30 days"
    route: str = "Oral"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    timing_relation: str = "After food"
    scheduled_times: List[str] = ["08:00"]
    timezone: str = "UTC"
    reminder_enabled: bool = True
    reminder_offset_minutes: int = 10
    original_source_text: Optional[str] = None
    prescription_id: Optional[str] = None
    is_user_edited: bool = False

class MedicationUpdateRequest(BaseModel):
    name: Optional[str] = None
    strength: Optional[str] = None
    formulation: Optional[str] = None
    instructions: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    route: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    timing_relation: Optional[str] = None
    scheduled_times: Optional[List[str]] = None
    timezone: Optional[str] = None
    reminder_enabled: Optional[bool] = None
    reminder_offset_minutes: Optional[int] = None

class MedicationStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Target status: Active, Paused, Completed, Discontinued")
    reason: Optional[str] = Field(None, description="Clinical or patient reason for status change")

class ScheduleConfigRequest(BaseModel):
    medication_id: str
    frequency: str = Field(..., description="Frequency (e.g. Once daily, Twice daily, Three times daily, Weekly)")
    scheduled_times: List[str] = Field(..., description="Exact times in 24h format HH:MM (e.g. ['08:00', '20:00'])")
    timing_relation: str = Field("After food", description="Relation to meals (Before food, After food, With food, Empty stomach, At bedtime)")
    start_date: str = Field(..., description="Schedule start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="Schedule end date (YYYY-MM-DD)")
    timezone: str = Field("UTC", description="Patient's IANA timezone identifier (e.g. Asia/Kolkata, America/New_York)")
    reminder_enabled: bool = True
    reminder_offset_minutes: int = 10
    user_confirmed: bool = True

class ScheduleValidationResult(BaseModel):
    is_valid: bool
    is_ambiguous: bool = False
    warning: Optional[str] = None
    clarification_needed: Optional[str] = None
    proposed_times: List[str] = []
    generated_instances_count: int = 0

class DoseTimelineItem(BaseModel):
    id: str
    schedule_id: str
    medication_id: str
    medication_name: str
    strength: str
    formulation: str = "Tablet"
    instructions: str
    timing_relation: str
    scheduled_for: str  # ISO UTC
    scheduled_time: str # "08:00 AM" in local timezone
    local_date: str     # "2025-09-08"
    status: str         # "Upcoming", "Taken", "Skipped", "Missed", "Snoozed"
    is_overdue: bool = False
    logged_at: Optional[str] = None
    event_id: Optional[str] = None
    notes: Optional[str] = None

class DoseEventLogRequest(BaseModel):
    schedule_id: str
    scheduled_for: str = Field(..., description="The ISO 8601 timestamp of the scheduled dose")
    status: str = Field(..., description="Status: 'Taken', 'Skipped', 'Missed', 'Snoozed'")
    notes: Optional[str] = None
    timezone: str = "UTC"

class DoseEventCorrectionRequest(BaseModel):
    new_status: str = Field(..., description="Corrected status: 'Taken', 'Skipped', 'Missed', 'Upcoming'")
    correction_reason: str = Field(..., description="Patient reason for changing previously logged dose")

class AdherenceDailyStat(BaseModel):
    day: str
    date: str
    rate: int
    taken: int
    missed: int
    skipped: int
    total_due: int

class AdherenceSummary(BaseModel):
    period: str
    adherence_rate: int
    taken: int
    missed: int
    skipped: int
    snoozed: int
    total_due: int
    formula_description: str = "Adherence % = (Taken / Total Due Past Doses) * 100"
    missed_dose_guidance: str = "Never take a double or extra dose to make up for a missed dose. Contact your doctor or pharmacist if unsure."
    daily_breakdown: List[dict]

class ReminderJobItem(BaseModel):
    id: str
    user_id: str
    medication_id: str
    medication_name: str
    schedule_id: str
    scheduled_for: str
    reminder_time: str
    channel: str
    status: str
    sent_at: Optional[str] = None
    error_message: Optional[str] = None
    is_mock: bool = True
