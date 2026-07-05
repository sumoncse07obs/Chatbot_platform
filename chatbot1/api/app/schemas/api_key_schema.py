from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ApiKeyCreateRequest(BaseModel):
    name: str
    display_name: str
    welcome_message: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0, le=2)
    avatar_url: Optional[str] = None
    system_prompt: Optional[str] = None
    is_active: bool = True


class ApiKeyUpdateRequest(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    welcome_message: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0, le=2)
    avatar_url: Optional[str] = None
    system_prompt: Optional[str] = None
    is_active: Optional[bool] = None


class ApiKeyResponse(BaseModel):
    id: int
    name: str
    display_name: str
    welcome_message: Optional[str] = None
    temperature: float
    key_preview: str
    key_value: Optional[str] = None
    avatar_url: Optional[str] = None
    system_prompt: Optional[str] = None
    is_active: bool
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}