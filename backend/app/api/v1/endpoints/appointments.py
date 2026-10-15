from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from typing import List, Optional
from datetime import datetime

from app.schemas.appointment import (
    AppointmentItem,
    AppointmentCreateRequest,
    AppointmentUpdateRequest,
    AppointmentRescheduleRequest,
    AppointmentCancelRequest,
    DoctorDirectoryItem,
    ICSExportResponse,
    CalendarMonthSummary,
)
from app.services.appointment_store import appointment_store
from app.core.auth import get_current_user, AuthenticatedUser

router = APIRouter()

@router.get("", response_model=List[AppointmentItem])
def get_appointments(
    status: Optional[str] = Query(None, description="Filter by status: 'Upcoming', 'Past', 'Completed', 'Cancelled', 'Rescheduled'"),
    search: Optional[str] = Query(None, description="Search term for doctor, clinic, or visit purpose"),
    date: Optional[str] = Query(None, description="Filter by specific date YYYY-MM-DD"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns appointments scoped strictly to the authenticated patient identity.
    Supports status filtering, full-text query, and specific date lookup.
    """
    return appointment_store.get_appointments(
        user_id=current_user.id,
        status_filter=status,
        search_query=search,
        date_filter=date,
    )

@router.get("/doctors", response_model=List[DoctorDirectoryItem])
def get_doctors_directory(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns the verified medical clinic and doctor directory.
    Separate from patient-entered appointments.
    """
    return appointment_store.get_doctors_directory()

@router.post("", response_model=AppointmentItem, status_code=status.HTTP_201_CREATED)
def create_appointment(
    req: AppointmentCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Creates an appointment scoped to the authenticated patient identity.
    Validates date/time, checks for overlapping bookings with warning override,
    and schedules reminders.
    """
    return appointment_store.create_appointment(user_id=current_user.id, req=req)

@router.get("/calendar/month", response_model=CalendarMonthSummary)
def get_calendar_month_view(
    year: int = Query(default=2025, ge=2020, le=2030),
    month: int = Query(default=9, ge=1, le=12),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns an aggregated monthly calendar grid with appointment indicators and days.
    """
    return appointment_store.get_calendar_month_summary(
        user_id=current_user.id,
        year=year,
        month=month,
    )

@router.get("/{appointment_id}", response_model=AppointmentItem)
def get_appointment_details(
    appointment_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns full details of an appointment including visit notes, clinic info, and audit history.
    """
    return appointment_store.get_appointment(appointment_id=appointment_id, user_id=current_user.id)

@router.put("/{appointment_id}", response_model=AppointmentItem)
def update_appointment(
    appointment_id: str,
    req: AppointmentUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Updates editable fields of an appointment (e.g. visit notes, purpose, questions).
    """
    return appointment_store.update_appointment(
        appointment_id=appointment_id,
        user_id=current_user.id,
        req=req,
    )

@router.post("/{appointment_id}/reschedule", response_model=AppointmentItem)
def reschedule_appointment(
    appointment_id: str,
    req: AppointmentRescheduleRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Reschedules an appointment to a new date and time with overlap check and audit record.
    """
    return appointment_store.reschedule_appointment(
        appointment_id=appointment_id,
        user_id=current_user.id,
        req=req,
    )

@router.post("/{appointment_id}/cancel", response_model=AppointmentItem)
def cancel_appointment(
    appointment_id: str,
    req: AppointmentCancelRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Cancels an appointment with mandatory reason and cancels pending reminders.
    """
    return appointment_store.cancel_appointment(
        appointment_id=appointment_id,
        user_id=current_user.id,
        req=req,
    )

@router.post("/{appointment_id}/complete", response_model=AppointmentItem)
def complete_appointment(
    appointment_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Marks an appointment as completed following a clinical consultation.
    """
    return appointment_store.complete_appointment(
        appointment_id=appointment_id,
        user_id=current_user.id,
    )

@router.get("/{appointment_id}/export-ics", response_model=ICSExportResponse)
def export_appointment_ics(
    appointment_id: str,
    download: bool = Query(default=False, description="Set to true to stream as raw text/calendar attachment"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Generates an RFC 5545 compliant .ics calendar event file.
    Includes proper time zone UTC handling and character escaping.
    """
    res = appointment_store.generate_ics_calendar(appointment_id=appointment_id, user_id=current_user.id)
    if download:
        return Response(
            content=res.ics_content,
            media_type="text/calendar; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{res.filename}"'},
        )
    return res
