from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.controller.agent_profile_controller import (
    generate_profile_for_api_key,
    get_profile_for_api_key,
)
from app.database.db import get_db
from app.models.user_model import User
from app.schemas.agent_profile_schema import (
    AgentProfileGenerateRequest,
    AgentProfileResponse,
)
from app.services.auth_guard import get_current_user


router = APIRouter(
    prefix="/agent-profiles",
    tags=["Agent Profiles"],
)


@router.get("/{api_key_id}", response_model=AgentProfileResponse)
async def agent_profile_show(
    api_key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_profile_for_api_key(
        api_key_id=api_key_id,
        db=db,
        current_user=current_user,
    )


@router.post("/generate", response_model=AgentProfileResponse)
async def agent_profile_generate(
    data: AgentProfileGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await generate_profile_for_api_key(
        api_key_id=data.api_key_id,
        force=data.force,
        db=db,
        current_user=current_user,
    )