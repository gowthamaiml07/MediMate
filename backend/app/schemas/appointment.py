from typing import Optional
from pydantic import BaseModel

class AppointmentItem(BaseModel):
    id: str
    doctor_name: str
    speciality: str
    date: str
    time: str
    location: Optional[str] = "Apollo Clinic / In-Person"
    status: str = "Upcoming"  # "Upcoming", "Past", "Cancelled"
    notes: Optional[str] = None
