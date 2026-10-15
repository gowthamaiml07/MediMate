from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CitationItem(BaseModel):
    title: str = Field(..., description="Title of the authoritative medical document or monograph")
    source: str = Field(..., description="Source agency or organization (e.g. FDA, MedlinePlus, NHS, WHO)")
    url: Optional[str] = Field(None, description="Direct URL to authoritative reference")
    retrieval_date: str = Field(..., description="Timestamp of retrieval")
    snippet: str = Field(..., description="Verbatim authoritative passage or summary excerpt")

class AssistantMessageItem(BaseModel):
    id: str
    conversation_id: str
    user_id: str
    role: str = Field(..., description="'user' | 'assistant' | 'system'")
    content: str
    citations: List[CitationItem] = Field(default_factory=list)
    is_emergency: bool = False
    is_mock: bool = False
    model_used: Optional[str] = None
    created_at: str

class ConversationItem(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0
    last_message_preview: Optional[str] = None

class ConversationDetailResponse(BaseModel):
    conversation: ConversationItem
    messages: List[AssistantMessageItem]

class ConversationCreateRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=120)
    initial_message: Optional[str] = Field(None, max_length=4000)

class ConversationRenameRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)

class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    stream: bool = False

class AssistantChatResponse(BaseModel):
    conversation_id: str
    user_message: AssistantMessageItem
    assistant_message: AssistantMessageItem
    disclaimer: str = (
        "Note: MediMate AI provides health education and organizational support only. "
        "It does not provide diagnosis, treatment recommendations, or dose modifications. "
        "Always follow your prescribing doctor's instructions."
    )

class SuggestedPromptItem(BaseModel):
    id: str
    category: str
    prompt: str
    description: str

class SuggestedPromptsResponse(BaseModel):
    prompts: List[SuggestedPromptItem]

# Legacy backward compatibility schemas for existing /ai/chat endpoints
class ChatMessage(BaseModel):
    role: str
    content: str
    sources: Optional[List[str]] = None
    created_at: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    reply: str
    sources: List[str] = []
    disclaimer: str = (
        "Note: This is general information. Your prescription and dosage may be different. "
        "Always follow your doctor's instructions."
    )
