from typing import List, Optional
from pydantic import BaseModel

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str
    sources: Optional[List[str]] = None
    created_at: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context: Optional[dict] = None

class ChatResponse(BaseModel):
    reply: str
    sources: List[str] = []
    disclaimer: str = "Note: This is general information. Your prescription and dosage may be different. Always follow your doctor's instructions."
