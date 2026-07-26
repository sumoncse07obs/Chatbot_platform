from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_model import User
from app.schemas.auth_schema import (
    AdminUserCreateRequest,
    AdminUserUpdateRequest,
    AdminChangePasswordRequest,
    AdminChangeRoleRequest,
)

from app.services.auth_service import hash_password


ALLOWED_ROLES = ["admin", "customer", "user"]

async def create_user(data: AdminUserCreateRequest, db: AsyncSession):
    if data.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Allowed roles: admin, customer, user",
        )

    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        password=hash_password(data.password),
        role=data.role,
        is_active=data.is_active,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


async def list_users(db: AsyncSession):
    result = await db.execute(select(User).order_by(User.id.desc()))
    return result.scalars().all()


async def get_user(user_id: int, db: AsyncSession):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


async def update_user(user_id: int, data: AdminUserUpdateRequest, db: AsyncSession):
    user = await get_user(user_id, db)

    update_data = data.model_dump(exclude_unset=True)

    if "openai_api_key" in update_data:
        from app.services.secret_crypto import encrypt_secret

        api_key = update_data.pop("openai_api_key")
        user.openai_api_key = encrypt_secret(api_key) if api_key else None

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return user

async def delete_user(user_id: int, db: AsyncSession):
    user = await get_user(user_id, db)

    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Admin user cannot be deleted")

    await db.delete(user)
    await db.commit()

    return {"message": "User deleted successfully"}


async def change_user_password(
    user_id: int,
    data: AdminChangePasswordRequest,
    db: AsyncSession,
):
    user = await get_user(user_id, db)

    user.password = hash_password(data.new_password)

    await db.commit()

    return {"message": "Password changed successfully"}


async def change_user_role(
    user_id: int,
    data: AdminChangeRoleRequest,
    db: AsyncSession,
):
    user = await get_user(user_id, db)

    if data.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Allowed roles: admin, customer, user",
        )

    user.role = data.role

    await db.commit()
    await db.refresh(user)

    return user
