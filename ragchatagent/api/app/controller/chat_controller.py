from datetime import datetime

from fastapi import HTTPException
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.controller.api_key_controller import hash_api_key
from app.models.api_key_model import ApiKey
from app.models.chat_conversation_model import ChatConversation
from app.models.chat_message_model import ChatMessage
from app.models.resource_chunk_model import ResourceChunk
from app.models.resource_model import Resource
from app.models.user_model import User
from app.models.visitor_model import Visitor
from app.schemas.chat_schema import ChatRequest, ChatVisitorPatch
from app.services.embedding_service import create_embedding
from app.services.secret_crypto import decrypt_secret
from app.settings.dbdriver import settings


DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful website chat assistant. "
    "Answer clearly and use the provided knowledge base context when it is relevant. "
    "Use the conversation history when it helps. "
    "If the context does not contain the answer, say what you know and ask a helpful follow-up."
)

CONTACT_TOOL_NAME = "save_visitor_contact"

CONTACT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": CONTACT_TOOL_NAME,
            "description": (
                "Save visitor contact details only when the visitor naturally provides them "
                "or clearly confirms them. Do not invent values."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Visitor name, if naturally provided.",
                    },
                    "email": {
                        "type": "string",
                        "description": "Visitor email address, if naturally provided.",
                    },
                    "phone": {
                        "type": "string",
                        "description": "Visitor phone number, if naturally provided.",
                    },
                    "notes": {
                        "type": "string",
                        "description": "Brief useful lead/support note from the conversation.",
                    },
                },
                "additionalProperties": False,
            },
        },
    }
]


async def resolve_chat_api_key(raw_key: str, db: AsyncSession) -> ApiKey:
    key_hash = hash_api_key(raw_key)

    result = await db.execute(
        select(ApiKey).where(
            ApiKey.key_hash == key_hash,
            ApiKey.is_active.is_(True),
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")

    return api_key


async def resolve_api_key_owner(api_key: ApiKey, db: AsyncSession) -> User:
    if not api_key.created_by_id:
        raise HTTPException(status_code=403, detail="API key has no owner")

    result = await db.execute(select(User).where(User.id == api_key.created_by_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="Account not found or inactive")

    return user


def resolve_openai_key(user: User) -> str:
    if not user.openai_api_key:
        raise HTTPException(status_code=422, detail="OpenAI API key is not configured for this account")

    try:
        return decrypt_secret(user.openai_api_key)
    except ValueError:
        raise HTTPException(status_code=422, detail="Stored OpenAI key could not be decrypted")


def clean_external_user_id(value: str | None) -> str:
    cleaned = (value or "").strip()
    return cleaned[:150] if cleaned else "anonymous"


def clean_text(value: str | None, max_length: int) -> str | None:
    if value is None:
        return None

    cleaned = " ".join(value.strip().split())
    if not cleaned:
        return None

    return cleaned[:max_length]


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


async def resolve_visitor(
    api_key: ApiKey,
    owner: User,
    external_user_id: str,
    db: AsyncSession,
) -> Visitor:
    result = await db.execute(
        select(Visitor).where(
            Visitor.api_key_id == api_key.id,
            Visitor.external_user_id == external_user_id,
        )
    )
    visitor = result.scalar_one_or_none()

    if visitor:
        if visitor.created_by_id is None:
            visitor.created_by_id = owner.id
        return visitor

    visitor = Visitor(
        api_key_id=api_key.id,
        created_by_id=owner.id,
        external_user_id=external_user_id,
    )
    db.add(visitor)
    await db.flush()

    return visitor


def apply_visitor_patch(visitor: Visitor, patch: ChatVisitorPatch | dict | None) -> bool:
    if patch is None:
        return False

    if isinstance(patch, ChatVisitorPatch):
        data = patch.model_dump(exclude_unset=True)
    else:
        data = patch

    changed = False

    name = clean_text(data.get("name"), 150)
    email = clean_text(data.get("email"), 255)
    phone = clean_text(data.get("phone"), 80)
    notes = clean_text(data.get("notes"), 2000)

    if name and name != visitor.name:
        visitor.name = name
        changed = True

    if email and email != visitor.email:
        visitor.email = email
        changed = True

    if phone and phone != visitor.phone:
        visitor.phone = phone
        changed = True

    if notes:
        if visitor.notes:
            if notes not in visitor.notes:
                visitor.notes = f"{visitor.notes}\n{notes}"[:4000]
                changed = True
        else:
            visitor.notes = notes
            changed = True

    if changed:
        visitor.updated_at = datetime.utcnow()

    return changed


async def retrieve_context(
    message: str,
    owner: User,
    db: AsyncSession,
    limit: int,
    openai_key: str,
) -> list[dict]:
    query_embedding = await create_embedding(message, openai_key)
    distance = ResourceChunk.embedding.cosine_distance(query_embedding)

    result = await db.execute(
        select(
            ResourceChunk,
            Resource.title.label("resource_title"),
            Resource.resource_type.label("resource_type"),
            distance.label("distance"),
        )
        .join(Resource, Resource.id == ResourceChunk.resource_id)
        .where(Resource.created_by_id == owner.id)
        .where(Resource.is_active.is_(True))
        .where(Resource.is_indexed.is_(True))
        .where(ResourceChunk.embedding.is_not(None))
        .order_by(distance)
        .limit(limit)
    )

    matches = []

    for chunk, resource_title, resource_type, distance_value in result.all():
        distance_float = float(distance_value)
        matches.append(
            {
                "resource_id": chunk.resource_id,
                "resource_title": resource_title,
                "resource_type": resource_type,
                "content": chunk.content,
                "score": max(0, 1 - distance_float),
            }
        )

    return matches


def build_context_text(matches: list[dict]) -> str:
    if not matches:
        return "No indexed knowledge base context was found."

    blocks = []

    for index, match in enumerate(matches, start=1):
        blocks.append(
            "\n".join(
                [
                    f"[Context {index}]",
                    f"Title: {match['resource_title']}",
                    f"Type: {match['resource_type']}",
                    f"Content: {match['content']}",
                ]
            )
        )

    return "\n\n".join(blocks)


def build_visitor_text(visitor: Visitor) -> str:
    details = [
        f"External visitor id: {visitor.external_user_id}",
        f"Name: {visitor.name or 'unknown'}",
        f"Email: {visitor.email or 'unknown'}",
        f"Phone: {visitor.phone or 'unknown'}",
        f"Notes: {visitor.notes or 'none'}",
    ]

    return "\n".join(details)


def build_system_prompt(api_key: ApiKey, context_text: str, visitor: Visitor) -> str:
    persona_prompt = api_key.system_prompt or DEFAULT_SYSTEM_PROMPT

    return "\n\n".join(
        [
            persona_prompt.strip(),
            "Knowledge base context:",
            context_text,
            "Known visitor information:",
            build_visitor_text(visitor),
            "Available capability:",
            (
                "When the visitor naturally provides or confirms contact information, "
                f"use the {CONTACT_TOOL_NAME} tool to save it. "
                "Do not ask for contact information unless the system prompt or knowledge base makes it useful."
            ),
        ]
    )


def make_conversation_title(message: str) -> str:
    title = " ".join(message.strip().split())

    if len(title) > 120:
        return f"{title[:117].rstrip()}..."

    return title or "New conversation"


async def resolve_conversation(
    data: ChatRequest,
    api_key: ApiKey,
    owner: User,
    visitor: Visitor,
    db: AsyncSession,
) -> ChatConversation:
    if data.conversation_id:
        try:
            conversation_id = int(data.conversation_id)
        except (TypeError, ValueError):
            conversation_id = 0

        if conversation_id > 0:
            result = await db.execute(
                select(ChatConversation).where(
                    ChatConversation.id == conversation_id,
                    ChatConversation.api_key_id == api_key.id,
                    ChatConversation.created_by_id == owner.id,
                )
            )
            conversation = result.scalar_one_or_none()

            if conversation:
                if conversation.visitor_id is None:
                    conversation.visitor_id = visitor.id
                return conversation

    conversation = ChatConversation(
        api_key_id=api_key.id,
        created_by_id=owner.id,
        visitor_id=visitor.id,
        external_user_id=visitor.external_user_id,
        title=make_conversation_title(data.message),
        last_message_at=datetime.utcnow(),
    )

    db.add(conversation)
    await db.flush()

    return conversation


async def load_recent_messages(conversation_id: int, db: AsyncSession, limit: int = 8) -> list[dict]:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.id.desc())
        .limit(limit)
    )

    rows = list(reversed(result.scalars().all()))

    return [
        {
            "role": "assistant" if message.role == "assistant" else "user",
            "content": message.content,
        }
        for message in rows
    ]


async def run_chat_completion(
    client: AsyncOpenAI,
    api_key: ApiKey,
    messages: list[dict],
    use_tools: bool,
):
    kwargs = {
        "model": settings.CHAT_MODEL,
        "temperature": api_key.temperature,
        "messages": messages,
    }

    if use_tools:
        kwargs["tools"] = CONTACT_TOOLS
        kwargs["tool_choice"] = "auto"

    return await client.chat.completions.create(**kwargs)


async def chat_with_api_key(data: ChatRequest, db: AsyncSession):
    api_key = await resolve_chat_api_key(data.api_key, db)
    owner = await resolve_api_key_owner(api_key, db)
    openai_key = resolve_openai_key(owner)

    external_user_id = clean_external_user_id(data.external_user_id)
    visitor = await resolve_visitor(api_key, owner, external_user_id, db)
    apply_visitor_patch(visitor, data.visitor)

    conversation = await resolve_conversation(data, api_key, owner, visitor, db)
    recent_messages = await load_recent_messages(conversation.id, db)

    user_message = ChatMessage(
        conversation_id=conversation.id,
        api_key_id=api_key.id,
        created_by_id=owner.id,
        role="user",
        content=data.message,
    )
    db.add(user_message)
    await db.flush()

    matches = await retrieve_context(
        message=data.message,
        owner=owner,
        db=db,
        limit=data.limit,
        openai_key=openai_key,
    )

    system_prompt = build_system_prompt(
        api_key=api_key,
        context_text=build_context_text(matches),
        visitor=visitor,
    )

    messages = [
        {"role": "system", "content": system_prompt},
        *recent_messages,
        {"role": "user", "content": data.message},
    ]

    client = AsyncOpenAI(api_key=openai_key)
    response = await run_chat_completion(client, api_key, messages, use_tools=True)
    response_message = response.choices[0].message

    tool_calls = response_message.tool_calls or []

    if tool_calls:
        messages.append(response_message)

        for tool_call in tool_calls:
            if tool_call.function.name == CONTACT_TOOL_NAME:
                try:
                    arguments = tool_call.function.arguments
                    import json

                    payload = json.loads(arguments or "{}")
                except ValueError:
                    payload = {}

                apply_visitor_patch(visitor, payload)

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": "Visitor contact information was saved.",
                    }
                )

        response = await run_chat_completion(client, api_key, messages, use_tools=False)
        answer = response.choices[0].message.content or ""
    else:
        answer = response_message.content or ""

    assistant_message = ChatMessage(
        conversation_id=conversation.id,
        api_key_id=api_key.id,
        created_by_id=owner.id,
        role="assistant",
        content=answer,
    )
    db.add(assistant_message)

    now = datetime.utcnow()
    conversation.last_message_at = now
    conversation.updated_at = now
    visitor.updated_at = now

    await db.commit()
    await db.refresh(conversation)
    await db.refresh(visitor)

    return {
        "answer": answer,
        "api_key_id": api_key.id,
        "conversation_id": conversation.id,
        "display_name": api_key.display_name,
        "avatar_url": api_key.avatar_url,
        "welcome_message": api_key.welcome_message,
        "visitor": serialize_visitor(visitor),
        "used_resources": matches,
    }