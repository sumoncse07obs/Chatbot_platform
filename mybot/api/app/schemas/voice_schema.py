from pydantic import BaseModel, Field


class VoiceSpeechRequest(BaseModel):
    api_key: str
    text: str = Field(min_length=1, max_length=6000)
    voice: str = "marin"
    instructions: str | None = "Speak clearly in a warm, helpful customer support tone."