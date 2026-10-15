from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional
from datetime import date

from app.schemas.medication import (
    MedicationItem,
    MedicationDetail,
    MedicationCreateRequest,
    MedicationUpdateRequest,
    MedicationStatusUpdateRequest,
    DoseTimelineItem,
    DoseEventLogRequest,
    DoseEventCorrectionRequest,
    AdherenceSummary,
    ReminderJobItem
)
from app.core.auth import get_current_user, AuthenticatedUser
from app.services.medication_store import medication_store
from app.services.reminders import reminder_service

router = APIRouter()

@router.get("/today", response_model=List[MedicationItem])
def get_today_medications(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Returns today's scheduled doses formatted for dashboard & quick timeline cards.
    """
    timeline = medication_store.get_dose_timeline(
        user_id=current_user.id,
        target_date=date.today(),
        days_ahead=1
    )
    items = []
    for t in timeline:
        items.append(
            MedicationItem(
                id=t.medication_id,
                user_id=current_user.id,
                name=t.medication_name,
                strength=t.strength,
                formulation=t.formulation,
                instructions=t.instructions,
                timing=t.timing_relation,
                frequency="Scheduled",
                duration="Active",
                status=t.status,
                scheduled_time=t.scheduled_time,
                is_taken=(t.status == "Taken")
            )
        )
    return items

@router.get("/all", response_model=List[MedicationDetail])
@router.get("", response_model=List[MedicationDetail])
def get_all_medications(
    status: Optional[str] = Query(None, description="Filter by status: Active, Paused, Completed, Discontinued, All"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Returns all active, paused, or discontinued medications for the authenticated user.
    """
    return medication_store.list_medications(user_id=current_user.id, status_filter=status)

@router.post("", response_model=MedicationDetail, status_code=status.HTTP_201_CREATED)
def create_medication(
    req: MedicationCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Creates a confirmed medication and validates its deterministic schedule.
    """
    return medication_store.create_medication_and_schedule(user_id=current_user.id, req=req)

@router.get("/timeline/doses", response_model=List[DoseTimelineItem])
def get_dose_timeline(
    target_date: Optional[str] = Query(None, description="Query start date in YYYY-MM-DD format"),
    days: int = Query(1, ge=1, le=30, description="Number of days to generate timeline for"),
    tz: str = Query("UTC", description="Patient local timezone (e.g. Asia/Kolkata)"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Generates a deterministic schedule timeline with actual logged dose statuses.
    """
    parsed_d = date.fromisoformat(target_date) if target_date else date.today()
    return medication_store.get_dose_timeline(
        user_id=current_user.id,
        target_date=parsed_d,
        days_ahead=days,
        tz_name=tz
    )

@router.get("/adherence/summary", response_model=AdherenceSummary)
def get_adherence_summary(
    days: int = Query(7, ge=1, le=90, description="Analysis window in days"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Calculates adherence statistics based on recorded dose events and past scheduled doses.
    Formula: (Taken Doses / Total Past Due Doses) * 100
    """
    return medication_store.get_adherence_summary(user_id=current_user.id, period_days=days)

@router.get("/reminders", response_model=List[ReminderJobItem])
def get_user_reminders(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Retrieves scheduled and pending reminder jobs for the authenticated user.
    """
    return reminder_service.get_user_reminders(user_id=current_user.id)

@router.get("/{med_id}", response_model=MedicationDetail)
def get_medication_detail(
    med_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Retrieves full details of a single medication.
    """
    return medication_store.get_medication(medication_id=med_id, user_id=current_user.id)

@router.put("/{med_id}", response_model=MedicationDetail)
def update_medication_detail(
    med_id: str,
    req: MedicationUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Updates editable fields of a medication and updates the schedule version.
    """
    return medication_store.update_medication(medication_id=med_id, user_id=current_user.id, req=req)

@router.patch("/{med_id}/status", response_model=MedicationDetail)
def update_medication_status(
    med_id: str,
    req: MedicationStatusUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Transitions medication status (Active, Paused, Completed, Discontinued).
    Cancels pending reminders when paused or discontinued.
    """
    return medication_store.update_medication_status(
        medication_id=med_id,
        user_id=current_user.id,
        target_status=req.status,
        reason=req.reason
    )

@router.post("/doses/log")
def log_dose_event(
    req: DoseEventLogRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Logs a dose event (Taken, Skipped, Missed, Snoozed). Idempotent for (schedule_id, scheduled_for).
    """
    record = medication_store.log_dose_event(user_id=current_user.id, req=req)
    return {
        "status": "success",
        "event_id": record.id,
        "dose_status": record.status,
        "recorded_at": record.recorded_at.isoformat(),
        "message": f"Dose marked as {record.status}."
    }

@router.post("/doses/{event_id}/correct")
def correct_dose_event(
    event_id: str,
    req: DoseEventCorrectionRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Corrects an accidental dose log entry with an audit log.
    """
    record = medication_store.correct_dose_event(event_id=event_id, user_id=current_user.id, req=req)
    return {
        "status": "success",
        "event_id": record.id,
        "new_status": record.status,
        "original_status": record.original_status,
        "corrected_at": record.corrected_at.isoformat() if record.corrected_at else None,
        "message": "Dose record successfully corrected with audit trail."
    }

@router.post("/{med_id}/toggle-status")
def toggle_medication_status(
    med_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Backwards-compatible convenience toggle for today's dose status.
    """
    med = medication_store.get_medication(medication_id=med_id, user_id=current_user.id)
    # Log taken dose for today
    now_utc = datetime.now()
    schedule_id = f"sch-{med.id}"
    req = DoseEventLogRequest(
        schedule_id=schedule_id,
        scheduled_for=now_utc.isoformat(),
        status="Taken" if not getattr(med, "is_taken", False) else "Upcoming",
        timezone="UTC"
    )
    res = medication_store.log_dose_event(user_id=current_user.id, req=req)
    return {"status": "success", "user_id": current_user.id, "dose_status": res.status}
