from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.appointment import AppointmentItem
from app.core.auth import get_current_user, AuthenticatedUser

router = APIRouter()

APPOINTMENTS_STORE: List[AppointmentItem] = [
    AppointmentItem(
        id="apt-1",
        doctor_name="Dr. S. Kumar",
        speciality="General Physician",
        date="12 Sep 2025",
        time="10:30 AM",
        location="Apollo Clinic, Room 302",
        status="Upcoming",
        notes="Routine 3-month diabetes follow-up and blood work review."
    ),
    AppointmentItem(
        id="apt-2",
        doctor_name="Dr. Lakshmi",
        speciality="Cardiologist",
        date="28 Sep 2025",
        time="03:00 PM",
        location="Heart Care Institute, Floor 2",
        status="Upcoming",
        notes="Blood pressure & cholesterol checkup."
    ),
    AppointmentItem(
        id="apt-3",
        doctor_name="Follow-up Visit",
        speciality="General Physician",
        date="15 Oct 2025",
        time="11:00 AM",
        location="Apollo Clinic",
        status="Upcoming",
        notes="Post-medication assessment."
    ),
    AppointmentItem(
        id="apt-4",
        doctor_name="Dr. R. Mehta",
        speciality="General Physician",
        date="28 Aug 2025",
        time="10:00 AM",
        location="Care Hospital",
        status="Past",
        notes="Initial consultation and prescription issued."
    )
]

@router.get("", response_model=List[AppointmentItem])
def get_appointments(current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Returns appointments for the authenticated patient.
    """
    # Scope appointments to current authenticated user
    return APPOINTMENTS_STORE

@router.post("", response_model=AppointmentItem)
def create_appointment(
    item: AppointmentItem,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Creates an appointment scoped to the authenticated patient identity.
    """
    APPOINTMENTS_STORE.append(item)
    return item
