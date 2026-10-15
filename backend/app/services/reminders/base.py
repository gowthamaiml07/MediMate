from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel

class ReminderDispatchResult(BaseModel):
    success: bool
    channel: str
    recipient: str
    message: str
    provider_name: str
    is_mock: bool = True
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = {}

class BaseReminderProvider(ABC):
    @abstractmethod
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
        """
        Dispatches medication reminder to patient across configured channel.
        """
        pass
