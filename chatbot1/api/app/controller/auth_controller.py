from fastapi import HTTPException
from openai import AsyncOpenAI, AuthenticationError, OpenAIError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user_model import User
from app.models.user_meta_model import UserMeta
from app.schemas.auth_schema import (
    RegisterRequest,
    LoginRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
)
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
)
from app.services.secret_crypto import encrypt_secret, mask_secret
from app.settings.dbdriver import settings


def serialize_user(user: User):
    meta = user.meta

    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "avatar": meta.avatar if meta else None,
        "country": meta.country if meta else None,
        "city": meta.city if meta else None,
        "state": meta.state if meta else None,
        "zip": meta.zip if meta else None,
        "address": meta.address if meta else None,
        "company_name": meta.company_name if meta else None,
        "website": meta.website if meta else None,
        "bio": meta.bio if meta else None,
        "system_prompt": user.system_prompt,
        "openai_api_key": mask_secret(user.openai_api_key),
    }


async def validate_openai_api_key(api_key: str) -> None:
    try:
        client = AsyncOpenAI(api_key=api_key)
        await client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input="connection test",
        )
    except AuthenticationError:
        raise HTTPException(status_code=422, detail="Invalid OpenAI API key")
    except OpenAIError as exc:
        raise HTTPException(status_code=422, detail=f"OpenAI key validation failed: {exc}")


async def register_user(data: RegisterRequest, db: AsyncSession):
    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        password=hash_password(data.password),
        phone=data.phone,
        role="user",
        is_active=True,
    )

    db.add(user)
    await db.commit()

    result = await db.execute(
        select(User)
        .options(selectinload(User.meta))
        .where(User.email == data.email)
    )
    user = result.scalar_one()

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


async def login_user(data: LoginRequest, db: AsyncSession):
    result = await db.execute(
        select(User)
        .options(selectinload(User.meta))
        .where(User.email == data.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


async def update_profile(
    data: UpdateProfileRequest,
    current_user: User,
    db: AsyncSession,
):
    user_fields = ["first_name", "last_name", "phone", "system_prompt"]
    meta_fields = [
        "avatar",
        "country",
        "city",
        "state",
        "zip",
        "address",
        "company_name",
        "website",
        "bio",
    ]

    update_data = data.model_dump(exclude_unset=True)

    for field in user_fields:
        if field in update_data:
            setattr(current_user, field, update_data[field])

    if "openai_api_key" in update_data:
        api_key = update_data["openai_api_key"]

        if api_key == "configured":
            pass
        elif api_key:
            cleaned_api_key = api_key.strip()
            await validate_openai_api_key(cleaned_api_key)
            current_user.openai_api_key = encrypt_secret(cleaned_api_key)
        else:
            current_user.openai_api_key = None

    if any(field in update_data for field in meta_fields):
        if current_user.meta is None:
            current_user.meta = UserMeta(user_id=current_user.id)

        for field in meta_fields:
            if field in update_data:
                setattr(current_user.meta, field, update_data[field])

    await db.commit()

    result = await db.execute(
        select(User)
        .options(selectinload(User.meta))
        .where(User.id == current_user.id)
    )
    updated_user = result.scalar_one()

    return serialize_user(updated_user)


async def change_password(
    data: ChangePasswordRequest,
    current_user: User,
    db: AsyncSession,
):
    current_user.password = hash_password(data.new_password)

    await db.commit()

    return {"message": "Password changed successfully"}