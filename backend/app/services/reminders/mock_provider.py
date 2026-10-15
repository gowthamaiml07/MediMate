import logging
from app.services.reminders.base import BaseReminderProvider, ReminderDispatchResult

logger = logging.getLogger("medimate.reminders.mock")

class MockReminderProvider(BaseReminderProvider):
    """
    Mock Reminder Provider for local development.
    Explicitly indicates that real external delivery is not configured, avoiding false claims.
    """
    def __init__(self, provider_name: str = "mock-notifications"):
        self.provider_name = provider_name

    async def send_reminder(
        self,
        user_id: str,
        recipient: str,
        medication_name: str,
        strength: str,
        scheduled_time_display: str,
        timing_relation: str,
        channel: str = "push"
    ) -> ReminderDispatchResult:
        message = (
            f"MediMate Reminder: Time to take your {medication_name} ({strength}) "
            f"scheduled for {scheduled_time_display} ({timing_relation})."
        )
        logger.info(f"[MOCK REMINDER] User {user_id} ({recipient}) via {channel}: {message}")

        return ReminderDispatchResult(
            success=True,
            channel=channel,
            recipient=recipient,
            message=message,
            provider_name=self.provider_name,
            is_mock=True,
            metadata={
                "delivery_mode": "mock",
                "notes": "External SMS/Push credentials are not configured. Simulated for local development."
            }
        )
