import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.controller.chat_controller import resolve_api_key_owner, resolve_chat_api_key, resolve_openai_key
from app.database.db import get_db
from app.schemas.voice_schema import VoiceSpeechRequest

router = APIRouter(
    prefix="/voice",
    tags=["Voice"],
)

ALLOWED_TTS_VOICES = {
    "alloy",
    "ash",
    "ballad",
    "coral",
    "echo",
    "fable",
    "nova",
    "onyx",
    "sage",
    "shimmer",
    "verse",
    "marin",
    "cedar",
}


@router.post("/transcribe")
async def transcribe_voice(
    api_key: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    chat_api_key = await resolve_chat_api_key(api_key, db)
    owner = await resolve_api_key_owner(chat_api_key, db)
    openai_key = resolve_openai_key(owner)

    audio_bytes = await file.read()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    suffix = ".webm"
    filename = (file.filename or "").lower()

    if filename.endswith(".wav"):
        suffix = ".wav"
    elif filename.endswith(".mp3"):
        suffix = ".mp3"
    elif filename.endswith(".m4a"):
        suffix = ".m4a"
    elif filename.endswith(".mp4"):
        suffix = ".mp4"

    temp_path = ""

    try:
      with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
          temp_file.write(audio_bytes)
          temp_path = temp_file.name

      client = AsyncOpenAI(api_key=openai_key)

      with open(temp_path, "rb") as audio_file:
          transcription = await client.audio.transcriptions.create(
              model="gpt-4o-mini-transcribe",
              file=audio_file,
          )

      return {"text": transcription.text}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Voice transcription failed: {exc}")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/speech")
async def create_speech(
    data: VoiceSpeechRequest,
    db: AsyncSession = Depends(get_db),
):
    chat_api_key = await resolve_chat_api_key(data.api_key, db)
    owner = await resolve_api_key_owner(chat_api_key, db)
    openai_key = resolve_openai_key(owner)

    voice = data.voice if data.voice in ALLOWED_TTS_VOICES else "marin"

    try:
        client = AsyncOpenAI(api_key=openai_key)

        audio = await client.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice=voice,
            input=data.text,
            instructions=data.instructions,
            response_format="mp3",
        )

        return Response(content=audio.content, media_type="audio/mpeg")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Speech generation failed: {exc}")