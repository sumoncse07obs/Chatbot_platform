from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.controller.api_key_controller import (
    create_api_key,
    delete_api_key,
    get_api_key,
    list_api_keys,
    reveal_api_key,
    rotate_api_key,
    serialize_api_key,
    update_api_key,
)
from app.database.db import get_db
from app.models.user_model import User
from app.schemas.api_key_schema import ApiKeyCreateRequest, ApiKeyResponse, ApiKeyUpdateRequest
from app.services.auth_guard import get_current_user

router = APIRouter(
    prefix="/api-keys",
    tags=["API Keys"],
)


@router.get("", response_model=List[ApiKeyResponse])
async def api_key_index(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await list_api_keys(db, current_user)


@router.post("", response_model=ApiKeyResponse)
async def api_key_create(
    data: ApiKeyCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await create_api_key(data, db, current_user)


@router.get("/{api_key_id}", response_model=ApiKeyResponse)
async def api_key_show(
    api_key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    api_key = await get_api_key(api_key_id, db, current_user)
    return serialize_api_key(api_key)


@router.put("/{api_key_id}", response_model=ApiKeyResponse)
@router.patch("/{api_key_id}", response_model=ApiKeyResponse)
async def api_key_update(
    api_key_id: int,
    data: ApiKeyUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await update_api_key(api_key_id, data, db, current_user)


@router.delete("/{api_key_id}")
async def api_key_delete(
    api_key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await delete_api_key(api_key_id, db, current_user)


@router.post("/{api_key_id}/reveal")
async def api_key_reveal(
    api_key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await reveal_api_key(api_key_id, db, current_user)


@router.post("/{api_key_id}/rotate", response_model=ApiKeyResponse)
async def api_key_rotate(
    api_key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await rotate_api_key(api_key_id, db, current_user)