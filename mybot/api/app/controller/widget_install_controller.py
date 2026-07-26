from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key_model import ApiKey
from app.models.user_model import User
from app.models.widget_install_model import WidgetInstall
from app.schemas.widget_install_schema import WidgetInstallCreateRequest, WidgetInstallUpdateRequest


VALID_EMBED_TYPES = {"iframe", "loader"}
VALID_POSITIONS = {"bottom-right", "bottom-left", "top-right", "top-left"}


async def ensure_owned_api_key(api_key_id: int, db: AsyncSession, current_user: User) -> ApiKey:
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


async def list_widget_installs(db: AsyncSession, current_user: User):
    result = await db.execute(
        select(WidgetInstall)
        .where(WidgetInstall.created_by_id == current_user.id)
        .order_by(WidgetInstall.id.desc())
    )

    return result.scalars().all()


async def get_widget_install(widget_id: int, db: AsyncSession, current_user: User):
    result = await db.execute(
        select(WidgetInstall).where(
            WidgetInstall.id == widget_id,
            WidgetInstall.created_by_id == current_user.id,
        )
    )
    widget = result.scalar_one_or_none()

    if not widget:
        raise HTTPException(status_code=404, detail="Widget install not found")

    return widget


def validate_widget_values(embed_type: str | None, position: str | None):
    if embed_type is not None and embed_type not in VALID_EMBED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid embed type")

    if position is not None and position not in VALID_POSITIONS:
        raise HTTPException(status_code=400, detail="Invalid widget position")


async def create_widget_install(
    data: WidgetInstallCreateRequest,
    db: AsyncSession,
    current_user: User,
):
    validate_widget_values(data.embed_type, data.position)
    await ensure_owned_api_key(data.api_key_id, db, current_user)

    widget = WidgetInstall(
        name=data.name,
        api_key_id=data.api_key_id,
        created_by_id=current_user.id,
        external_user_id=data.external_user_id,
        embed_type=data.embed_type,
        position=data.position,
        width=data.width,
        height=data.height,
        button_text_open=data.button_text_open,
        button_text_close=data.button_text_close,
        z_index=data.z_index,
        is_active=data.is_active,
    )

    db.add(widget)
    await db.commit()
    await db.refresh(widget)

    return widget


async def update_widget_install(
    widget_id: int,
    data: WidgetInstallUpdateRequest,
    db: AsyncSession,
    current_user: User,
):
    widget = await get_widget_install(widget_id, db, current_user)
    update_data = data.model_dump(exclude_unset=True)

    validate_widget_values(update_data.get("embed_type"), update_data.get("position"))

    if "api_key_id" in update_data and update_data["api_key_id"] is not None:
        await ensure_owned_api_key(update_data["api_key_id"], db, current_user)

    for field, value in update_data.items():
        setattr(widget, field, value)

    await db.commit()
    await db.refresh(widget)

    return widget


async def delete_widget_install(widget_id: int, db: AsyncSession, current_user: User):
    widget = await get_widget_install(widget_id, db, current_user)

    await db.delete(widget)
    await db.commit()

    return {"message": "Widget install deleted successfully"}