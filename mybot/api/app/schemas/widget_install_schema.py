from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class WidgetInstallCreateRequest(BaseModel):
    name: str
    api_key_id: int
    external_user_id: Optional[str] = None
    embed_type: str = "iframe"
    position: str = "bottom-right"
    width: int = Field(default=380, ge=240, le=1200)
    height: int = Field(default=620, ge=240, le=1400)
    button_text_open: str = "Chat"
    button_text_close: str = "Close"
    z_index: int = Field(default=999999, ge=1)
    is_active: bool = True


class WidgetInstallUpdateRequest(BaseModel):
    name: Optional[str] = None
    api_key_id: Optional[int] = None
    external_user_id: Optional[str] = None
    embed_type: Optional[str] = None
    position: Optional[str] = None
    width: Optional[int] = Field(default=None, ge=240, le=1200)
    height: Optional[int] = Field(default=None, ge=240, le=1400)
    button_text_open: Optional[str] = None
    button_text_close: Optional[str] = None
    z_index: Optional[int] = Field(default=None, ge=1)
    is_active: Optional[bool] = None


class WidgetInstallResponse(BaseModel):
    id: int
    name: str
    api_key_id: int
    created_by_id: Optional[int] = None
    external_user_id: Optional[str] = None
    embed_type: str
    position: str
    width: int
    height: int
    button_text_open: str
    button_text_close: str
    z_index: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}