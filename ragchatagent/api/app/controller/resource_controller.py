from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.controller.resource_index_controller import deindex_resource, index_resource
from app.models.resource_model import Resource
from app.models.user_model import User
from app.schemas.resource_schema import ResourceCreateRequest, ResourceUpdateRequest


RESOURCE_UPLOAD_DIR = Path("storage/resources")
MAX_RESOURCE_FILE_SIZE = 20 * 1024 * 1024

ALLOWED_RESOURCE_MIME_TYPES = {
    "text/plain",
    "text/markdown",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


async def list_resources(
    db: AsyncSession,
    current_user: User,
    search: str | None = None,
    resource_type: str | None = None,
    is_active: bool | None = None,
    is_indexed: bool | None = None,
):
    query = (
        select(Resource)
        .where(Resource.created_by_id == current_user.id)
        .order_by(Resource.id.desc())
    )

    if search:
        query = query.where(Resource.title.ilike(f"%{search}%"))

    if resource_type:
        query = query.where(Resource.resource_type == resource_type)

    if is_active is not None:
        query = query.where(Resource.is_active == is_active)

    if is_indexed is not None:
        query = query.where(Resource.is_indexed == is_indexed)

    result = await db.execute(query)
    return result.scalars().all()


async def get_resource(resource_id: int, db: AsyncSession, current_user: User):
    result = await db.execute(
        select(Resource).where(
            Resource.id == resource_id,
            Resource.created_by_id == current_user.id,
        )
    )
    resource = result.scalar_one_or_none()

    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    return resource


async def sync_resource_index(resource: Resource, db: AsyncSession, current_user: User):
    if resource.is_active:
        await index_resource(resource.id, db, current_user)
    else:
        await deindex_resource(resource.id, db, current_user)

    await db.refresh(resource)
    return resource


async def create_text_resource(
    data: ResourceCreateRequest,
    db: AsyncSession,
    current_user: User,
):
    if not data.content:
        raise HTTPException(status_code=400, detail="Content is required")

    resource = Resource(
        title=data.title,
        resource_type=data.resource_type,
        content=data.content,
        is_active=data.is_active,
        is_indexed=False,
        created_by_id=current_user.id,
    )

    db.add(resource)
    await db.commit()
    await db.refresh(resource)

    return await sync_resource_index(resource, db, current_user)


async def upload_resource_file(
    title: str,
    resource_type: str,
    file: UploadFile,
    db: AsyncSession,
    current_user: User,
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")

    if file.content_type not in ALLOWED_RESOURCE_MIME_TYPES:
        raise HTTPException(status_code=400, detail="File type is not allowed")

    contents = await file.read()

    if len(contents) > MAX_RESOURCE_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size must be 20MB or less")

    RESOURCE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    original_name = Path(file.filename).name
    extension = Path(original_name).suffix.lower()
    filename = f"{uuid4().hex}{extension}"
    file_path = RESOURCE_UPLOAD_DIR / filename

    file_path.write_bytes(contents)

    resource = Resource(
        title=title,
        resource_type=resource_type,
        filename=filename,
        original_name=original_name,
        mime_type=file.content_type,
        size=len(contents),
        url=f"/resource-files/{filename}",
        is_active=True,
        is_indexed=False,
        created_by_id=current_user.id,
    )

    db.add(resource)
    await db.commit()
    await db.refresh(resource)

    return await sync_resource_index(resource, db, current_user)


async def update_resource(
    resource_id: int,
    data: ResourceUpdateRequest,
    db: AsyncSession,
    current_user: User,
):
    resource = await get_resource(resource_id, db, current_user)

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(resource, field, value)

    resource.is_indexed = False

    await db.commit()
    await db.refresh(resource)

    return await sync_resource_index(resource, db, current_user)


async def delete_resource(resource_id: int, db: AsyncSession, current_user: User):
    resource = await get_resource(resource_id, db, current_user)

    if resource.filename:
        file_path = RESOURCE_UPLOAD_DIR / resource.filename
        if file_path.exists():
            file_path.unlink()

    await db.delete(resource)
    await db.commit()

    return {"message": "Resource deleted successfully"}