from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.controller.widget_install_controller import (
    create_widget_install,
    delete_widget_install,
    get_widget_install,
    list_widget_installs,
    update_widget_install,
)
from app.database.db import get_db
from app.models.user_model import User
from app.schemas.widget_install_schema import (
    WidgetInstallCreateRequest,
    WidgetInstallResponse,
    WidgetInstallUpdateRequest,
)
from app.services.auth_guard import get_current_user

router = APIRouter(
    prefix="/widget-installs",
    tags=["Widget Installs"],
)


@router.get("", response_model=List[WidgetInstallResponse])
async def widget_install_index(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await list_widget_installs(db, current_user)


@router.post("", response_model=WidgetInstallResponse)
async def widget_install_create(
    data: WidgetInstallCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await create_widget_install(data, db, current_user)


@router.get("/{widget_id}", response_model=WidgetInstallResponse)
async def widget_install_show(
    widget_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_widget_install(widget_id, db, current_user)


@router.put("/{widget_id}", response_model=WidgetInstallResponse)
@router.patch("/{widget_id}", response_model=WidgetInstallResponse)
async def widget_install_update(
    widget_id: int,
    data: WidgetInstallUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await update_widget_install(widget_id, data, db, current_user)


@router.delete("/{widget_id}")
async def widget_install_delete(
    widget_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await delete_widget_install(widget_id, db, current_user)