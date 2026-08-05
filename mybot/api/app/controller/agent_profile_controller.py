from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.controller.api_key_controller import get_api_key
from app.models.user_model import User
from app.services.agent_profile_service import (
    generate_agent_profile,
    get_agent_profile,
)


async def get_profile_for_api_key(
    api_key_id: int,
    db: AsyncSession,
    current_user: User,
):
    """
    Return the existing automatic agent profile for one owned chatbot API key.
    """

    await get_api_key(
        api_key_id=api_key_id,
        db=db,
        current_user=current_user,
    )

    profile = await get_agent_profile(
        api_key_id=api_key_id,
        owner_id=current_user.id,
        db=db,
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Agent profile has not been generated yet",
        )

    return profile


async def generate_profile_for_api_key(
    api_key_id: int,
    force: bool,
    db: AsyncSession,
    current_user: User,
):
    """
    Build or refresh an automatic agent profile from the current active,
    indexed resources belonging to the authenticated customer.
    """

    api_key = await get_api_key(
        api_key_id=api_key_id,
        db=db,
        current_user=current_user,
    )

    return await generate_agent_profile(
        api_key=api_key,
        owner=current_user,
        db=db,
        force=force,
    )