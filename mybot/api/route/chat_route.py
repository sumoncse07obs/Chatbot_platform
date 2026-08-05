from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.controller.chat_controller import (
    chat_with_api_key,
    get_public_widget_config,
)
from app.database.db import get_db
from app.schemas.chat_schema import (
    ChatRequest,
    ChatResponse,
    WidgetConfigResponse,
)

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


@router.get("/widget-config", response_model=WidgetConfigResponse)
async def widget_config(
    api_key: str = Query(min_length=1),
    db: AsyncSession = Depends(get_db),
):
    return await get_public_widget_config(api_key, db)


@router.post("", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    return await chat_with_api_key(data, db)