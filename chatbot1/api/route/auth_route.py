from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db import get_db
from app.models.user_model import User

from app.schemas.auth_schema import (
    RegisterRequest,
    LoginRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
    AuthResponse,
    UserResponse,
)

from app.controller.auth_controller import (
    register_user,
    login_user,
    change_password,
    update_profile,
    serialize_user,
)

from app.services.auth_guard import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post("/register", response_model=AuthResponse)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    return await register_user(data, db)


@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    return await login_user(data, db)


@router.get("/me", response_model=UserResponse)
async def me(
    current_user: User = Depends(get_current_user),
):
    return serialize_user(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await update_profile(
        data=data,
        current_user=current_user,
        db=db,
    )


@router.put("/me/password")
@router.patch("/me/password")
async def update_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await change_password(
        data=data,
        current_user=current_user,
        db=db,
    )
