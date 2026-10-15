import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from app.services.reminders.base import BaseReminderProvider
from app.services.reminders.mock_provider import MockReminderProvider
from app.schemas.medication import ReminderJobItem

logger = logging.getLogger("medimate.reminders.service")

class ReminderRecord:
    def __init__(
        self,
        id: str,
        user_id: str,
        medication_id: str,
        medication_name: str,
        strength: str,
        schedule_id: str,
        scheduled_for: datetime,
        reminder_time: datetime,
        channel: str = "push",
        status: str = "pending",
        is_mock: bool = True
    ):
        self.id = id
        self.user_id = user_id
        self.medication_id = medication_id
        self.medication_name = medication_name
        self.strength = strength
        self.schedule_id = schedule_id
        self.scheduled_for = scheduled_for
        self.reminder_time = reminder_time
        self.channel = channel
        self.status = status  # 'pending', 'sent', 'failed', 'cancelled'
        self.sent_at: Optional[datetime] = None
        self.error_message: Optional[str] = None
        self.is_mock = is_mock

class ReminderService:
    def __init__(self, provider: Optional[BaseReminderProvider] = None):
        self.provider = provider or MockReminderProvider()
        self._jobs: Dict[str, ReminderRecord] = {}

    def schedule_reminders_for_instances(
        self,
        user_id: str,
        medication_id: str,
        medication_name: str,
        strength: str,
        schedule_id: str,
        instances: List[tuple], # (utc_dt, date_str, time_str)
        offset_minutes: int = 10,
        channel: str = "push"
    ) -> List[ReminderRecord]:
        created_records: List[ReminderRecord] = []

        for utc_dt, date_str, time_str in instances:
            reminder_dt = utc_dt - timedelta(minutes=offset_minutes)

            # Prevent duplicate reminder job for same schedule instance & channel
            duplicate = False
            for job in self._jobs.values():
                if (
                    job.schedule_id == schedule_id
                    and job.reminder_time == reminder_dt
                    and job.channel == channel
                    and job.status != "cancelled"
                ):
                    duplicate = True
                    break

            if duplicate:
                continue

            job_id = f"rem-{uuid.uuid4().hex[:10]}"
            record = ReminderRecord(
                id=job_id,
                user_id=user_id,
                medication_id=medication_id,
                medication_name=medication_name,
                strength=strength,
                schedule_id=schedule_id,
                scheduled_for=utc_dt,
                reminder_time=reminder_dt,
                channel=channel,
                status="pending",
                is_mock=True
            )
            self._jobs[job_id] = record
            created_records.append(record)

        return created_records

    def cancel_reminders_for_medication(self, medication_id: str, user_id: str) -> int:
        cancelled_count = 0
        for job in self._jobs.values():
            if job.medication_id == medication_id and job.user_id == user_id and job.status == "pending":
                job.status = "cancelled"
                cancelled_count += 1
        return cancelled_count

    async def dispatch_due_reminders(self, now_utc: Optional[datetime] = None) -> int:
        now = now_utc or datetime.now(timezone.utc)
        dispatched_count = 0

        for job in list(self._jobs.values()):
            if job.status == "pending" and job.reminder_time <= now:
                time_display = job.scheduled_for.strftime("%I:%M %p UTC")
                try:
                    res = await self.provider.send_reminder(
                        user_id=job.user_id,
                        recipient=job.user_id,
                        medication_name=job.medication_name,
                        strength=job.strength,
                        scheduled_time_display=time_display,
                        timing_relation="as scheduled",
                        channel=job.channel
                    )
                    job.status = "sent" if res.success else "failed"
                    job.sent_at = datetime.now(timezone.utc)
                    job.is_mock = res.is_mock
                    job.error_message = res.error_message
                    dispatched_count += 1
                except Exception as e:
                    logger.error(f"Failed to dispatch reminder {job.id}: {str(e)}")
                    job.status = "failed"
                    job.error_message = str(e)

        return dispatched_count

    def get_user_reminders(self, user_id: str) -> List[ReminderJobItem]:
        jobs = [
            ReminderJobItem(
                id=j.id,
                user_id=j.user_id,
                medication_id=j.medication_id,
                medication_name=j.medication_name,
                schedule_id=j.schedule_id,
                scheduled_for=j.scheduled_for.isoformat(),
                reminder_time=j.reminder_time.isoformat(),
                channel=j.channel,
                status=j.status,
                sent_at=j.sent_at.isoformat() if j.sent_at else None,
                error_message=j.error_message,
                is_mock=j.is_mock
            )
            for j in self._jobs.values()
            if j.user_id == user_id
        ]
        jobs.sort(key=lambda x: x.reminder_time)
        return jobs

reminder_service = ReminderService()
