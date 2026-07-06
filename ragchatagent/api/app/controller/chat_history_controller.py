import math
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key_model import ApiKey
from app.models.chat_conversation_model import ChatConversation
from app.models.chat_message_model import ChatMessage
from app.models.user_model import User
from app.models.visitor_model import Visitor


def serialize_visitor(visitor: Visitor | None) -> dict | None:
    if visitor is None:
        return None

    return {
        "id": visitor.id,
        "external_user_id": visitor.external_user_id,
        "name": visitor.name,
        "email": visitor.email,
        "phone": visitor.phone,
        "notes": visitor.notes,
    }

def has_lead_contact(visitor: Visitor) -> bool:
    return bool(visitor.name or visitor.email or visitor.phone or visitor.notes)


async def list_leads(
    db: AsyncSession,
    current_user: User,
    search: str | None = None,
    page: int = 1,
    per_page: int = 20,
):
    page = max(page, 1)
    per_page = min(max(per_page, 1), 100)

    filters = [
        Visitor.created_by_id == current_user.id,
        or_(
            Visitor.name.is_not(None),
            Visitor.email.is_not(None),
            Visitor.phone.is_not(None),
            Visitor.notes.is_not(None),
        ),
    ]

    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                Visitor.external_user_id.ilike(term),
                Visitor.name.ilike(term),
                Visitor.email.ilike(term),
                Visitor.phone.ilike(term),
                Visitor.notes.ilike(term),
                ApiKey.name.ilike(term),
                ApiKey.display_name.ilike(term),
            )
        )

    count_query = (
        select(func.count(Visitor.id))
        .join(ApiKey, ApiKey.id == Visitor.api_key_id)
        .where(*filters)
    )
    total = await db.scalar(count_query) or 0

    result = await db.execute(
        select(
            Visitor,
            ApiKey,
            func.count(ChatConversation.id).label("conversation_count"),
            func.max(ChatConversation.last_message_at).label("last_message_at"),
        )
        .join(ApiKey, ApiKey.id == Visitor.api_key_id)
        .outerjoin(ChatConversation, ChatConversation.visitor_id == Visitor.id)
        .where(*filters)
        .group_by(Visitor.id, ApiKey.id)
        .order_by(func.max(ChatConversation.last_message_at).desc().nullslast(), Visitor.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    rows = []
    for visitor, api_key, conversation_count, last_message_at in result.all():
        rows.append(
            {
                "id": visitor.id,
                "external_user_id": visitor.external_user_id,
                "name": visitor.name,
                "email": visitor.email,
                "phone": visitor.phone,
                "notes": visitor.notes,
                "api_key_id": visitor.api_key_id,
                "api_key_name": api_key.name,
                "display_name": api_key.display_name,
                "conversation_count": conversation_count or 0,
                "last_message_at": last_message_at,
                "created_at": visitor.created_at,
                "updated_at": visitor.updated_at,
            }
        )

    return {
        "data": rows,
        "total": total,
        "page": page,
        "per_page": per_page,
        "last_page": max(1, math.ceil(total / per_page)),
    }

async def list_chat_history(
    db: AsyncSession,
    current_user: User,
    search: str | None = None,
    page: int = 1,
    per_page: int = 20,
    status: str | None = None,
):
    page = max(page, 1)
    per_page = min(max(per_page, 1), 100)

    filters = [ChatConversation.created_by_id == current_user.id]

    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                ChatConversation.external_user_id.ilike(term),
                ChatConversation.title.ilike(term),
                ApiKey.name.ilike(term),
                ApiKey.display_name.ilike(term),
                Visitor.name.ilike(term),
                Visitor.email.ilike(term),
                Visitor.phone.ilike(term),
            )
        )
    if status == "needs_human":
        filters.append(ChatConversation.needs_human == True)
    elif status == "resolved":
        filters.append(ChatConversation.needs_human == False)
        filters.append(ChatConversation.resolved_at.is_not(None))

    count_query = (
        select(func.count(ChatConversation.id))
        .join(ApiKey, ApiKey.id == ChatConversation.api_key_id)
        .outerjoin(Visitor, Visitor.id == ChatConversation.visitor_id)
        .where(*filters)
    )
    total = await db.scalar(count_query) or 0

    result = await db.execute(
        select(ChatConversation, ApiKey, Visitor)
        .join(ApiKey, ApiKey.id == ChatConversation.api_key_id)
        .outerjoin(Visitor, Visitor.id == ChatConversation.visitor_id)
        .where(*filters)
        .order_by(ChatConversation.last_message_at.desc().nullslast(), ChatConversation.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    rows = []
    for conversation, api_key, visitor in result.all():
        message_count = await db.scalar(
            select(func.count(ChatMessage.id)).where(ChatMessage.conversation_id == conversation.id)
        ) or 0

        last_message = await db.scalar(
            select(ChatMessage.content)
            .where(ChatMessage.conversation_id == conversation.id)
            .order_by(ChatMessage.id.desc())
            .limit(1)
        )

        rows.append(
            {
                "id": conversation.id,
                "api_key_id": conversation.api_key_id,
                "created_by_id": conversation.created_by_id,
                "visitor_id": conversation.visitor_id,
                "external_user_id": conversation.external_user_id,
                "title": conversation.title,
                "last_message_at": conversation.last_message_at,
                "needs_human": conversation.needs_human,
                "resolved_at": conversation.resolved_at,
                "created_at": conversation.created_at,
                "updated_at": conversation.updated_at,
                "message_count": message_count,
                "last_message": last_message,
                "api_key_name": api_key.name,
                "display_name": api_key.display_name,
                "visitor": serialize_visitor(visitor),
            }
        )

    return {
        "data": rows,
        "total": total,
        "page": page,
        "per_page": per_page,
        "last_page": max(1, math.ceil(total / per_page)),
    }


async def get_chat_history(conversation_id: int, db: AsyncSession, current_user: User):
    result = await db.execute(
        select(ChatConversation, ApiKey, Visitor)
        .join(ApiKey, ApiKey.id == ChatConversation.api_key_id)
        .outerjoin(Visitor, Visitor.id == ChatConversation.visitor_id)
        .where(
            ChatConversation.id == conversation_id,
            ChatConversation.created_by_id == current_user.id,
        )
    )
    row = result.one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation, api_key, visitor = row

    messages_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.id.asc())
    )
    messages = messages_result.scalars().all()

    return {
        "id": conversation.id,
        "api_key_id": conversation.api_key_id,
        "created_by_id": conversation.created_by_id,
        "visitor_id": conversation.visitor_id,
        "external_user_id": conversation.external_user_id,
        "title": conversation.title,
        "last_message_at": conversation.last_message_at,
        "needs_human": conversation.needs_human,
        "resolved_at": conversation.resolved_at,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "message_count": len(messages),
        "last_message": messages[-1].content if messages else None,
        "api_key_name": api_key.name,
        "display_name": api_key.display_name,
        "visitor": serialize_visitor(visitor),
        "messages": messages,
    }

async def update_handoff_status(
    conversation_id: int,
    needs_human: bool,
    db: AsyncSession,
    current_user: User,
):
    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.created_by_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.needs_human = needs_human
    conversation.resolved_at = None if needs_human else datetime.utcnow()
    conversation.updated_at = datetime.utcnow()

    await db.commit()

    return {"message": "Handoff status updated successfully"}
    
async def delete_chat_history(conversation_id: int, db: AsyncSession, current_user: User):
    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.created_by_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conversation)
    await db.commit()

    return {"message": "Conversation deleted successfully"}