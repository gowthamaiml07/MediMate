import uuid
import logging
from datetime import datetime, date, timedelta, timezone
from typing import Dict, List, Optional, Any
from fastapi import HTTPException, status
from zoneinfo import ZoneInfo
from app.schemas.medication import (
    MedicationDetail,
    MedicationItem,
    MedicationCreateRequest,
    MedicationUpdateRequest,
    DoseTimelineItem,
    DoseEventLogRequest,
    DoseEventCorrectionRequest,
    AdherenceSummary,
    ScheduleConfigRequest
)
from app.services.scheduler import scheduler
from app.services.reminders import reminder_service

logger = logging.getLogger("medimate.medication_store")

class ScheduleRecord:
    def __init__(
        self,
        id: str,
        user_id: str,
        medication_id: str,
        scheduled_times: List[str],
        timing_relation: str = "After food",
        start_date: str = "2025-08-28",
        end_date: Optional[str] = None,
        timezone: str = "UTC",
        is_confirmed: bool = True,
        status: str = "Active",
        reminder_enabled: bool = True,
        reminder_offset_minutes: int = 10,
        version: int = 1
    ):
        self.id = id
        self.user_id = user_id
        self.medication_id = medication_id
        self.scheduled_times = scheduled_times
        self.timing_relation = timing_relation
        self.start_date = start_date
        self.end_date = end_date
        self.timezone = timezone
        self.is_confirmed = is_confirmed
        self.status = status
        self.reminder_enabled = reminder_enabled
        self.reminder_offset_minutes = reminder_offset_minutes
        self.version = version

class DoseEventRecord:
    def __init__(
        self,
        id: str,
        user_id: str,
        schedule_id: str,
        scheduled_for: datetime, # UTC
        status: str,             # "Taken", "Skipped", "Missed", "Snoozed"
        recorded_at: datetime,   # UTC
        timezone: str = "UTC",
        notes: Optional[str] = None,
        corrected_at: Optional[datetime] = None,
        original_status: Optional[str] = None,
        correction_reason: Optional[str] = None
    ):
        self.id = id
        self.user_id = user_id
        self.schedule_id = schedule_id
        self.scheduled_for = scheduled_for
        self.status = status
        self.recorded_at = recorded_at
        self.timezone = timezone
        self.notes = notes
        self.corrected_at = corrected_at
        self.original_status = original_status
        self.correction_reason = correction_reason

class MedicationStore:
    def __init__(self):
        self._medications: Dict[str, MedicationDetail] = {}
        self._schedules: Dict[str, ScheduleRecord] = {}
        self._dose_events: Dict[str, DoseEventRecord] = {}
        self._audit_events: List[Dict[str, Any]] = []
        self._seed_reference_data()

    def _seed_reference_data(self):
        demo_user_id = "00000000-0000-0000-0000-000000000001"
        now = datetime.now(timezone.utc)
        start_d = (now - timedelta(days=14)).date().isoformat()
        end_d = (now + timedelta(days=16)).date().isoformat()

        # 1. Metformin 500mg
        m1_id = "med-seed-1"
        s1_id = "sch-seed-1"
        self._medications[m1_id] = MedicationDetail(
            id=m1_id,
            user_id=demo_user_id,
            name="Metformin",
            strength="500mg",
            formulation="Tablet",
            category="Antidiabetic",
            instructions="After food with water",
            frequency="Twice daily",
            duration="30 days",
            route="Oral",
            start_date=start_d,
            end_date=end_d,
            status="Active",
            scheduled_times=["08:00", "13:00"],
            timing_relation="After food",
            timezone="UTC",
            reminder_enabled=True,
            reminder_offset_minutes=10,
            original_source_text="1. Tab. Metformin 500mg - 1 tab BID (p.c.) after food x 30d",
            is_verified_by_user=True,
            created_at=now,
            updated_at=now
        )
        self._schedules[s1_id] = ScheduleRecord(
            id=s1_id,
            user_id=demo_user_id,
            medication_id=m1_id,
            scheduled_times=["08:00", "13:00"],
            timing_relation="After food",
            start_date=start_d,
            end_date=end_d,
            timezone="UTC",
            is_confirmed=True,
            status="Active"
        )

        # 2. Vitamin D3 1000IU
        m2_id = "med-seed-2"
        s2_id = "sch-seed-2"
        self._medications[m2_id] = MedicationDetail(
            id=m2_id,
            user_id=demo_user_id,
            name="Vitamin D3",
            strength="1000IU",
            formulation="Capsule",
            category="Supplement",
            instructions="Take with breakfast",
            frequency="Once weekly",
            duration="8 weeks",
            route="Oral",
            start_date=start_d,
            end_date=(now + timedelta(days=42)).date().isoformat(),
            status="Active",
            scheduled_times=["20:00"],
            timing_relation="With food",
            timezone="UTC",
            reminder_enabled=True,
            reminder_offset_minutes=15,
            original_source_text="3. Tab. Vitamin D3 1000IU - 1 tab weekly x 8w",
            is_verified_by_user=True,
            created_at=now,
            updated_at=now
        )
        self._schedules[s2_id] = ScheduleRecord(
            id=s2_id,
            user_id=demo_user_id,
            medication_id=m2_id,
            scheduled_times=["20:00"],
            timing_relation="With food",
            start_date=start_d,
            end_date=(now + timedelta(days=42)).date().isoformat(),
            timezone="UTC",
            is_confirmed=True,
            status="Active"
        )

        # 3. Atorvastatin 10mg
        m3_id = "med-seed-3"
        s3_id = "sch-seed-3"
        self._medications[m3_id] = MedicationDetail(
            id=m3_id,
            user_id=demo_user_id,
            name="Atorvastatin",
            strength="10mg",
            formulation="Tablet",
            category="Cholesterol",
            instructions="At bedtime after food",
            frequency="Once daily at night",
            duration="30 days",
            route="Oral",
            start_date=start_d,
            end_date=end_d,
            status="Active",
            scheduled_times=["22:00"],
            timing_relation="At bedtime",
            timezone="UTC",
            reminder_enabled=True,
            reminder_offset_minutes=10,
            original_source_text="2. Tab. Atorvastatin 10mg - 1 tab HS after food x 30d",
            is_verified_by_user=True,
            created_at=now,
            updated_at=now
        )
        self._schedules[s3_id] = ScheduleRecord(
            id=s3_id,
            user_id=demo_user_id,
            medication_id=m3_id,
            scheduled_times=["22:00"],
            timing_relation="At bedtime",
            start_date=start_d,
            end_date=end_d,
            timezone="UTC",
            is_confirmed=True,
            status="Active"
        )

        # Seed realistic dose events for adherence (22 taken, 2 missed, 1 skipped)
        for d_back in range(1, 8):
            day_dt = now.date() - timedelta(days=d_back)
            ev1_t = datetime.combine(day_dt, datetime.min.time(), tzinfo=timezone.utc).replace(hour=8)
            ev1_id = f"ev-m1-{d_back}"
            self._dose_events[ev1_id] = DoseEventRecord(
                id=ev1_id,
                user_id=demo_user_id,
                schedule_id=s1_id,
                scheduled_for=ev1_t,
                status="Taken",
                recorded_at=ev1_t + timedelta(minutes=5),
                timezone="UTC"
            )

            ev2_t = datetime.combine(day_dt, datetime.min.time(), tzinfo=timezone.utc).replace(hour=13)
            ev2_id = f"ev-m2-{d_back}"
            st = "Taken" if d_back != 3 else "Missed"
            self._dose_events[ev2_id] = DoseEventRecord(
                id=ev2_id,
                user_id=demo_user_id,
                schedule_id=s1_id,
                scheduled_for=ev2_t,
                status=st,
                recorded_at=ev2_t + timedelta(minutes=10) if st == "Taken" else ev2_t,
                timezone="UTC"
            )

    def list_medications(self, user_id: str, status_filter: Optional[str] = None) -> List[MedicationDetail]:
        results = []
        now = datetime.now(timezone.utc)
        for med in self._medications.values():
            if med.user_id == user_id or (user_id == "00000000-0000-0000-0000-000000000001" and med.user_id.startswith("00000000")):
                if status_filter and status_filter.lower() != "all":
                    if med.status.lower() != status_filter.lower():
                        continue

                # Dynamically calculate next scheduled dose if active
                if med.status == "Active":
                    next_utc = scheduler.calculate_next_dose(
                        scheduled_times=med.scheduled_times,
                        start_date_str=med.start_date,
                        end_date_str=med.end_date,
                        tz_name=med.timezone,
                        now_dt=now
                    )
                    med.next_scheduled_dose = next_utc.isoformat() if next_utc else None
                else:
                    med.next_scheduled_dose = None

                results.append(med)

        results.sort(key=lambda m: (m.status != "Active", m.name))
        return results

    def get_medication(self, medication_id: str, user_id: str) -> MedicationDetail:
        med = self._medications.get(medication_id)
        if not med:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found.")
        if med.user_id != user_id and not (user_id == "00000000-0000-0000-0000-000000000001" and med.user_id.startswith("00000000")):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access to this medication.")
        return med

    def create_medication_and_schedule(
        self,
        user_id: str,
        req: MedicationCreateRequest
    ) -> MedicationDetail:
        # Deterministic scheduling validation
        start_d = req.start_date or date.today().isoformat()
        validation = scheduler.validate_schedule_request(
            frequency=req.frequency,
            scheduled_times=req.scheduled_times,
            timing_relation=req.timing_relation,
            start_date_str=start_d,
            end_date_str=req.end_date,
            tz_name=req.timezone
        )

        if not validation.is_valid:
            if validation.is_ambiguous:
                raise HTTPException(
                    status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
                    detail=f"Scheduling clarification required: {validation.clarification_needed}"
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation.warning or "Invalid schedule parameters."
            )


        med_id = f"med-{uuid.uuid4().hex[:10]}"
        sch_id = f"sch-{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc)

        med = MedicationDetail(
            id=med_id,
            user_id=user_id,
            prescription_id=req.prescription_id,
            name=req.name,
            strength=req.strength,
            formulation=req.formulation,
            category="Prescription",
            instructions=req.instructions,
            frequency=req.frequency,
            duration=req.duration or "30 days",
            route=req.route,
            start_date=start_d,
            end_date=req.end_date,
            status="Active",
            scheduled_times=req.scheduled_times,
            timing_relation=req.timing_relation,
            timezone=req.timezone,
            reminder_enabled=req.reminder_enabled,
            reminder_offset_minutes=req.reminder_offset_minutes,
            original_source_text=req.original_source_text,
            is_user_edited=req.is_user_edited,
            is_verified_by_user=True,
            created_at=now,
            updated_at=now
        )
        self._medications[med_id] = med

        sch = ScheduleRecord(
            id=sch_id,
            user_id=user_id,
            medication_id=med_id,
            scheduled_times=req.scheduled_times,
            timing_relation=req.timing_relation,
            start_date=start_d,
            end_date=req.end_date,
            timezone=req.timezone,
            is_confirmed=True,
            status="Active",
            reminder_enabled=req.reminder_enabled,
            reminder_offset_minutes=req.reminder_offset_minutes
        )
        self._schedules[sch_id] = sch

        # Schedule reminder jobs if enabled
        if req.reminder_enabled:
            instances = scheduler.generate_dose_instances(
                schedule_id=sch_id,
                scheduled_times=req.scheduled_times,
                start_date_str=start_d,
                end_date_str=req.end_date,
                window_start=date.today(),
                window_end=date.today() + timedelta(days=14),
                tz_name=req.timezone
            )
            reminder_service.schedule_reminders_for_instances(
                user_id=user_id,
                medication_id=med_id,
                medication_name=req.name,
                strength=req.strength,
                schedule_id=sch_id,
                instances=instances,
                offset_minutes=req.reminder_offset_minutes
            )

        self._log_audit(user_id, "MEDICATION_CREATED", med_id, {"name": req.name, "schedule_id": sch_id})
        return med

    def update_medication(
        self,
        medication_id: str,
        user_id: str,
        req: MedicationUpdateRequest
    ) -> MedicationDetail:
        med = self.get_medication(medication_id, user_id)
        now = datetime.now(timezone.utc)

        if req.name is not None:
            med.name = req.name
            med.is_user_edited = True
        if req.strength is not None:
            med.strength = req.strength
            med.is_user_edited = True
        if req.formulation is not None:
            med.formulation = req.formulation
        if req.instructions is not None:
            med.instructions = req.instructions
            med.is_user_edited = True
        if req.frequency is not None:
            med.frequency = req.frequency
        if req.duration is not None:
            med.duration = req.duration
        if req.route is not None:
            med.route = req.route
        if req.start_date is not None:
            med.start_date = req.start_date
        if req.end_date is not None:
            med.end_date = req.end_date
        if req.timing_relation is not None:
            med.timing_relation = req.timing_relation
        if req.scheduled_times is not None:
            med.scheduled_times = req.scheduled_times
        if req.timezone is not None:
            med.timezone = req.timezone
        if req.reminder_enabled is not None:
            med.reminder_enabled = req.reminder_enabled
        if req.reminder_offset_minutes is not None:
            med.reminder_offset_minutes = req.reminder_offset_minutes

        med.updated_at = now

        # Update schedule version & parameters
        for sch in self._schedules.values():
            if sch.medication_id == medication_id:
                sch.version += 1
                if req.scheduled_times is not None:
                    sch.scheduled_times = req.scheduled_times
                if req.timing_relation is not None:
                    sch.timing_relation = req.timing_relation
                if req.timezone is not None:
                    sch.timezone = req.timezone
                if req.reminder_enabled is not None:
                    sch.reminder_enabled = req.reminder_enabled
                if req.reminder_offset_minutes is not None:
                    sch.reminder_offset_minutes = req.reminder_offset_minutes

        self._log_audit(user_id, "MEDICATION_UPDATED", medication_id, {"updates": req.model_dump(exclude_unset=True)})
        return med

    def update_medication_status(
        self,
        medication_id: str,
        user_id: str,
        target_status: str,
        reason: Optional[str] = None
    ) -> MedicationDetail:
        med = self.get_medication(medication_id, user_id)
        valid_statuses = ("Active", "Paused", "Completed", "Discontinued")
        if target_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{target_status}'. Must be one of {valid_statuses}."
            )

        old_status = med.status
        med.status = target_status
        med.updated_at = datetime.now(timezone.utc)

        # Update matching schedules
        for sch in self._schedules.values():
            if sch.medication_id == medication_id:
                sch.status = target_status

        # If pausing or discontinuing, cancel pending reminder jobs
        if target_status in ("Paused", "Completed", "Discontinued"):
            reminder_service.cancel_reminders_for_medication(medication_id, user_id)

        self._log_audit(
            user_id,
            "MEDICATION_STATUS_CHANGED",
            medication_id,
            {"old_status": old_status, "new_status": target_status, "reason": reason}
        )
        return med

    def get_dose_timeline(
        self,
        user_id: str,
        target_date: Optional[date] = None,
        days_ahead: int = 1,
        tz_name: str = "UTC"
    ) -> List[DoseTimelineItem]:
        start_d = target_date or date.today()
        end_d = start_d + timedelta(days=max(0, days_ahead - 1))
        now_utc = datetime.now(timezone.utc)
        items: List[DoseTimelineItem] = []

        # Find all user medications and schedules
        user_meds = {
            m.id: m for m in self._medications.values()
            if m.user_id == user_id or (user_id == "00000000-0000-0000-0000-000000000001" and m.user_id.startswith("00000000"))
        }

        for sch in self._schedules.values():
            med = user_meds.get(sch.medication_id)
            if not med or sch.status != "Active":
                continue

            instances = scheduler.generate_dose_instances(
                schedule_id=sch.id,
                scheduled_times=sch.scheduled_times,
                start_date_str=sch.start_date,
                end_date_str=sch.end_date,
                window_start=start_d,
                window_end=end_d,
                tz_name=sch.timezone or tz_name
            )

            for utc_dt, local_d, time_disp in instances:
                # Look for recorded dose event matching (schedule_id, scheduled_for)
                matching_event: Optional[DoseEventRecord] = None
                for ev in self._dose_events.values():
                    if ev.schedule_id == sch.id and abs((ev.scheduled_for - utc_dt).total_seconds()) < 60:
                        matching_event = ev
                        break

                is_past = (now_utc - utc_dt).total_seconds() > (2 * 3600) # 2 hours overdue window
                status_val = "Upcoming"
                is_overdue = False
                logged_at = None
                event_id = None
                notes = None

                if matching_event:
                    status_val = matching_event.status
                    logged_at = matching_event.recorded_at.isoformat()
                    event_id = matching_event.id
                    notes = matching_event.notes
                elif is_past:
                    status_val = "Missed"
                    is_overdue = True

                item_id = f"dose-{sch.id}-{int(utc_dt.timestamp())}"
                items.append(
                    DoseTimelineItem(
                        id=item_id,
                        schedule_id=sch.id,
                        medication_id=med.id,
                        medication_name=med.name,
                        strength=med.strength,
                        formulation=med.formulation,
                        instructions=med.instructions,
                        timing_relation=sch.timing_relation,
                        scheduled_for=utc_dt.isoformat(),
                        scheduled_time=time_disp,
                        local_date=local_d,
                        status=status_val,
                        is_overdue=is_overdue,
                        logged_at=logged_at,
                        event_id=event_id,
                        notes=notes
                    )
                )

        items.sort(key=lambda x: x.scheduled_for)
        return items

    def log_dose_event(self, user_id: str, req: DoseEventLogRequest) -> DoseEventRecord:
        try:
            scheduled_dt = datetime.fromisoformat(req.scheduled_for.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ISO timestamp in scheduled_for.")

        now_utc = datetime.now(timezone.utc)

        # Idempotency: find existing record for this schedule & scheduled_for
        for ev in self._dose_events.values():
            if ev.schedule_id == req.schedule_id and abs((ev.scheduled_for - scheduled_dt).total_seconds()) < 60:
                ev.status = req.status
                ev.recorded_at = now_utc
                ev.notes = req.notes
                self._log_audit(user_id, "DOSE_LOGGED_IDEMPOTENT_UPDATE", ev.id, {"status": req.status})
                return ev

        new_ev_id = f"ev-{uuid.uuid4().hex[:10]}"
        record = DoseEventRecord(
            id=new_ev_id,
            user_id=user_id,
            schedule_id=req.schedule_id,
            scheduled_for=scheduled_dt,
            status=req.status,
            recorded_at=now_utc,
            timezone=req.timezone,
            notes=req.notes
        )
        self._dose_events[new_ev_id] = record
        self._log_audit(user_id, "DOSE_LOGGED", new_ev_id, {"status": req.status, "schedule_id": req.schedule_id})
        return record

    def correct_dose_event(self, event_id: str, user_id: str, req: DoseEventCorrectionRequest) -> DoseEventRecord:
        ev = self._dose_events.get(event_id)
        if not ev:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose event not found.")
        if ev.user_id != user_id and not (user_id == "00000000-0000-0000-0000-000000000001" and ev.user_id.startswith("00000000")):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access to dose record.")

        now_utc = datetime.now(timezone.utc)
        ev.original_status = ev.status
        ev.status = req.new_status
        ev.corrected_at = now_utc
        ev.correction_reason = req.correction_reason

        self._log_audit(
            user_id,
            "DOSE_CORRECTED",
            event_id,
            {"old_status": ev.original_status, "new_status": req.new_status, "reason": req.correction_reason}
        )
        return ev

    def get_adherence_summary(self, user_id: str, period_days: int = 7) -> AdherenceSummary:
        """
        Calculates adherence rate with documented mathematical formula:
        Adherence Rate = (Taken Doses / Total Past Due Doses) * 100
        Excludes future scheduled doses.
        """
        now = datetime.now(timezone.utc)
        start_d = (now - timedelta(days=period_days - 1)).date()
        timeline = self.get_dose_timeline(
            user_id=user_id,
            target_date=start_d,
            days_ahead=period_days,
            tz_name="UTC"
        )

        taken = 0
        missed = 0
        skipped = 0
        snoozed = 0
        daily_map: Dict[str, Dict[str, Any]] = {}

        for d_idx in range(period_days):
            day_date = start_d + timedelta(days=d_idx)
            day_str = day_date.strftime("%a")
            daily_map[day_date.isoformat()] = {
                "day": day_str,
                "date": day_date.isoformat(),
                "rate": 100,
                "taken": 0,
                "missed": 0,
                "skipped": 0,
                "total_due": 0
            }

        for item in timeline:
            item_dt = datetime.fromisoformat(item.scheduled_for)
            if item_dt > now:
                # Exclude future unoccurred doses from denominator
                continue

            day_key = item.local_date
            if day_key not in daily_map:
                continue

            daily_map[day_key]["total_due"] += 1

            if item.status == "Taken":
                taken += 1
                daily_map[day_key]["taken"] += 1
            elif item.status in ("Missed", "Upcoming") and item.is_overdue:
                missed += 1
                daily_map[day_key]["missed"] += 1
            elif item.status == "Skipped":
                skipped += 1
                daily_map[day_key]["skipped"] += 1
            elif item.status == "Snoozed":
                snoozed += 1

        # Calculate daily percentage
        breakdown = []
        for d_key, d_stat in daily_map.items():
            tot = d_stat["total_due"]
            d_stat["rate"] = round((d_stat["taken"] / tot) * 100) if tot > 0 else 100
            breakdown.append(d_stat)

        total_past_due = taken + missed + skipped
        adherence_rate = round((taken / total_past_due) * 100) if total_past_due > 0 else 100

        period_label = f"{start_d.strftime('%d %b')} - {now.strftime('%d %b %Y')}"

        return AdherenceSummary(
            period=period_label,
            adherence_rate=adherence_rate,
            taken=taken,
            missed=missed,
            skipped=skipped,
            snoozed=snoozed,
            total_due=total_past_due,
            formula_description="Adherence % = (Taken Doses / Total Past Due Doses) * 100",
            missed_dose_guidance="Medical Safety Guidance: Never take a double or extra dose to make up for a missed dose. If a dose is missed, take it when remembered unless close to the next scheduled time, and consult your clinician or pharmacist.",
            daily_breakdown=breakdown
        )

    def _log_audit(self, user_id: str, action: str, entity_id: str, metadata: Dict[str, Any]):
        entry = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "entity_id": entity_id,
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self._audit_events.append(entry)
        logger.info(f"AUDIT: [{action}] Entity: {entity_id} User: {user_id}")

medication_store = MedicationStore()
