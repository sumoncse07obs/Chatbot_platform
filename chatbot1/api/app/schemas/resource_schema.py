from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ResourceCreateRequest(BaseModel):
    title: str
    resource_type: str = "text"
    content: Optional[str] = None
    is_active: bool = True


class ResourceUrlCreateRequest(BaseModel):
    title: str
    url: str
    resource_type: str = "website"
    is_active: bool = True


class ResourceUpdateRequest(BaseModel):
    title: Optional[str] = None
    resource_type: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None
    is_indexed: Optional[bool] = None


class ResourceResponse(BaseModel):
    id: int
    title: str
    resource_type: str
    content: Optional[str] = None
    filename: Optional[str] = None
    original_name: Optional[str] = None
    mime_type: Optional[str] = None
    size: Optional[int] = None
    url: Optional[str] = None
    is_active: bool
    is_indexed: bool
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResourceIndexResponse(BaseModel):
    message: str
    resource_id: int
    chunks: int
    embedding_model: str


class ResourceSearchRequest(BaseModel):
    query: str
    limit: int = 5


class ResourceSearchResult(BaseModel):
    chunk_id: int
    resource_id: int
    resource_title: str
    resource_type: str
    content: str
    score: float


class ResourceDeindexResponse(BaseModel):
    message: str
    resource_id: int