from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class ChatHistoryVisitorResponse(BaseModel):
    id: int
    external_user_id: str
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class ChatHistoryMessageResponse(BaseModel):
    id: int
    conversation_id: int
    api_key_id: int
    created_by_id: Optional[int] = None
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryConversationResponse(BaseModel):
    id: int
    api_key_id: int
    created_by_id: Optional[int] = None
    visitor_id: Optional[int] = None
    external_user_id: Optional[str] = None
    title: Optional[str] = None
    last_message_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message: Optional[str] = None
    api_key_name: Optional[str] = None
    display_name: Optional[str] = None
    visitor: Optional[ChatHistoryVisitorResponse] = None

    model_config = {"from_attributes": True}


class ChatHistoryConversationDetailResponse(ChatHistoryConversationResponse):
    messages: list[ChatHistoryMessageResponse] = []


class ChatHistoryListResponse(BaseModel):
    data: list[ChatHistoryConversationResponse]
    total: int
    page: int
    per_page: int
    last_page: int