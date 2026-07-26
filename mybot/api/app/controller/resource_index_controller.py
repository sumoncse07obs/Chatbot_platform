import hashlib

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.controller.chat_controller import resolve_openai_key
from app.models.resource_chunk_model import ResourceChunk
from app.models.resource_model import Resource
from app.models.user_model import User
from app.services.chunking_service import estimate_token_count, split_text_into_chunks
from app.services.embedding_service import create_embedding, create_embeddings
from app.services.resource_text_service import extract_resource_text
from app.settings.dbdriver import settings


async def get_owned_resource(resource_id: int, db: AsyncSession, current_user: User):
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


async def index_resource(resource_id: int, db: AsyncSession, current_user: User):
    resource = await get_owned_resource(resource_id, db, current_user)
    openai_key = resolve_openai_key(current_user)

    text = extract_resource_text(resource)
    chunks = split_text_into_chunks(text)

    if not chunks:
        raise HTTPException(status_code=400, detail="No indexable text found")

    embeddings = await create_embeddings(chunks, openai_key)

    await db.execute(delete(ResourceChunk).where(ResourceChunk.resource_id == resource.id))

    for index, chunk in enumerate(chunks):
        db.add(
            ResourceChunk(
                resource_id=resource.id,
                chunk_index=index,
                content=chunk,
                content_hash=hashlib.sha256(chunk.encode("utf-8")).hexdigest(),
                token_count=estimate_token_count(chunk),
                embedding_model=settings.EMBEDDING_MODEL,
                embedding=embeddings[index],
                chunk_metadata={
                    "resource_title": resource.title,
                    "resource_type": resource.resource_type,
                },
            )
        )

    resource.is_indexed = True

    await db.commit()
    await db.refresh(resource)

    return {
        "message": "Resource indexed successfully",
        "resource_id": resource.id,
        "chunks": len(chunks),
        "embedding_model": settings.EMBEDDING_MODEL,
    }


async def deindex_resource(resource_id: int, db: AsyncSession, current_user: User):
    resource = await get_owned_resource(resource_id, db, current_user)

    await db.execute(delete(ResourceChunk).where(ResourceChunk.resource_id == resource.id))

    resource.is_indexed = False

    await db.commit()
    await db.refresh(resource)

    return {
        "message": "Resource deindexed successfully",
        "resource_id": resource.id,
    }


async def search_resource_chunks(
    query: str,
    db: AsyncSession,
    current_user: User,
    limit: int = 5,
):
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query is required")

    openai_key = resolve_openai_key(current_user)
    query_embedding = await create_embedding(query, openai_key)

    distance = ResourceChunk.embedding.cosine_distance(query_embedding)

    result = await db.execute(
        select(
            ResourceChunk,
            Resource.title.label("resource_title"),
            Resource.resource_type.label("resource_type"),
            distance.label("distance"),
        )
        .join(Resource, Resource.id == ResourceChunk.resource_id)
        .where(Resource.created_by_id == current_user.id)
        .where(Resource.is_active.is_(True))
        .where(ResourceChunk.embedding.is_not(None))
        .order_by(distance)
        .limit(limit)
    )

    rows = result.all()

    return [
        {
            "chunk_id": chunk.id,
            "resource_id": chunk.resource_id,
            "resource_title": resource_title,
            "resource_type": resource_type,
            "content": chunk.content,
            "score": max(0, 1 - float(distance_value)),
        }
        for chunk, resource_title, resource_type, distance_value in rows
    ]