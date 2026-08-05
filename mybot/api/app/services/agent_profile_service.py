import logging
import hashlib
import json
from datetime import datetime

from fastapi import HTTPException
from openai import AsyncOpenAI, OpenAIError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_profile_model import AgentProfile
from app.models.api_key_model import ApiKey
from app.models.resource_chunk_model import ResourceChunk
from app.models.resource_model import Resource
from app.models.user_model import User
from app.services.secret_crypto import decrypt_secret
from app.settings.dbdriver import settings

logger = logging.getLogger(__name__)

MAX_PROFILE_CHUNKS = 50
MAX_CONTEXT_CHARACTERS = 45000
MAX_LIST_ITEMS = 12


PROFILE_SCHEMA = {
    "name": "agent_profile",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "business_summary": {
                "type": "string",
                "description": "A short, factual summary of the business based only on the supplied resources.",
            },
            "supported_topics": {
                "type": "array",
                "items": {"type": "string"},
            },
            "services": {
                "type": "array",
                "items": {"type": "string"},
            },
            "suggested_questions": {
                "type": "array",
                "items": {"type": "string"},
            },
            "missing_information": {
                "type": "array",
                "items": {"type": "string"},
            },
            "handoff_message": {
                "type": "string",
                "description": "A short, natural message for offering human help when the answer is unavailable.",
            },
        },
        "required": [
            "business_summary",
            "supported_topics",
            "services",
            "suggested_questions",
            "missing_information",
            "handoff_message",
        ],
        "additionalProperties": False,
    },
}


def clean_text(value: object, max_length: int) -> str:
    return " ".join(str(value or "").split())[:max_length].strip()


def clean_list(value: object, max_items: int = MAX_LIST_ITEMS) -> list[str]:
    if not isinstance(value, list):
        return []

    cleaned: list[str] = []
    seen: set[str] = set()

    for item in value:
        text = clean_text(item, 240)

        if not text:
            continue

        normalized = text.casefold()

        if normalized in seen:
            continue

        seen.add(normalized)
        cleaned.append(text)

        if len(cleaned) >= max_items:
            break

    return cleaned


def resolve_owner_openai_key(owner: User) -> str:
    if not owner.openai_api_key:
        raise HTTPException(
            status_code=422,
            detail="OpenAI API key is not configured for this account",
        )

    try:
        return decrypt_secret(owner.openai_api_key)
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail="Stored OpenAI API key could not be decrypted",
        ) from error


def build_resource_fingerprint(rows: list[tuple[ResourceChunk, str]]) -> str:
    digest = hashlib.sha256()

    for chunk, title in rows:
        digest.update(
            f"{chunk.resource_id}:{chunk.id}:{chunk.content_hash or chunk.updated_at.isoformat()}:{title}".encode(
                "utf-8"
            )
        )

    return digest.hexdigest()


def build_resource_context(rows: list[tuple[ResourceChunk, str]]) -> str:
    blocks: list[str] = []
    total_characters = 0

    for chunk, title in rows:
        content = chunk.content.strip()

        if not content:
            continue

        block = f"[Resource: {title}]\n{content}"

        if total_characters + len(block) > MAX_CONTEXT_CHARACTERS:
            remaining = MAX_CONTEXT_CHARACTERS - total_characters

            if remaining > 300:
                blocks.append(block[:remaining])

            break

        blocks.append(block)
        total_characters += len(block)

    return "\n\n".join(blocks)


async def get_agent_profile(
    api_key_id: int,
    owner_id: int,
    db: AsyncSession,
) -> AgentProfile | None:
    result = await db.execute(
        select(AgentProfile).where(
            AgentProfile.api_key_id == api_key_id,
            AgentProfile.created_by_id == owner_id,
        )
    )

    return result.scalar_one_or_none()


async def load_indexed_resource_chunks(
    owner_id: int,
    db: AsyncSession,
) -> list[tuple[ResourceChunk, str]]:
    result = await db.execute(
        select(ResourceChunk, Resource.title)
        .join(Resource, Resource.id == ResourceChunk.resource_id)
        .where(Resource.created_by_id == owner_id)
        .where(Resource.is_active.is_(True))
        .where(Resource.is_indexed.is_(True))
        .where(ResourceChunk.embedding.is_not(None))
        .order_by(Resource.updated_at.desc(), ResourceChunk.resource_id, ResourceChunk.chunk_index)
        .limit(MAX_PROFILE_CHUNKS)
    )

    return list(result.all())


async def generate_agent_profile(
    api_key: ApiKey,
    owner: User,
    db: AsyncSession,
    force: bool = False,
) -> AgentProfile:
    """
    Generate an automatic agent profile from this customer's active indexed resources.

    The customer does not write this profile manually. The AI produces it from
    retrieved business content after resources are indexed.
    """

    if not api_key.created_by_id or api_key.created_by_id != owner.id:
        raise HTTPException(status_code=403, detail="API key does not belong to this account")

    rows = await load_indexed_resource_chunks(owner.id, db)
    existing_profile = await get_agent_profile(api_key.id, owner.id, db)

    if not rows:
        profile = existing_profile or AgentProfile(
            api_key_id=api_key.id,
            created_by_id=owner.id,
        )

        profile.business_summary = None
        profile.supported_topics = []
        profile.services = []
        profile.suggested_questions = []
        profile.missing_information = [
            "Add active, indexed resources so the agent can learn about the business."
        ]
        profile.handoff_message = (
            "I do not have enough business information yet. "
            "Would you like me to connect you with our team?"
        )
        profile.resource_fingerprint = None
        profile.is_ready = False
        profile.last_generated_at = datetime.utcnow()

        db.add(profile)
        await db.commit()
        await db.refresh(profile)

        return profile

    fingerprint = build_resource_fingerprint(rows)

    if (
        existing_profile
        and existing_profile.is_ready
        and existing_profile.resource_fingerprint == fingerprint
        and not force
    ):
        return existing_profile

    context = build_resource_context(rows)

    if not context:
        raise HTTPException(status_code=400, detail="No usable indexed resource content was found")

    openai_key = resolve_owner_openai_key(owner)

    system_prompt = """
You generate an internal profile for a website AI assistant.

Use only the supplied business resources. Do not invent facts, services, prices,
policies, features, company claims, or contact details.

Return:
- a clear business summary;
- topics the assistant can reliably help with;
- explicitly named services or products, when available;
- natural visitor questions that can be answered from the resources;
- important information that appears missing or unclear;
- a short natural handoff message for questions outside the available information.

This profile is used by the AI agent to guide visitors naturally. It must be factual,
concise, specific to the supplied resources, and safe for public chatbot guidance.
""".strip()

    try:
        client = AsyncOpenAI(api_key=openai_key)

        response = await client.chat.completions.create(
            model=settings.ANSWER_MODEL,
            reasoning_effort="low",
            max_completion_tokens=4000,
            response_format={
                "type": "json_schema",
                "json_schema": PROFILE_SCHEMA,
            },
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "assistant_name": api_key.display_name,
                            "resources": context,
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
        )

        content = response.choices[0].message.content or ""
        payload = json.loads(content)
    except (OpenAIError, ValueError, json.JSONDecodeError, IndexError, KeyError) as error:
        logger.exception(
            "Automatic Agent Profile generation failed for API key id=%s",
            api_key.id,
        )

        raise HTTPException(
            status_code=502,
            detail="Could not generate the automatic agent profile",
        ) from error

    profile = existing_profile or AgentProfile(
        api_key_id=api_key.id,
        created_by_id=owner.id,
    )

    profile.business_summary = clean_text(payload.get("business_summary"), 4000) or None
    profile.supported_topics = clean_list(payload.get("supported_topics"))
    profile.services = clean_list(payload.get("services"))
    profile.suggested_questions = clean_list(payload.get("suggested_questions"))
    profile.missing_information = clean_list(payload.get("missing_information"))
    profile.handoff_message = clean_text(payload.get("handoff_message"), 1000) or None
    profile.resource_fingerprint = fingerprint
    profile.is_ready = True
    profile.last_generated_at = datetime.utcnow()

    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    return profile