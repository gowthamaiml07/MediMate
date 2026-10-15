import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.schemas.ai import (
    ConversationItem,
    ConversationDetailResponse,
    ConversationCreateRequest,
    ConversationRenameRequest,
    AssistantChatRequest,
    AssistantChatResponse,
    SuggestedPromptsResponse,
    ChatRequest,
    ChatResponse
)
from app.core.auth import get_current_user, AuthenticatedUser
from app.services.assistant import (
    conversation_store,
    assistant_service
)

logger = logging.getLogger("medimate.api.assistant")

router = APIRouter()

# ---------------------------------------------------------------------------
# Conversation Management Endpoints
# ---------------------------------------------------------------------------

@router.get("/conversations", response_model=List[ConversationItem])
def list_conversations(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Lists all healthcare assistant conversations owned by the authenticated user.
    """
    return conversation_store.list_conversations(user_id=current_user.id)


@router.post("/conversations", response_model=ConversationItem, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    req: Optional[ConversationCreateRequest] = None,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Creates a new conversation thread for the authenticated user.
    If initial_message is provided, dispatches the first exchange.
    """
    title = req.title if req else None
    conv = conversation_store.create_conversation(user_id=current_user.id, title=title)

    if req and req.initial_message and req.initial_message.strip():
        await assistant_service.process_chat(
            user_id=current_user.id,
            conversation_id=conv.id,
            raw_message=req.initial_message,
            stream=False
        )
        # Fetch updated conversation
        detail = conversation_store.get_conversation(user_id=current_user.id, conversation_id=conv.id)
        return detail.conversation

    return conv


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation_detail(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Retrieves a conversation thread and its complete verified message history.
    Enforces user ownership.
    """
    return conversation_store.get_conversation(
        user_id=current_user.id,
        conversation_id=conversation_id
    )


@router.patch("/conversations/{conversation_id}", response_model=ConversationItem)
def rename_conversation(
    conversation_id: str,
    req: ConversationRenameRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Renames a conversation title. Enforces user ownership.
    """
    return conversation_store.rename_conversation(
        user_id=current_user.id,
        conversation_id=conversation_id,
        new_title=req.title
    )


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Permanently deletes a conversation and all its messages. Enforces user ownership.
    """
    deleted = conversation_store.delete_conversation(
        user_id=current_user.id,
        conversation_id=conversation_id
    )
    return {"success": deleted, "deleted_conversation_id": conversation_id}


@router.delete("/conversations/{conversation_id}/clear")
def clear_conversation(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Clears all messages within a conversation thread while preserving the conversation container.
    """
    cleared = conversation_store.clear_conversation_messages(
        user_id=current_user.id,
        conversation_id=conversation_id
    )
    return {"success": cleared, "conversation_id": conversation_id}


# ---------------------------------------------------------------------------
# Message Dispatch & Streaming Endpoints
# ---------------------------------------------------------------------------

@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    req: AssistantChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Dispatches a user query to the AI healthcare assistant.
    Applies strict clinical safety guardrails, personalized context scoping,
    and returns either JSON or an SSE stream.
    """
    if req.stream:
        stream_gen = await assistant_service.process_chat(
            user_id=current_user.id,
            conversation_id=conversation_id,
            raw_message=req.message,
            stream=True
        )
        return StreamingResponse(
            stream_gen,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    # Non-streaming JSON response
    result = await assistant_service.process_chat(
        user_id=current_user.id,
        conversation_id=conversation_id,
        raw_message=req.message,
        stream=False
    )
    return result


@router.post("/conversations/{conversation_id}/retry")
async def retry_turn(
    conversation_id: str,
    stream: bool = Query(False, description="Whether to stream the retried response"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Retries the last user message in the conversation.
    Safely retracts the trailing assistant message without duplicating the user question.
    """
    if stream:
        stream_gen = await assistant_service.retry_turn(
            user_id=current_user.id,
            conversation_id=conversation_id,
            stream=True
        )
        return StreamingResponse(
            stream_gen,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    return await assistant_service.retry_turn(
        user_id=current_user.id,
        conversation_id=conversation_id,
        stream=False
    )


# ---------------------------------------------------------------------------
# Suggested Prompts Endpoint
# ---------------------------------------------------------------------------

@router.get("/suggested-prompts", response_model=SuggestedPromptsResponse)
def get_suggested_prompts():
    """
    Returns curated clinical prompt starters to assist patients in navigating
    prescriptions, appointments, medication explanations, and doctor visit prep.
    """
    return assistant_service.get_suggested_prompts()


# ---------------------------------------------------------------------------
# Legacy Backward Compatibility Endpoint (/chat)
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def legacy_chat(
    req: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Maintains backward compatibility with earlier demo endpoints.
    Routes through the unified assistant engine.
    """
    conv_id = req.conversation_id
    if not conv_id:
        conv = conversation_store.create_conversation(user_id=current_user.id, title="Quick Health Chat")
        conv_id = conv.id

    result: AssistantChatResponse = await assistant_service.process_chat(
        user_id=current_user.id,
        conversation_id=conv_id,
        raw_message=req.message,
        stream=False
    )

    source_titles = [c.title for c in result.assistant_message.citations]
    if not source_titles:
        source_titles = ["MediMate Patient Health Record", "NHS & FDA Drug Information"]

    return ChatResponse(
        reply=result.assistant_message.content,
        sources=source_titles,
        disclaimer=result.disclaimer
    )
