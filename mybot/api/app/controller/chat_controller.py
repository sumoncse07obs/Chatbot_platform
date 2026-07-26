import json
from datetime import datetime

from fastapi import HTTPException
from openai import AsyncOpenAI
from sqlalchemy import case, or_, select
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
    "You are a warm, practical website support and sales assistant for this company. "
    "Answer like a real person on the team. "
    "Use only the indexed company context for company, service, skill, feature, pricing, setup, "
    "support, and about questions. "
    "If the context does not contain the answer, say you do not have enough company information yet."
)

CONTACT_TOOL_NAME = "save_visitor_contact"
HANDOFF_TOOL_NAME = "request_human_handoff"

CONTACT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": CONTACT_TOOL_NAME,
            "description": "Save visitor contact details only when the visitor explicitly provides contact information in the conversation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "email": {"type": "string"},
                    "phone": {"type": "string"},
                    "notes": {"type": "string"},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": HANDOFF_TOOL_NAME,
            "description": "Mark this conversation as needing a human reply.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string"},
                },
                "additionalProperties": False,
            },
        },
    },
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

    data = patch.model_dump(exclude_unset=True) if isinstance(patch, ChatVisitorPatch) else patch
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


def apply_handoff_request(
    conversation: ChatConversation,
    visitor: Visitor,
    payload: dict | None = None,
) -> None:
    reason = clean_text((payload or {}).get("reason"), 500)

    conversation.needs_human = True
    conversation.resolved_at = None
    conversation.updated_at = datetime.utcnow()

    note = f"Handoff requested: {reason}" if reason else "Handoff requested."
    apply_visitor_patch(visitor, {"notes": note})


def is_business_profile_question(message: str) -> bool:
    normalized = " ".join(message.lower().strip().split())

    phrases = [
        "about you",
        "about your company",
        "tell me about you",
        "tell me about yourself",
        "tell me about your company",
        "who are you",
        "what are you",
        "what do you do",
        "what does your company do",
        "what can you do",
        "what can your company do",
        "what services do you offer",
        "what service do you offer",
        "what are your services",
        "what is your skill",
        "what are your skills",
        "what do you specialize in",
        "what does sumon specialize in",
        "what is tomadev",
        "who is sumon",
    ]

    keywords = [
        "service",
        "services",
        "offer",
        "offers",
        "skill",
        "skills",
        "specialize",
        "specializes",
        "specialization",
        "about",
        "company",
        "business",
        "solution",
        "solutions",
        "feature",
        "features",
        "pricing",
        "price",
        "plans",
        "support",
        "setup",
        "crm",
        "api",
        "chatbot",
        "rag",
        "agent",
        "automation",
        "dashboard",
        "saas",
        "tomadev",
        "sumon",
    ]

    return any(phrase in normalized for phrase in phrases) or any(keyword in normalized for keyword in keywords)



def build_retrieval_query(message: str) -> str:
    if is_business_profile_question(message):
        return (
            f"{message}\n\n"
            "Retrieve indexed company profile, about, services, skills, specializations, and offers. "
            "Relevant resource titles may include: About Sumon, What does Sumon specialize in, "
            "What is TomaDev, What services does TomaDev offer, Can you build AI agents, "
            "Can your chatbot connect with my CRM, Can your chatbot capture leads. "
            "Relevant details may include: AI Chatbot Development, RAG Chatbots, AI Agent Development, "
            "SaaS Development, CRM Integration, API Development, Dashboard Development, "
            "AI Workflow Automation, Custom Business Software, FastAPI, React, TypeScript, PostgreSQL, "
            "and OpenAI Integration."
        )

    return message


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

    return [
        {
            "resource_id": chunk.resource_id,
            "resource_title": resource_title,
            "resource_type": resource_type,
            "content": chunk.content,
            "score": max(0, 1 - float(distance_value)),
        }
        for chunk, resource_title, resource_type, distance_value in result.all()
    ]


async def load_business_profile_context(
    owner: User,
    db: AsyncSession,
    limit: int = 10,
) -> list[dict]:
    terms = [
        "about sumon",
        "sumon specialize",
        "what is tomadev",
        "services does tomadev offer",
        "service",
        "services",
        "offer",
        "offers",
        "specialize",
        "specializes",
        "skill",
        "skills",
        "solution",
        "solutions",
        "feature",
        "features",
        "business",
        "company",
        "support",
        "pricing",
        "setup",
        "crm",
        "api",
        "chatbot",
        "rag",
        "agent",
        "automation",
        "dashboard",
        "saas",
        "fastapi",
        "react",
        "typescript",
        "postgresql",
        "openai",
        "tomadev",
        "sumon",
    ]

    term_filters = []

    for term in terms:
        pattern = f"%{term}%"
        term_filters.append(Resource.title.ilike(pattern))
        term_filters.append(Resource.resource_type.ilike(pattern))
        term_filters.append(ResourceChunk.content.ilike(pattern))

    priority = case(
        (Resource.title.ilike("%what services does tomadev offer%"), 0),
        (Resource.title.ilike("%what does sumon specialize in%"), 1),
        (Resource.title.ilike("%about sumon%"), 2),
        (Resource.title.ilike("%what is tomadev%"), 3),
        (Resource.title.ilike("%can you build ai agents%"), 4),
        (Resource.title.ilike("%crm%"), 5),
        (Resource.title.ilike("%capture leads%"), 6),
        (ResourceChunk.content.ilike("%AI Chatbot Development%"), 7),
        (ResourceChunk.content.ilike("%RAG Chatbots%"), 8),
        (ResourceChunk.content.ilike("%AI Agent Development%"), 9),
        (ResourceChunk.content.ilike("%SaaS Development%"), 10),
        (ResourceChunk.content.ilike("%CRM Integration%"), 11),
        else_=30,
    )

    result = await db.execute(
        select(
            ResourceChunk,
            Resource.title.label("resource_title"),
            Resource.resource_type.label("resource_type"),
        )
        .join(Resource, Resource.id == ResourceChunk.resource_id)
        .where(Resource.created_by_id == owner.id)
        .where(Resource.is_active.is_(True))
        .where(Resource.is_indexed.is_(True))
        .where(ResourceChunk.embedding.is_not(None))
        .where(or_(*term_filters))
        .order_by(priority, ResourceChunk.chunk_index.asc(), Resource.id.asc())
        .limit(limit)
    )

    return [
        {
            "resource_id": chunk.resource_id,
            "resource_title": resource_title,
            "resource_type": resource_type,
            "content": chunk.content,
            "score": 1.0,
        }
        for chunk, resource_title, resource_type in result.all()
    ]

def merge_context_matches(primary: list[dict], secondary: list[dict], limit: int) -> list[dict]:
    merged = []
    seen = set()

    for match in [*primary, *secondary]:
        key = (match.get("resource_id"), match.get("content", "")[:160])

        if key in seen:
            continue

        seen.add(key)
        merged.append(match)

        if len(merged) >= limit:
            break

    return merged


def build_context_text(matches: list[dict]) -> str:
    if not matches:
        return "No indexed company context was found."

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
    return "\n".join(
        [
            f"External visitor id: {visitor.external_user_id}",
            f"Name: {visitor.name or 'unknown'}",
            f"Email: {visitor.email or 'unknown'}",
            f"Phone: {visitor.phone or 'unknown'}",
            f"Notes: {visitor.notes or 'none'}",
        ]
    )


def build_system_prompt(api_key: ApiKey, context_text: str, visitor: Visitor) -> str:
    persona_prompt = api_key.system_prompt or DEFAULT_SYSTEM_PROMPT

    return "\n\n".join(
        [
            persona_prompt.strip(),
            "Hard behavior rules:",
            (
                "You are speaking as a human support and sales assistant for the company. "
                "Never describe yourself as a chatbot, AI, RAG chatbot, language model, automated system, "
                "knowledge base assistant, retrieval assistant, or virtual assistant. "
                "Never mention retrieval, embeddings, vector search, chunks, tools, prompts, or internal systems. "
                "For company, service, skill, feature, offer, pricing, setup, support, and about-you questions, "
                "use only the company context below. Treat 'you', 'your skill', 'your skills', and 'about you' "
                "as questions about Sumon, TomaDev, services, skills, technologies, and offers from the context. "
                "When the context contains service or skill details, answer with those concrete details directly. "
                "For 'what is your skill' or 'tell me about you', include the relevant services and technologies "
                "from the context, such as AI Chatbot Development, RAG Chatbots, AI Agent Development, SaaS Development, "
                "CRM Integration, API Development, Dashboard Development, AI Workflow Automation, Custom Business Software, "
                "FastAPI, React/TypeScript, PostgreSQL, and OpenAI Integration, but only if they appear in the context. "
                "Do not answer with vague phrases like 'I can provide information about our services' or "
                "'I am here to help with information'. "
                "Do not use general knowledge. Do not guess. Do not invent services, technologies, prices, timelines, "
                "guarantees, or experience that are not in the context. "
                "Do not ask for name, email, phone, or follow-up details after a normal informational answer. "
                "Only ask for contact details when the visitor shows clear buying intent, asks for follow-up, requests a quote, "
                "wants a call, asks to hire/build/start a project, or voluntarily provides contact information. "
                "If company context is missing or does not contain the answer, say exactly: "
                "'I do not have enough company information to answer that yet.'"
            ),
            "Company information and context:",
            context_text,
            "Known visitor information:",
            build_visitor_text(visitor),
            "Available capability:",
            (
                "When the visitor explicitly provides contact information, "
                f"use the {CONTACT_TOOL_NAME} tool to save it. "
                "Do not ask for contact details after ordinary company, service, skill, or about questions. "
                "Ask for contact details only after clear buying intent, quote requests, project requests, callback requests, "
                "or support follow-up requests. "
                f"If the visitor asks for a human, agent, callback, sales follow-up, support escalation, "
                f"or manual help, use the {HANDOFF_TOOL_NAME} tool."
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


async def persist_assistant_answer(
    answer: str,
    conversation: ChatConversation,
    visitor: Visitor,
    api_key: ApiKey,
    owner: User,
    db: AsyncSession,
    matches: list[dict],
):
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

    retrieval_query = build_retrieval_query(data.message)

    matches = await retrieve_context(
        message=retrieval_query,
        owner=owner,
        db=db,
        limit=data.limit,
        openai_key=openai_key,
    )

    if is_business_profile_question(data.message):
        business_matches = await load_business_profile_context(
            owner=owner,
            db=db,
            limit=8,
        )
        matches = merge_context_matches(
            primary=business_matches,
            secondary=matches,
            limit=max(data.limit, 8),
        )

        if not matches:
            answer = "I do not have enough company information to answer that yet."
            return await persist_assistant_answer(answer, conversation, visitor, api_key, owner, db, [])

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
                    payload = json.loads(tool_call.function.arguments or "{}")
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

            elif tool_call.function.name == HANDOFF_TOOL_NAME:
                try:
                    payload = json.loads(tool_call.function.arguments or "{}")
                except ValueError:
                    payload = {}

                apply_handoff_request(conversation, visitor, payload)

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": "Human handoff was requested.",
                    }
                )

        response = await run_chat_completion(client, api_key, messages, use_tools=False)
        answer = response.choices[0].message.content or ""
    else:
        answer = response_message.content or ""

    return await persist_assistant_answer(answer, conversation, visitor, api_key, owner, db, matches)