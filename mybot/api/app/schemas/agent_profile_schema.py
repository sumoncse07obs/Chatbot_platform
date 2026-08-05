from datetime import datetime

from pydantic import BaseModel, Field


class AgentProfileResponse(BaseModel):
    id: int
    api_key_id: int
    business_summary: str | None = None

    supported_topics: list[str] = Field(default_factory=list)
    services: list[str] = Field(default_factory=list)
    suggested_questions: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)

    handoff_message: str | None = None
    is_ready: bool
    last_generated_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentProfileGenerateRequest(BaseModel):
    api_key_id: int = Field(gt=0)
    force: bool = False