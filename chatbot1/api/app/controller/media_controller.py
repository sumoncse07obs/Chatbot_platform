from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.media_model import Media
from app.models.user_model import User


UPLOAD_DIR = Path("storage/uploads")
MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
}


async def list_media(db: AsyncSession, current_user: User):
    result = await db.execute(
        select(Media)
        .where(Media.uploaded_by_id == current_user.id)
        .order_by(Media.id.desc())
    )

    return result.scalars().all()



async def upload_media(file: UploadFile, db: AsyncSession, current_user: User):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="File type is not allowed")

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size must be 10MB or less")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    original_name = Path(file.filename).name
    extension = Path(original_name).suffix.lower()
    filename = f"{uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / filename

    file_path.write_bytes(contents)

    media = Media(
        filename=filename,
        original_name=original_name,
        mime_type=file.content_type,
        size=len(contents),
        url=f"/uploads/{filename}",
        uploaded_by_id=current_user.id,
    )

    db.add(media)
    await db.commit()
    await db.refresh(media)

    return media


async def delete_media(media_id: int, db: AsyncSession, current_user: User):
    result = await db.execute(select(Media).where(Media.id == media_id))
    media = result.scalar_one_or_none()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if media.uploaded_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot delete this media")

    file_path = UPLOAD_DIR / media.filename

    if file_path.exists():
        file_path.unlink()

    await db.delete(media)
    await db.commit()

    return {"message": "Media deleted successfully"}
