import hashlib
import hmac
import secrets

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key_model import ApiKey
from app.models.user_model import User
from app.schemas.api_key_schema import ApiKeyCreateRequest, ApiKeyUpdateRequest
from app.services.secret_crypto import decrypt_secret, encrypt_secret
from app.settings.dbdriver import settings


def generate_api_key() -> str:
    return f"ck_live_{secrets.token_urlsafe(32)}"


def hash_api_key(key: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        key.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def preview_api_key(key: str) -> str:
    return f"{key[:7]}********{key[-4:]}"


def serialize_api_key(api_key: ApiKey, key_value: str | None = None):
    return {
        "id": api_key.id,
        "name": api_key.name,
        "display_name": api_key.display_name,
        "welcome_message": api_key.welcome_message,
        "temperature": api_key.temperature,
        "key_preview": api_key.key_preview,
        "key_value": key_value,
        "avatar_url": api_key.avatar_url,
        "system_prompt": api_key.system_prompt,
        "is_active": api_key.is_active,
        "created_by_id": api_key.created_by_id,
        "created_at": api_key.created_at,
        "updated_at": api_key.updated_at,
    }


async def list_api_keys(db: AsyncSession, current_user: User):
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.created_by_id == current_user.id)
        .order_by(ApiKey.id.desc())
    )

    return [serialize_api_key(item) for item in result.scalars().all()]


async def get_api_key(api_key_id: int, db: AsyncSession, current_user: User):
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == api_key_id,
            ApiKey.created_by_id == current_user.id,
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    return api_key


async def create_api_key(data: ApiKeyCreateRequest, db: AsyncSession, current_user: User):
    raw_key = generate_api_key()

    api_key = ApiKey(
        name=data.name,
        display_name=data.display_name,
        welcome_message=data.welcome_message,
        temperature=data.temperature,
        key_hash=hash_api_key(raw_key),
        key_preview=preview_api_key(raw_key),
        key_ciphertext=encrypt_secret(raw_key),
        avatar_url=data.avatar_url,
        system_prompt=data.system_prompt,
        is_active=data.is_active,
        created_by_id=current_user.id,
    )

    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return serialize_api_key(api_key, raw_key)


async def update_api_key(
    api_key_id: int,
    data: ApiKeyUpdateRequest,
    db: AsyncSession,
    current_user: User,
):
    api_key = await get_api_key(api_key_id, db, current_user)
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(api_key, field, value)

    await db.commit()
    await db.refresh(api_key)

    return serialize_api_key(api_key)


async def delete_api_key(api_key_id: int, db: AsyncSession, current_user: User):
    api_key = await get_api_key(api_key_id, db, current_user)

    await db.delete(api_key)
    await db.commit()

    return {"message": "API key deleted successfully"}


async def reveal_api_key(api_key_id: int, db: AsyncSession, current_user: User):
    api_key = await get_api_key(api_key_id, db, current_user)

    if not api_key.is_active:
        raise HTTPException(status_code=400, detail="API key is inactive")

    if not api_key.key_ciphertext:
        raise HTTPException(
            status_code=422,
            detail="This key cannot be revealed. Rotate it to generate a new key.",
        )

    try:
        return {"key": decrypt_secret(api_key.key_ciphertext)}
    except ValueError:
        raise HTTPException(status_code=422, detail="Stored API key could not be decrypted")


async def rotate_api_key(api_key_id: int, db: AsyncSession, current_user: User):
    api_key = await get_api_key(api_key_id, db, current_user)
    raw_key = generate_api_key()

    api_key.key_hash = hash_api_key(raw_key)
    api_key.key_preview = preview_api_key(raw_key)
    api_key.key_ciphertext = encrypt_secret(raw_key)

    await db.commit()
    await db.refresh(api_key)

    return serialize_api_key(api_key, raw_key)