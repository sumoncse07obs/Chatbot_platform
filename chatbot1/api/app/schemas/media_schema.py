from datetime import datetime

from pydantic import BaseModel


class MediaResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    mime_type: str
    size: int
    url: str
    uploaded_by_id: int | None = None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
