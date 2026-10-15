import re
import threading
from datetime import datetime, date, time as dt_time, timedelta, timezone
from typing import List, Dict, Optional, Tuple, Any
from fastapi import HTTPException, status

from app.schemas.appointment import (
    AppointmentItem,
    AppointmentCreateRequest,
    AppointmentUpdateRequest,
    AppointmentRescheduleRequest,
    AppointmentCancelRequest,
    DoctorDirectoryItem,
    AppointmentAuditRecord,
    AppointmentOverlapWarning,
    ICSExportResponse,
    CalendarMonthSummary,
    CalendarDaySummary,
)
from app.services.reminders.service import reminder_service

# Standard verified doctors directory
DOCTORS_DIRECTORY: List[DoctorDirectoryItem] = [
    DoctorDirectoryItem(
        id="doc-mehta",
        name="Dr. R. Mehta",
        speciality="General Physician",
        hospital="Care Hospital",
        phone="+91 98200 12345",
        email="dr.mehta@carehospital.com",
        rating=4.9,
        consultation_types=["In-Person", "Online"],
        is_verified=True,
        available_days=["Monday", "Tuesday", "Thursday", "Saturday"],
        clinic_address="Care Hospital, Wing A, Room 102, Healthcare Boulevard",
    ),
    DoctorDirectoryItem(
        id="doc-kumar",
        name="Dr. S. Kumar",
        speciality="Endocrinologist & Diabetologist",
        hospital="Apollo Clinic",
        phone="+91 98450 67890",
        email="dr.kumar@apolloclinic.com",
        rating=4.8,
        consultation_types=["In-Person", "Online"],
        is_verified=True,
        available_days=["Monday", "Wednesday", "Friday"],
        clinic_address="Apollo Clinic, Floor 3, Room 302, Sector 7",
    ),
    DoctorDirectoryItem(
        id="doc-lakshmi",
        name="Dr. Lakshmi Prasad",
        speciality="Cardiologist",
        hospital="Heart Care Institute",
        phone="+91 97110 54321",
        email="dr.lakshmi@heartcare.org",
        rating=4.9,
        consultation_types=["In-Person", "Online"],
        is_verified=True,
        available_days=["Tuesday", "Wednesday", "Thursday"],
        clinic_address="Heart Care Institute, Floor 2, Cardiology Wing",
    ),
    DoctorDirectoryItem(
        id="doc-davis",
        name="Dr. Jennifer Davis",
        speciality="Dermatologist",
        hospital="City Skin & Wellness",
        phone="+91 99000 88776",
        email="info@cityskin.com",
        rating=4.7,
        consultation_types=["In-Person", "Online"],
        is_verified=True,
        available_days=["Monday", "Thursday", "Friday"],
        clinic_address="City Skin Clinic, Suite 104, Wellness Arcade",
    ),
    DoctorDirectoryItem(
        id="doc-verma",
        name="Dr. Anand Verma",
        speciality="Orthopedic Surgeon",
        hospital="Apollo Hospital",
        phone="+91 98111 22334",
        email="dr.verma@apollohospitals.com",
        rating=4.8,
        consultation_types=["In-Person"],
        is_verified=True,
        available_days=["Monday", "Wednesday", "Saturday"],
        clinic_address="Apollo Hospital, Ortho Outpatient Dept, Ground Floor",
    ),
]

class AppointmentStore:
    def __init__(self):
        self._lock = threading.RLock()
        self._appointments: Dict[str, AppointmentItem] = {}
        self._id_counter = 100
        self._seed_initial_records()

    def _seed_initial_records(self):
        default_user = "00000000-0000-0000-0000-000000000001"
        initial_items = [
            AppointmentItem(
                id="apt-1",
                user_id=default_user,
                doctor_id="doc-kumar",
                doctor_name="Dr. S. Kumar",
                speciality="Endocrinologist & Diabetologist",
                appointment_date="2025-09-12",
                appointment_time="10:30 AM",
                duration_minutes=30,
                visit_type="In-Person",
                location="Apollo Clinic, Room 302",
                clinic_name="Apollo Clinic",
                clinic_phone="+91 98450 67890",
                clinic_email="dr.kumar@apolloclinic.com",
                clinic_address="Apollo Clinic, Floor 3, Room 302, Sector 7",
                status="Upcoming",
                is_locally_managed=True,
                is_verified_doctor=True,
                reminder_offsets=[1440, 60],
                visit_purpose="Routine 3-month diabetes follow-up and blood work review",
                questions_to_ask=[
                    "Should I adjust Metformin dose if morning fasting glucose is below 95?",
                    "Are there any kidney function tests needed before next refill?",
                ],
                personal_notes="Bring last week's continuous glucose monitoring log book.",
                follow_up_instructions="Maintain low-glycemic diet and walk 30 mins after dinner.",
                date="12 Sep 2025",
                time="10:30 AM",
                notes="Routine 3-month diabetes follow-up and blood work review.",
                created_at="2025-08-28T09:00:00Z",
                updated_at="2025-08-28T09:00:00Z",
                history=[
                    AppointmentAuditRecord(
                        action="created",
                        timestamp="2025-08-28T09:00:00Z",
                        details="Initial appointment created by patient",
                    )
                ],
            ),
            AppointmentItem(
                id="apt-2",
                user_id=default_user,
                doctor_id="doc-lakshmi",
                doctor_name="Dr. Lakshmi Prasad",
                speciality="Cardiologist",
                appointment_date="2025-09-28",
                appointment_time="03:00 PM",
                duration_minutes=45,
                visit_type="In-Person",
                location="Heart Care Institute, Floor 2",
                clinic_name="Heart Care Institute",
                clinic_phone="+91 97110 54321",
                clinic_email="dr.lakshmi@heartcare.org",
                clinic_address="Heart Care Institute, Floor 2, Cardiology Wing",
                status="Upcoming",
                is_locally_managed=True,
                is_verified_doctor=True,
                reminder_offsets=[1440, 60],
                visit_purpose="Blood pressure & cholesterol assessment with ECG review",
                questions_to_ask=[
                    "Is Atorvastatin 10mg once daily sufficient with current lipid profile?",
                ],
                personal_notes="Fasting lipid profile lab report completed on Sep 20.",
                date="28 Sep 2025",
                time="03:00 PM",
                notes="Blood pressure & cholesterol checkup.",
                created_at="2025-08-28T09:30:00Z",
                updated_at="2025-08-28T09:30:00Z",
                history=[
                    AppointmentAuditRecord(
                        action="created",
                        timestamp="2025-08-28T09:30:00Z",
                        details="Appointment scheduled via patient portal",
                    )
                ],
            ),
            AppointmentItem(
                id="apt-3",
                user_id=default_user,
                doctor_id="doc-kumar",
                doctor_name="Dr. S. Kumar",
                speciality="General Physician",
                appointment_date="2025-10-15",
                appointment_time="11:00 AM",
                duration_minutes=30,
                visit_type="Online",
                location="Apollo Telehealth Portal",
                clinic_name="Apollo Clinic",
                teleconsult_url="https://meet.apolloclinic.com/dr-kumar-telehealth",
                status="Upcoming",
                is_locally_managed=True,
                is_verified_doctor=True,
                reminder_offsets=[1440, 60],
                visit_purpose="Post-medication virtual review",
                questions_to_ask=["Discuss lab results and medication tolerance."],
                date="15 Oct 2025",
                time="11:00 AM",
                notes="Post-medication assessment.",
                created_at="2025-08-28T10:00:00Z",
                updated_at="2025-08-28T10:00:00Z",
                history=[
                    AppointmentAuditRecord(
                        action="created",
                        timestamp="2025-08-28T10:00:00Z",
                        details="Virtual consultation created",
                    )
                ],
            ),
            AppointmentItem(
                id="apt-4",
                user_id=default_user,
                doctor_id="doc-mehta",
                doctor_name="Dr. R. Mehta",
                speciality="General Physician",
                appointment_date="2025-08-28",
                appointment_time="10:00 AM",
                duration_minutes=30,
                visit_type="In-Person",
                location="Care Hospital, Room 102",
                clinic_name="Care Hospital",
                status="Completed",
                is_locally_managed=True,
                is_verified_doctor=True,
                visit_purpose="Initial consultation and prescription issued",
                follow_up_instructions="Started Metformin 500mg and Vitamin D3. Re-evaluate in 3 months.",
                date="28 Aug 2025",
                time="10:00 AM",
                notes="Initial consultation and prescription issued.",
                created_at="2025-08-25T11:00:00Z",
                updated_at="2025-08-28T11:00:00Z",
                history=[
                    AppointmentAuditRecord(
                        action="created",
                        timestamp="2025-08-25T11:00:00Z",
                        details="Initial appointment created",
                    ),
                    AppointmentAuditRecord(
                        action="completed",
                        timestamp="2025-08-28T11:00:00Z",
                        details="Marked completed after clinical visit",
                    ),
                ],
            ),
        ]
        for it in initial_items:
            self._appointments[it.id] = it

    def get_doctors_directory(self) -> List[DoctorDirectoryItem]:
        return DOCTORS_DIRECTORY

    def normalize_date_and_time(self, raw_date: str, raw_time: str) -> Tuple[str, str, str, str]:
        """
        Validates and parses raw date and time inputs.
        Returns: (iso_date 'YYYY-MM-DD', display_date '12 Sep 2025', iso_time 'HH:MM', display_time '10:30 AM')
        """
        # Parse Date
        clean_date = raw_date.strip()
        parsed_dt_date: Optional[date] = None

        # Try ISO first (YYYY-MM-DD)
        if re.match(r"^\d{4}-\d{2}-\d{2}$", clean_date):
            try:
                parsed_dt_date = datetime.strptime(clean_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid calendar date value: '{clean_date}'",
                )
        else:
            # Try formats like '12 Sep 2025', '12 September 2025', 'Sep 12, 2025'
            for fmt in ["%d %b %Y", "%d %B %Y", "%b %d, %Y", "%B %d, %Y", "%d/%m/%Y", "%m/%d/%Y"]:
                try:
                    parsed_dt_date = datetime.strptime(clean_date, fmt).date()
                    break
                except ValueError:
                    continue

        if not parsed_dt_date:
            raise HTTPException(
                status_code=422,
                detail=f"Unable to parse appointment date: '{raw_date}'. Use 'YYYY-MM-DD' or 'DD Mon YYYY'.",
            )

        iso_date = parsed_dt_date.strftime("%Y-%m-%d")
        display_date = parsed_dt_date.strftime("%d %b %Y")

        # Parse Time
        clean_time = raw_time.strip().upper()
        parsed_dt_time: Optional[dt_time] = None

        for fmt in ["%I:%M %p", "%I:%M%p", "%H:%M", "%H:%M:%S"]:
            try:
                parsed_dt_time = datetime.strptime(clean_time, fmt).time()
                break
            except ValueError:
                continue

        if not parsed_dt_time:
            raise HTTPException(
                status_code=422,
                detail=f"Unable to parse appointment time: '{raw_time}'. Use 'HH:MM AM/PM' or 'HH:MM'.",
            )

        iso_time = parsed_dt_time.strftime("%H:%M")
        display_time = parsed_dt_time.strftime("%I:%M %p").lstrip("0")

        return iso_date, display_date, iso_time, display_time

    def _calculate_time_span_minutes(self, time_str: str, duration_mins: int) -> Tuple[int, int]:
        """
        Returns (start_minute_of_day, end_minute_of_day).
        """
        clean_time = time_str.strip().upper()
        t: Optional[dt_time] = None
        for fmt in ["%I:%M %p", "%I:%M%p", "%H:%M"]:
            try:
                t = datetime.strptime(clean_time, fmt).time()
                break
            except ValueError:
                continue
        if not t:
            t = dt_time(9, 0)
        start_min = t.hour * 60 + t.minute
        end_min = start_min + max(10, duration_mins)
        return start_min, end_min

    def check_appointment_overlap(
        self,
        user_id: str,
        target_date: str,
        target_time: str,
        duration_minutes: int,
        exclude_id: Optional[str] = None,
    ) -> Optional[AppointmentOverlapWarning]:
        """
        Detects if another active appointment for this user overlaps with the requested interval.
        """
        iso_date, _, _, _ = self.normalize_date_and_time(target_date, target_time)
        new_start, new_end = self._calculate_time_span_minutes(target_time, duration_minutes)

        for apt in self._appointments.values():
            if apt.user_id != user_id:
                continue
            if exclude_id and apt.id == exclude_id:
                continue
            if apt.status in ["Cancelled", "Completed"]:
                continue

            apt_iso_date, _, _, _ = self.normalize_date_and_time(apt.appointment_date, apt.appointment_time)
            if apt_iso_date == iso_date:
                existing_start, existing_end = self._calculate_time_span_minutes(
                    apt.appointment_time, apt.duration_minutes
                )
                # Overlap test: startA < endB and endA > startB
                if new_start < existing_end and new_end > existing_start:
                    return AppointmentOverlapWarning(
                        has_overlap=True,
                        conflicting_appointment_id=apt.id,
                        conflicting_doctor_name=apt.doctor_name,
                        conflicting_time=apt.appointment_time,
                        conflicting_date=apt.appointment_date,
                        message=(
                            f"Appointment conflict detected: You already have an appointment with "
                            f"{apt.doctor_name} on {apt.appointment_date} at {apt.appointment_time} "
                            f"({apt.duration_minutes} mins). Overlapping scheduling will require user override."
                        ),
                    )
        return None

    def get_appointments(
        self,
        user_id: str,
        status_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        date_filter: Optional[str] = None,
    ) -> List[AppointmentItem]:
        with self._lock:
            results = []
            for apt in self._appointments.values():
                if apt.user_id != user_id:
                    continue
                # Status filter
                if status_filter and status_filter != "All":
                    if status_filter.lower() == "upcoming":
                        if apt.status not in ["Upcoming", "Scheduled", "Rescheduled"]:
                            continue
                    elif status_filter.lower() == "past":
                        if apt.status != "Completed":
                            continue
                    elif apt.status.lower() != status_filter.lower():
                        continue

                # Date filter
                if date_filter:
                    apt_iso, _, _, _ = self.normalize_date_and_time(apt.appointment_date, apt.appointment_time)
                    if apt_iso != date_filter:
                        continue

                # Search query
                if search_query:
                    q = search_query.lower()
                    text_corpus = f"{apt.doctor_name} {apt.speciality} {apt.clinic_name or ''} {apt.location or ''} {apt.visit_purpose or ''}".lower()
                    if q not in text_corpus:
                        continue

                results.append(apt)

            # Sort by appointment_date and appointment_time ascending
            results.sort(key=lambda a: (a.appointment_date, a.appointment_time))
            return results

    def get_appointment(self, appointment_id: str, user_id: str) -> AppointmentItem:
        with self._lock:
            apt = self._appointments.get(appointment_id)
            if not apt or apt.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Appointment '{appointment_id}' not found or access denied.",
                )
            return apt

    def create_appointment(self, user_id: str, req: AppointmentCreateRequest) -> AppointmentItem:
        with self._lock:
            # Overlap check
            overlap = self.check_appointment_overlap(
                user_id=user_id,
                target_date=req.appointment_date,
                target_time=req.appointment_time,
                duration_minutes=req.duration_minutes,
            )
            if overlap and not req.allow_overlap:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=overlap.model_dump(),
                )

            iso_date, display_date, iso_time, display_time = self.normalize_date_and_time(
                req.appointment_date, req.appointment_time
            )

            self._id_counter += 1
            apt_id = f"apt-{self._id_counter}"
            now_iso = datetime.now().isoformat() + "Z"

            # Check if doctor matches verified directory
            is_verified = False
            for d in DOCTORS_DIRECTORY:
                if d.name.lower() == req.doctor_name.lower():
                    is_verified = True
                    break

            new_apt = AppointmentItem(
                id=apt_id,
                user_id=user_id,
                doctor_id=req.doctor_id,
                doctor_name=req.doctor_name,
                speciality=req.speciality,
                appointment_date=iso_date,
                appointment_time=display_time,
                duration_minutes=req.duration_minutes,
                visit_type=req.visit_type,
                location=req.location or req.clinic_address or "Apollo Clinic",
                clinic_name=req.clinic_name or "Apollo Clinic",
                clinic_phone=req.clinic_phone or "+91 98450 67890",
                clinic_email=req.clinic_email,
                clinic_address=req.clinic_address,
                teleconsult_url=req.teleconsult_url,
                status="Upcoming",
                is_locally_managed=True,
                is_verified_doctor=is_verified,
                reminder_offsets=req.reminder_offsets,
                visit_purpose=req.visit_purpose,
                questions_to_ask=req.questions_to_ask,
                personal_notes=req.personal_notes,
                follow_up_instructions=req.follow_up_instructions,
                date=display_date,
                time=display_time,
                notes=req.visit_purpose or req.personal_notes,
                created_at=now_iso,
                updated_at=now_iso,
                history=[
                    AppointmentAuditRecord(
                        action="created",
                        timestamp=now_iso,
                        details=f"Appointment scheduled with {req.doctor_name} for {display_date} at {display_time}",
                    )
                ],
            )
            self._appointments[apt_id] = new_apt

            # Register appointment reminders via ReminderService
            self._schedule_appointment_reminders(new_apt)

            return new_apt

    def update_appointment(
        self, appointment_id: str, user_id: str, req: AppointmentUpdateRequest
    ) -> AppointmentItem:
        with self._lock:
            apt = self.get_appointment(appointment_id, user_id)
            now_iso = datetime.now().isoformat() + "Z"

            prev_state = apt.model_dump()
            if req.doctor_name is not None:
                apt.doctor_name = req.doctor_name
            if req.speciality is not None:
                apt.speciality = req.speciality
            if req.duration_minutes is not None:
                apt.duration_minutes = req.duration_minutes
            if req.visit_type is not None:
                apt.visit_type = req.visit_type
            if req.location is not None:
                apt.location = req.location
            if req.clinic_name is not None:
                apt.clinic_name = req.clinic_name
            if req.clinic_phone is not None:
                apt.clinic_phone = req.clinic_phone
            if req.clinic_email is not None:
                apt.clinic_email = req.clinic_email
            if req.clinic_address is not None:
                apt.clinic_address = req.clinic_address
            if req.teleconsult_url is not None:
                apt.teleconsult_url = req.teleconsult_url
            if req.visit_purpose is not None:
                apt.visit_purpose = req.visit_purpose
            if req.questions_to_ask is not None:
                apt.questions_to_ask = req.questions_to_ask
            if req.personal_notes is not None:
                apt.personal_notes = req.personal_notes
            if req.follow_up_instructions is not None:
                apt.follow_up_instructions = req.follow_up_instructions
            if req.reminder_offsets is not None:
                apt.reminder_offsets = req.reminder_offsets

            apt.updated_at = now_iso
            apt.history.append(
                AppointmentAuditRecord(
                    action="updated",
                    timestamp=now_iso,
                    details="Appointment details updated by patient",
                    previous_state={"visit_purpose": prev_state.get("visit_purpose")},
                )
            )
            self._appointments[appointment_id] = apt
            return apt

    def reschedule_appointment(
        self, appointment_id: str, user_id: str, req: AppointmentRescheduleRequest
    ) -> AppointmentItem:
        with self._lock:
            apt = self.get_appointment(appointment_id, user_id)

            if apt.status == "Cancelled":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot reschedule a cancelled appointment. Please book a new visit.",
                )

            # Check for conflict at new time
            overlap = self.check_appointment_overlap(
                user_id=user_id,
                target_date=req.new_date,
                target_time=req.new_time,
                duration_minutes=apt.duration_minutes,
                exclude_id=appointment_id,
            )
            if overlap and not req.allow_overlap:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=overlap.dict(),
                )

            iso_date, display_date, iso_time, display_time = self.normalize_date_and_time(
                req.new_date, req.new_time
            )

            now_iso = datetime.now().isoformat() + "Z"
            prev_date = apt.appointment_date
            prev_time = apt.appointment_time

            apt.rescheduled_from = f"{prev_date} {prev_time}"
            apt.appointment_date = iso_date
            apt.appointment_time = display_time
            apt.date = display_date
            apt.time = display_time
            apt.status = "Rescheduled"
            apt.updated_at = now_iso

            apt.history.append(
                AppointmentAuditRecord(
                    action="rescheduled",
                    timestamp=now_iso,
                    details=(
                        f"Rescheduled from {prev_date} {prev_time} to {display_date} {display_time}. "
                        f"Reason: {req.reason or 'Patient schedule change'}"
                    ),
                    previous_state={"date": prev_date, "time": prev_time},
                )
            )

            # Update reminders
            self._cancel_appointment_reminders(appointment_id)
            self._schedule_appointment_reminders(apt)

            self._appointments[appointment_id] = apt
            return apt

    def cancel_appointment(
        self, appointment_id: str, user_id: str, req: AppointmentCancelRequest
    ) -> AppointmentItem:
        with self._lock:
            apt = self.get_appointment(appointment_id, user_id)

            if apt.status == "Cancelled":
                return apt

            now_iso = datetime.now().isoformat() + "Z"
            apt.status = "Cancelled"
            apt.cancellation_reason = req.reason
            apt.updated_at = now_iso

            apt.history.append(
                AppointmentAuditRecord(
                    action="cancelled",
                    timestamp=now_iso,
                    details=f"Appointment cancelled. Reason: {req.reason}",
                )
            )

            # Cancel all pending reminders
            self._cancel_appointment_reminders(appointment_id)

            self._appointments[appointment_id] = apt
            return apt

    def complete_appointment(self, appointment_id: str, user_id: str) -> AppointmentItem:
        with self._lock:
            apt = self.get_appointment(appointment_id, user_id)
            now_iso = datetime.now().isoformat() + "Z"
            apt.status = "Completed"
            apt.updated_at = now_iso

            apt.history.append(
                AppointmentAuditRecord(
                    action="completed",
                    timestamp=now_iso,
                    details="Appointment marked as completed",
                )
            )
            self._cancel_appointment_reminders(appointment_id)
            self._appointments[appointment_id] = apt
            return apt

    def generate_ics_calendar(self, appointment_id: str, user_id: str) -> ICSExportResponse:
        """
        Generates RFC 5545 iCalendar content with escaped fields and proper UTC timestamps.
        """
        apt = self.get_appointment(appointment_id, user_id)
        iso_date, _, iso_time, _ = self.normalize_date_and_time(apt.appointment_date, apt.appointment_time)

        # Parse start datetime
        try:
            start_dt = datetime.strptime(f"{iso_date} {iso_time}", "%Y-%m-%d %H:%M")
        except ValueError:
            start_dt = datetime.now() + timedelta(days=1)

        end_dt = start_dt + timedelta(minutes=max(15, apt.duration_minutes))

        dtstamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        dtstart = start_dt.strftime("%Y%m%dT%H%M%SZ")
        dtend = end_dt.strftime("%Y%m%dT%H%M%SZ")

        # RFC 5545 escaping helper
        def escape_ics(text: Optional[str]) -> str:
            if not text:
                return ""
            s = text.replace("\\", "\\\\")
            s = s.replace(";", "\\;")
            s = s.replace(",", "\\,")
            s = s.replace("\n", "\\n")
            return s

        summary = escape_ics(f"Medical Appointment: {apt.doctor_name} ({apt.speciality})")
        location = escape_ics(apt.location or apt.clinic_address or "Apollo Clinic")

        description_parts = [
            f"Doctor: {apt.doctor_name} - {apt.speciality}",
            f"Clinic: {apt.clinic_name or 'Apollo Clinic'}",
            f"Visit Type: {apt.visit_type}",
        ]
        if apt.visit_purpose:
            description_parts.append(f"Purpose: {apt.visit_purpose}")
        if apt.questions_to_ask:
            description_parts.append("Questions to ask: " + " | ".join(apt.questions_to_ask))
        if apt.personal_notes:
            description_parts.append(f"Patient Notes: {apt.personal_notes}")
        if apt.teleconsult_url:
            description_parts.append(f"Video Link: {apt.teleconsult_url}")

        description = escape_ics("\n".join(description_parts))

        ics_lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//MediMate AI//Healthcare Calendar Export//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            f"UID:apt-{apt.id}@medimate.ai",
            f"DTSTAMP:{dtstamp}",
            f"DTSTART:{dtstart}",
            f"DTEND:{dtend}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{description}",
            f"LOCATION:{location}",
            f"STATUS:{'CONFIRMED' if apt.status in ['Upcoming', 'Scheduled', 'Rescheduled'] else 'CANCELLED'}",
            "CLASS:PRIVATE",
            "BEGIN:VALARM",
            "TRIGGER:-PT60M",
            "ACTION:DISPLAY",
            f"DESCRIPTION:Reminder: Medical appointment with {escape_ics(apt.doctor_name)} in 1 hour",
            "END:VALARM",
            "END:VEVENT",
            "END:VCALENDAR",
        ]
        ics_text = "\r\n".join(ics_lines) + "\r\n"
        clean_doc_name = re.sub(r"[^a-zA-Z0-9_-]", "_", apt.doctor_name)
        filename = f"medimate_appointment_{clean_doc_name}_{iso_date}.ics"

        return ICSExportResponse(
            filename=filename,
            ics_content=ics_text,
            disclaimer=(
                "Exported as an RFC-5545 .ics calendar file. Direct two-way cloud sync "
                "(Google Calendar / Apple iCloud / Outlook API) is unconfigured. "
                "Import this file directly into your device's calendar app."
            ),
        )

    def get_calendar_month_summary(self, user_id: str, year: int, month: int) -> CalendarMonthSummary:
        """
        Generates month days and aggregates appointments for calendar agenda views.
        """
        import calendar

        with self._lock:
            cal = calendar.Calendar(firstweekday=0) # Monday first
            month_days = cal.monthdatescalendar(year, month)
            month_name = calendar.month_name[month]

            days_summary: List[CalendarDaySummary] = []
            total_apts = 0

            # Index appointments for user in this month range
            apts_by_date: Dict[str, List[AppointmentItem]] = {}
            for apt in self._appointments.values():
                if apt.user_id != user_id:
                    continue
                iso_d, _, _, _ = self.normalize_date_and_time(apt.appointment_date, apt.appointment_time)
                apts_by_date.setdefault(iso_d, []).append(apt)

            for week in month_days:
                for d in week:
                    d_iso = d.strftime("%Y-%m-%d")
                    day_apts = apts_by_date.get(d_iso, [])
                    statuses = list({a.status for a in day_apts})
                    is_curr = d.month == month
                    if is_curr:
                        total_apts += len(day_apts)

                    days_summary.append(
                        CalendarDaySummary(
                            date=d_iso,
                            day_number=d.day,
                            is_current_month=is_curr,
                            appointment_count=len(day_apts),
                            statuses=statuses,
                            appointments=day_apts,
                        )
                    )

            return CalendarMonthSummary(
                year=year,
                month=month,
                month_name=month_name,
                total_appointments=total_apts,
                days=days_summary,
            )

    def _schedule_appointment_reminders(self, apt: AppointmentItem):
        """
        Schedules reminder jobs using the Step 5 ReminderService.
        """
        if not apt.reminder_offsets:
            return

        iso_date, _, iso_time, _ = self.normalize_date_and_time(apt.appointment_date, apt.appointment_time)
        try:
            apt_dt = datetime.strptime(f"{iso_date} {iso_time}", "%Y-%m-%d %H:%M")
        except ValueError:
            return

        for offset_min in apt.reminder_offsets:
            rem_time = apt_dt - timedelta(minutes=offset_min)
            # Create a reminder job via reminder_service
            reminder_service.schedule_appointment_reminder(
                user_id=apt.user_id or "00000000-0000-0000-0000-000000000001",
                appointment_id=apt.id,
                doctor_name=apt.doctor_name,
                appointment_time=f"{apt.appointment_date} {apt.appointment_time}",
                reminder_time=rem_time.isoformat() + "Z",
                offset_minutes=offset_min,
            )

    def _cancel_appointment_reminders(self, appointment_id: str):
        reminder_service.cancel_appointment_reminders(appointment_id)


# Global singleton instance
appointment_store = AppointmentStore()
