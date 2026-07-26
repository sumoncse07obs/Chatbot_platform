from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class ChatVisitorPatch(BaseModel):
    name: Optional[str] = Field(default=None, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=80)
    notes: Optional[str] = Field(default=None, max_length=2000)


class ChatVisitorResponse(BaseModel):
    id: int
    external_user_id: str
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class ChatRequest(BaseModel):
    api_key: str
    message: str = Field(min_length=1)
    external_user_id: Optional[str] = Field(default=None, max_length=150)
    conversation_id: Optional[str] = None
    visitor: Optional[ChatVisitorPatch] = None
    limit: int = Field(default=6, ge=1, le=12)


class ChatResourceMatch(BaseModel):
    resource_id: int
    resource_title: str
    resource_type: str
    content: str
    score: float


class ChatResponse(BaseModel):
    answer: str
    api_key_id: int
    conversation_id: int
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    welcome_message: Optional[str] = None
    visitor: Optional[ChatVisitorResponse] = None
    used_resources: list[ChatResourceMatch] = Field(default_factory=list)