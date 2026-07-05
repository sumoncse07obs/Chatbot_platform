from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.controller.chat_history_controller import delete_chat_history, get_chat_history, list_chat_history
from app.database.db import get_db
from app.models.user_model import User
from app.schemas.chat_history_schema import (
    ChatHistoryConversationDetailResponse,
    ChatHistoryListResponse,
)
from app.services.auth_guard import get_current_user

router = APIRouter(
    prefix="/chat-history",
    tags=["Chat History"],
)


@router.get("", response_model=ChatHistoryListResponse)
async def chat_history_index(
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await list_chat_history(db, current_user, search, page, per_page)


@router.get("/{conversation_id}", response_model=ChatHistoryConversationDetailResponse)
async def chat_history_show(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_chat_history(conversation_id, db, current_user)

@router.delete("/{conversation_id}")
async def chat_history_delete(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await delete_chat_history(conversation_id, db, current_user)