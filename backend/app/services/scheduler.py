import re
from datetime import datetime, date, time, timedelta, timezone
from typing import List, Optional, Tuple, Dict
from zoneinfo import ZoneInfo
from app.schemas.medication import ScheduleValidationResult, ScheduleConfigRequest

class DeterministicScheduler:
    """
    Deterministic clinical medication scheduling engine.
    Follows validated clinical safety rules:
    - Never uses an LLM to guess dosage times or infer missing instructions.
    - If frequency is ambiguous (e.g. 'take as needed' or 'twice daily' with no times),
      flags for mandatory patient confirmation.
    - Handles timezone boundaries and ISO conversion cleanly.
    """

    DEFAULT_FREQUENCY_MAPPINGS: Dict[str, List[str]] = {
        "once daily in morning": ["08:00"],
        "once daily at night": ["21:00"],
        "once daily at bedtime": ["21:00"],
        "once daily": ["08:00"],
        "twice daily": ["08:00", "20:00"],
        "twice daily after food": ["08:00", "20:00"],
        "three times daily": ["08:00", "13:00", "20:00"],
        "four times daily": ["08:00", "12:00", "16:00", "20:00"],
        "once weekly": ["09:00"],
    }

    def validate_schedule_request(
        self,
        frequency: str,
        scheduled_times: List[str],
        timing_relation: str,
        start_date_str: str,
        end_date_str: Optional[str] = None,
        tz_name: str = "UTC"
    ) -> ScheduleValidationResult:
        freq_clean = (frequency or "").strip().lower()

        # 1. Check for ambiguous or SOS frequencies
        if not freq_clean or "as directed" in freq_clean or "prn" in freq_clean or "sos" in freq_clean or "as needed" in freq_clean:
            return ScheduleValidationResult(
                is_valid=False,
                is_ambiguous=True,
                clarification_needed="Prescription indicates as-needed (PRN/SOS) or non-specific frequency. Recurring automatic dose times cannot be scheduled without clinician clarification.",
                proposed_times=[]
            )

        # 2. Check for missing or invalid scheduled times
        if not scheduled_times or len(scheduled_times) == 0:
            suggested = self.DEFAULT_FREQUENCY_MAPPINGS.get(freq_clean, ["08:00"])
            return ScheduleValidationResult(
                is_valid=False,
                is_ambiguous=True,
                clarification_needed=f"Exact administration times for '{frequency}' are not specified. Please confirm your preferred times.",
                proposed_times=suggested
            )

        # 3. Validate time format HH:MM
        time_regex = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
        for t in scheduled_times:
            if not time_regex.match(t):
                return ScheduleValidationResult(
                    is_valid=False,
                    warning=f"Invalid time format '{t}'. Must be 24-hour HH:MM (e.g. 08:00, 20:00)."
                )

        # 4. Validate timezone
        try:
            ZoneInfo(tz_name)
        except Exception:
            return ScheduleValidationResult(
                is_valid=False,
                warning=f"Unrecognized IANA timezone '{tz_name}'."
            )

        # 5. Validate dates
        try:
            start_d = date.fromisoformat(start_date_str)
            if end_date_str:
                end_d = date.fromisoformat(end_date_str)
                if end_d < start_d:
                    return ScheduleValidationResult(
                        is_valid=False,
                        warning="Schedule end date cannot precede start date."
                    )
        except ValueError as ve:
            return ScheduleValidationResult(
                is_valid=False,
                warning=f"Invalid date format: {ve}. Use YYYY-MM-DD."
            )

        return ScheduleValidationResult(
            is_valid=True,
            is_ambiguous=False,
            proposed_times=scheduled_times
        )

    def calculate_next_dose(
        self,
        scheduled_times: List[str],
        start_date_str: str,
        end_date_str: Optional[str] = None,
        tz_name: str = "UTC",
        now_dt: Optional[datetime] = None
    ) -> Optional[datetime]:
        """
        Calculates the next upcoming scheduled dose in UTC.
        """
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = timezone.utc

        now_local = datetime.now(tz) if now_dt is None else now_dt.astimezone(tz)
        today = now_local.date()

        try:
            start_d = date.fromisoformat(start_date_str)
            end_d = date.fromisoformat(end_date_str) if end_date_str else None
        except Exception:
            return None

        # Sort daily times in chronological order
        parsed_times: List[time] = []
        for t_str in scheduled_times:
            try:
                parts = t_str.split(":")
                parsed_times.append(time(int(parts[0]), int(parts[1])))
            except Exception:
                continue
        parsed_times.sort()

        if not parsed_times:
            return None

        # Look over next 30 days
        for day_offset in range(30):
            current_day = today + timedelta(days=day_offset)
            if current_day < start_d:
                continue
            if end_d and current_day > end_d:
                return None

            for dose_t in parsed_times:
                candidate_dt = datetime.combine(current_day, dose_t, tzinfo=tz)
                if candidate_dt > now_local:
                    return candidate_dt.astimezone(timezone.utc)

        return None

    def generate_dose_instances(
        self,
        schedule_id: str,
        scheduled_times: List[str],
        start_date_str: str,
        end_date_str: Optional[str],
        window_start: date,
        window_end: date,
        tz_name: str = "UTC"
    ) -> List[Tuple[datetime, str, str]]:
        """
        Generates scheduled dose instances (UTC datetime, local date string, local time display)
        for a given query date window.
        """
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = timezone.utc

        try:
            start_d = date.fromisoformat(start_date_str)
            end_d = date.fromisoformat(end_date_str) if end_date_str else None
        except Exception:
            return []

        parsed_times = []
        for t_str in scheduled_times:
            try:
                h, m = t_str.split(":")
                parsed_times.append(time(int(h), int(m)))
            except Exception:
                continue
        parsed_times.sort()

        instances: List[Tuple[datetime, str, str]] = []
        curr = window_start
        while curr <= window_end:
            if curr >= start_d and (not end_d or curr <= end_d):
                for t in parsed_times:
                    local_dt = datetime.combine(curr, t, tzinfo=tz)
                    utc_dt = local_dt.astimezone(timezone.utc)
                    display_time = local_dt.strftime("%I:%M %p")
                    instances.append((utc_dt, curr.isoformat(), display_time))
            curr += timedelta(days=1)

        return instances

scheduler = DeterministicScheduler()
