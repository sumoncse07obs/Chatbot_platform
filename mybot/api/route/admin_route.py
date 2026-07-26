from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db import get_db
from app.services.auth_guard import require_admin
from app.schemas.auth_schema import (
    AdminUserListResponse,
    AdminUserCreateRequest,
    AdminUserUpdateRequest,
    AdminChangePasswordRequest,
    AdminChangeRoleRequest,
)
from app.controller.admin_user_controller import (
    create_user,
    list_users,
    get_user,
    update_user,
    delete_user,
    change_user_password,
    change_user_role,
)


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin)],
)


@router.get("/users", response_model=List[AdminUserListResponse])
async def admin_list_users(db: AsyncSession = Depends(get_db)):
    return await list_users(db)


@router.post("/users", response_model=AdminUserListResponse)
async def admin_create_user(
    data: AdminUserCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    return await create_user(data, db)


@router.get("/users/{user_id}", response_model=AdminUserListResponse)
async def admin_get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    return await get_user(user_id, db)


@router.put("/users/{user_id}", response_model=AdminUserListResponse)
async def admin_update_user(
    user_id: int,
    data: AdminUserUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    return await update_user(user_id, data, db)


@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    return await delete_user(user_id, db)


@router.patch("/users/{user_id}/password")
async def admin_change_password(
    user_id: int,
    data: AdminChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    return await change_user_password(user_id, data, db)


@router.patch("/users/{user_id}/role", response_model=AdminUserListResponse)
async def admin_change_role(
    user_id: int,
    data: AdminChangeRoleRequest,
    db: AsyncSession = Depends(get_db),
):
    return await change_user_role(user_id, data, db)
