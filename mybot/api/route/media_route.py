from typing import List

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db import get_db
from app.models.user_model import User
from app.schemas.media_schema import MediaResponse
from app.services.auth_guard import get_current_user
from app.controller.media_controller import (
    list_media,
    upload_media,
    delete_media,
)


router = APIRouter(
    prefix="/media",
    tags=["Media"],
)


@router.get("", response_model=List[MediaResponse])
async def media_index(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await list_media(db, current_user)


@router.post("/upload", response_model=MediaResponse)
async def media_upload(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await upload_media(file, db, current_user)


@router.delete("/{media_id}")
async def media_delete(
    media_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await delete_media(media_id, db, current_user)
