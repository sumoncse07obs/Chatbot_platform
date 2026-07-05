from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.controller.resource_controller import (
    create_text_resource,
    delete_resource,
    get_resource,
    list_resources,
    update_resource,
    upload_resource_file,
)
from app.controller.resource_index_controller import (
    deindex_resource,
    index_resource,
    search_resource_chunks,
)
from app.database.db import get_db
from app.models.user_model import User
from app.schemas.resource_schema import (
    ResourceCreateRequest,
    ResourceDeindexResponse,
    ResourceIndexResponse,
    ResourceResponse,
    ResourceSearchRequest,
    ResourceSearchResult,
    ResourceUpdateRequest,
)
from app.services.auth_guard import get_current_user


router = APIRouter(
    prefix="/resources",
    tags=["Resources"],
)


@router.get("", response_model=List[ResourceResponse])
async def resource_index(
    search: Optional[str] = Query(default=None),
    resource_type: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    is_indexed: Optional[bool] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await list_resources(
        db=db,
        current_user=current_user,
        search=search,
        resource_type=resource_type,
        is_active=is_active,
        is_indexed=is_indexed,
    )


@router.post("", response_model=ResourceResponse)
async def resource_create(
    data: ResourceCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await create_text_resource(data, db, current_user)


@router.post("/upload", response_model=ResourceResponse)
async def resource_upload(
    title: str = Form(...),
    resource_type: str = Form("document"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await upload_resource_file(title, resource_type, file, db, current_user)


@router.post("/search", response_model=List[ResourceSearchResult])
async def resource_search(
    data: ResourceSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await search_resource_chunks(
        query=data.query,
        db=db,
        current_user=current_user,
        limit=data.limit,
    )


@router.post("/{resource_id}/index", response_model=ResourceIndexResponse)
async def resource_index_one(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await index_resource(resource_id, db, current_user)


@router.get("/{resource_id}", response_model=ResourceResponse)
async def resource_show(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_resource(resource_id, db, current_user)


@router.put("/{resource_id}", response_model=ResourceResponse)
async def resource_update(
    resource_id: int,
    data: ResourceUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await update_resource(resource_id, data, db, current_user)


@router.delete("/{resource_id}")
async def resource_delete(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await delete_resource(resource_id, db, current_user)


@router.post("/{resource_id}/deindex", response_model=ResourceDeindexResponse)
async def resource_deindex_one(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await deindex_resource(resource_id, db, current_user)