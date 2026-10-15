import uuid
import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import HTTPException, status
from app.schemas.ai import (
    ConversationItem,
    ConversationDetailResponse,
    AssistantMessageItem,
    CitationItem
)

class ConversationStore:
    """
    Thread-safe conversation and message persistence store.
    Guarantees:
    - Strict multi-tenant isolation by user_id
    - Safe retry and message retraction without duplicate artifacts
    - Preservation of safety flags (is_emergency, is_mock, citations)
    """

    def __init__(self):
        self._lock = threading.RLock()
        self._conversations: Dict[str, ConversationItem] = {}
        self._messages: Dict[str, List[AssistantMessageItem]] = {}
        self._seed_reference_data()

    def _seed_reference_data(self):
        demo_user_id = "00000000-0000-0000-0000-000000000001"
        now_iso = datetime.now(timezone.utc).isoformat()
        conv_id = "conv-demo-welcome"

        self._conversations[conv_id] = ConversationItem(
            id=conv_id,
            user_id=demo_user_id,
            title="Prescription & Medication Guidance",
            created_at=now_iso,
            updated_at=now_iso,
            message_count=2,
            last_message_preview="Metformin is an oral medication that helps manage blood glucose..."
        )

        self._messages[conv_id] = [
            AssistantMessageItem(
                id="msg-seed-1",
                conversation_id=conv_id,
                user_id=demo_user_id,
                role="user",
                content="What is Metformin used for, and should I take it with meals?",
                citations=[],
                is_emergency=False,
                is_mock=True,
                model_used="mock-medical-llm-v1",
                created_at=now_iso
            ),
            AssistantMessageItem(
                id="msg-seed-2",
                conversation_id=conv_id,
                user_id=demo_user_id,
                role="assistant",
                content=(
                    "Metformin is an oral biguanide medicine used to help lower blood glucose levels in type 2 diabetes. "
                    "It works by reducing glucose production by your liver and increasing your body's sensitivity to insulin.\n\n"
                    "**Key Directions:**\n"
                    "• Always take with or immediately after meals to reduce stomach discomfort, nausea, or diarrhea.\n"
                    "• Swallow whole with a full glass of water.\n"
                    "• Never double up your dose if you miss one."
                ),
                citations=[
                    CitationItem(
                        title="Metformin Hydrochloride Monograph — MedlinePlus Drug Information",
                        source="U.S. National Library of Medicine (MedlinePlus / NIH)",
                        url="https://medlineplus.gov/druginfo/meds/a668040.html",
                        retrieval_date=now_iso,
                        snippet="Metformin is used with a diet and exercise program to control high blood sugar in patients with type 2 diabetes."
                    )
                ],
                is_emergency=False,
                is_mock=True,
                model_used="mock-medical-llm-v1",
                created_at=now_iso
            )
        ]

    def list_conversations(self, user_id: str) -> List[ConversationItem]:
        with self._lock:
            user_convs = [
                conv for conv in self._conversations.values()
                if conv.user_id == user_id
            ]
            # Sort newest updated first
            user_convs.sort(key=lambda c: c.updated_at, reverse=True)
            return user_convs

    def create_conversation(
        self,
        user_id: str,
        title: Optional[str] = None
    ) -> ConversationItem:
        with self._lock:
            conv_id = f"conv-{uuid.uuid4().hex[:12]}"
            now_iso = datetime.now(timezone.utc).isoformat()
            default_title = (title.strip() if title and title.strip() else "New Healthcare Conversation")

            conv = ConversationItem(
                id=conv_id,
                user_id=user_id,
                title=default_title,
                created_at=now_iso,
                updated_at=now_iso,
                message_count=0,
                last_message_preview=None
            )
            self._conversations[conv_id] = conv
            self._messages[conv_id] = []
            return conv

    def get_conversation(
        self,
        user_id: str,
        conversation_id: str
    ) -> ConversationDetailResponse:
        with self._lock:
            conv = self._conversations.get(conversation_id)
            if not conv or conv.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied."
                )
            msgs = self._messages.get(conversation_id, [])
            return ConversationDetailResponse(
                conversation=conv,
                messages=list(msgs)
            )

    def rename_conversation(
        self,
        user_id: str,
        conversation_id: str,
        new_title: str
    ) -> ConversationItem:
        with self._lock:
            conv = self._conversations.get(conversation_id)
            if not conv or conv.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied."
                )
            
            clean_title = (new_title or "").strip()
            if not clean_title:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Conversation title cannot be empty."
                )
            
            conv.title = clean_title[:120]
            conv.updated_at = datetime.now(timezone.utc).isoformat()
            return conv

    def delete_conversation(
        self,
        user_id: str,
        conversation_id: str
    ) -> bool:
        with self._lock:
            conv = self._conversations.get(conversation_id)
            if not conv or conv.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied."
                )
            
            self._conversations.pop(conversation_id, None)
            self._messages.pop(conversation_id, None)
            return True

    def clear_conversation_messages(
        self,
        user_id: str,
        conversation_id: str
    ) -> bool:
        with self._lock:
            conv = self._conversations.get(conversation_id)
            if not conv or conv.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied."
                )
            
            self._messages[conversation_id] = []
            conv.message_count = 0
            conv.last_message_preview = None
            conv.updated_at = datetime.now(timezone.utc).isoformat()
            return True

    def add_message(
        self,
        user_id: str,
        conversation_id: str,
        role: str,
        content: str,
        citations: Optional[List[CitationItem]] = None,
        is_emergency: bool = False,
        is_mock: bool = False,
        model_used: Optional[str] = None
    ) -> AssistantMessageItem:
        with self._lock:
            conv = self._conversations.get(conversation_id)
            if not conv or conv.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied."
                )
            
            msg_id = f"msg-{uuid.uuid4().hex[:12]}"
            now_iso = datetime.now(timezone.utc).isoformat()

            msg = AssistantMessageItem(
                id=msg_id,
                conversation_id=conversation_id,
                user_id=user_id,
                role=role,
                content=content,
                citations=citations or [],
                is_emergency=is_emergency,
                is_mock=is_mock,
                model_used=model_used,
                created_at=now_iso
            )

            if conversation_id not in self._messages:
                self._messages[conversation_id] = []
            self._messages[conversation_id].append(msg)

            # Update conversation metadata
            conv.message_count = len(self._messages[conversation_id])
            preview = content.replace("\n", " ")[:90]
            if len(content) > 90:
                preview += "..."
            conv.last_message_preview = preview
            conv.updated_at = now_iso

            # Auto-title conversation if it's the first user message and has default title
            if role == "user" and (conv.title.startswith("New Healthcare Conversation") or conv.message_count <= 2):
                words = content.strip().split()
                if words:
                    auto_title = " ".join(words[:6])
                    if len(auto_title) > 40:
                        auto_title = auto_title[:40] + "..."
                    conv.title = auto_title

            return msg

    def get_last_user_message(
        self,
        user_id: str,
        conversation_id: str
    ) -> Optional[AssistantMessageItem]:
        with self._lock:
            conv = self._conversations.get(conversation_id)
            if not conv or conv.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied."
                )
            msgs = self._messages.get(conversation_id, [])
            for m in reversed(msgs):
                if m.role == "user":
                    return m
            return None

    def pop_trailing_assistant_message(
        self,
        user_id: str,
        conversation_id: str
    ) -> Optional[AssistantMessageItem]:
        """
        Removes the last message if it was an assistant message.
        Used for retrying the last turn without creating duplicate entries.
        """
        with self._lock:
            conv = self._conversations.get(conversation_id)
            if not conv or conv.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied."
                )
            msgs = self._messages.get(conversation_id, [])
            if msgs and msgs[-1].role == "assistant":
                removed = msgs.pop()
                conv.message_count = len(msgs)
                conv.updated_at = datetime.now(timezone.utc).isoformat()
                if msgs:
                    preview = msgs[-1].content.replace("\n", " ")[:90]
                    conv.last_message_preview = preview
                else:
                    conv.last_message_preview = None
                return removed
            return None

conversation_store = ConversationStore()
