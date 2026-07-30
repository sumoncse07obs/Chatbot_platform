import re
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key_model import ApiKey
from app.models.chat_conversation_model import ChatConversation
from app.models.conversation_pending_action_model import ConversationPendingAction
from app.models.resource_chunk_model import ResourceChunk
from app.models.resource_model import Resource
from app.models.user_model import User


ANSWER = "ANSWER"
CLARIFY = "CLARIFY"
NOT_FOUND = "NOT_FOUND"
HANDOFF = "HANDOFF"

PENDING_STATUS = "pending"
CONFIRMED_STATUS = "confirmed"
REJECTED_STATUS = "rejected"
CANCELLED_STATUS = "cancelled"
EXPIRED_STATUS = "expired"


@dataclass
class PreRagDecision:
    action: str
    message: str | None = None
    retrieval_query: str | None = None
    candidate_term: str | None = None
    evidence: list[dict] | None = None


def normalize_text(value: str) -> str:
    return " ".join(value.lower().strip().split())


def looks_like_confirmation(message: str) -> bool:
    return normalize_text(message) in {
        "yes",
        "yeah",
        "yep",
        "correct",
        "that is correct",
        "that's correct",
        "i meant that",
        "i mean that",
    }


def looks_like_rejection(message: str) -> bool:
    return normalize_text(message) in {
        "no",
        "nope",
        "not that",
        "that is not correct",
        "that's not correct",
    }


def requests_human(message: str) -> bool:
    normalized = normalize_text(message)

    phrases = (
        "talk to a human",
        "speak to a human",
        "human support",
        "real person",
        "call me",
        "contact me",
        "support team",
        "customer support",
        "representative",
        "agent",
    )

    return any(phrase in normalized for phrase in phrases)


def extract_candidate_terms(message: str) -> list[str]:
    """
    Return only clearly identity-sensitive values.

    General natural-language words are deliberately excluded. They are handled
    by normal grounded RAG, not exact identity verification.
    """
    terms: list[str] = []

    quoted_values = re.findall(r'["“]([^"”]{2,120})["”]', message)
    terms.extend(value.strip() for value in quoted_values if value.strip())

    email_values = re.findall(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        message,
        flags=re.IGNORECASE,
    )
    terms.extend(email_values)

    phone_values = re.findall(
        r"\+?\d[\d\s().-]{6,}\d",
        message,
    )
    terms.extend(phone_values)

    identifier_values = re.findall(
        r"\b(?:[A-Z]{2,}[-_]?\d+[A-Z0-9_-]*|\d{5,})\b",
        message,
        flags=re.IGNORECASE,
    )
    terms.extend(identifier_values)

    unique_terms: list[str] = []
    seen: set[str] = set()

    for term in terms:
        normalized = normalize_text(term)
        if normalized and normalized not in seen:
            seen.add(normalized)
            unique_terms.append(term)

    return unique_terms[:8]

async def get_pending_action(
    conversation: ChatConversation,
    api_key: ApiKey,
    db: AsyncSession,
) -> ConversationPendingAction | None:
    result = await db.execute(
        select(ConversationPendingAction).where(
            ConversationPendingAction.conversation_id == conversation.id,
            ConversationPendingAction.api_key_id == api_key.id,
            ConversationPendingAction.status == PENDING_STATUS,
        )
    )
    pending = result.scalar_one_or_none()

    if pending and pending.expires_at <= datetime.utcnow():
        pending.status = EXPIRED_STATUS
        pending.resolved_at = datetime.utcnow()
        return None

    return pending


async def exact_search(
    terms: list[str],
    owner: User,
    db: AsyncSession,
    limit: int = 8,
) -> list[dict]:
    """
    Exact containment search is tenant-scoped. It is an evidence source, not an answer.
    PostgreSQL full-text/trigram indexes can replace this implementation later.
    """
    matches: list[dict] = []
    seen_chunk_ids: set[int] = set()

    for term in terms:
        pattern = f"%{term}%"

        result = await db.execute(
            select(ResourceChunk, Resource.title, Resource.resource_type)
            .join(Resource, Resource.id == ResourceChunk.resource_id)
            .where(Resource.created_by_id == owner.id)
            .where(Resource.is_active.is_(True))
            .where(Resource.is_indexed.is_(True))
            .where(
                ResourceChunk.content.ilike(pattern)
                | Resource.title.ilike(pattern)
            )
            .order_by(ResourceChunk.chunk_index.asc())
            .limit(limit)
        )

        for chunk, title, resource_type in result.all():
            if chunk.id in seen_chunk_ids:
                continue

            seen_chunk_ids.add(chunk.id)
            matches.append(
                {
                    "term": term,
                    "resource_id": chunk.resource_id,
                    "chunk_id": chunk.id,
                    "resource_title": title,
                    "resource_type": resource_type,
                    "content": chunk.content,
                }
            )

    return matches[:limit]


def pick_unverified_term(
    terms: list[str],
    exact_matches: list[dict],
) -> str | None:
    matched_terms = {normalize_text(match["term"]) for match in exact_matches}

    for term in terms:
        if normalize_text(term) not in matched_terms:
            return term

    return None


async def save_pending_clarification(
    conversation: ChatConversation,
    api_key: ApiKey,
    owner: User,
    original_user_text: str,
    uncertain_term: str,
    candidate: dict,
    db: AsyncSession,
) -> None:
    existing = await get_pending_action(conversation, api_key, db)

    if existing:
        existing.status = CANCELLED_STATUS
        existing.resolved_at = datetime.utcnow()

    db.add(
        ConversationPendingAction(
            conversation_id=conversation.id,
            api_key_id=api_key.id,
            created_by_id=owner.id,
            original_user_text=original_user_text,
            uncertain_term=uncertain_term,
            candidate_term=candidate["term"],
            candidate_type="resource_term",
            evidence={
                "resource_id": candidate["resource_id"],
                "resource_title": candidate["resource_title"],
                "chunk_id": candidate["chunk_id"],
            },
            expires_at=datetime.utcnow() + timedelta(minutes=10),
        )
    )


async def resolve_pending_clarification(
    message: str,
    conversation: ChatConversation,
    api_key: ApiKey,
    db: AsyncSession,
) -> PreRagDecision | None:
    pending = await get_pending_action(conversation, api_key, db)

    if not pending:
        return None

    if looks_like_confirmation(message):
        pending.status = CONFIRMED_STATUS
        pending.resolved_at = datetime.utcnow()

        corrected_query = pending.original_user_text.replace(
            pending.uncertain_term,
            pending.candidate_term,
        )

        return PreRagDecision(
            action=ANSWER,
            retrieval_query=corrected_query,
            candidate_term=pending.candidate_term,
        )

    if looks_like_rejection(message):
        pending.status = REJECTED_STATUS
        pending.resolved_at = datetime.utcnow()

        return PreRagDecision(
            action=NOT_FOUND,
            message=(
                f"I do not have information about {pending.uncertain_term}. "
                "Please provide the spelling or a little more context."
            ),
        )

    pending.status = CANCELLED_STATUS
    pending.resolved_at = datetime.utcnow()
    return None


async def decide_pre_rag_action(
    message: str,
    conversation: ChatConversation,
    api_key: ApiKey,
    owner: User,
    semantic_matches: list[dict],
    db: AsyncSession,
) -> PreRagDecision:
    pending_decision = await resolve_pending_clarification(
        message=message,
        conversation=conversation,
        api_key=api_key,
        db=db,
    )
    if pending_decision:
        return pending_decision

    if requests_human(message):
        return PreRagDecision(
            action=NOT_FOUND,
            message=(
                "I’m unable to connect you with a person right now. "
                "Please leave your email if you would like a follow-up."
            ),
        )

    terms = extract_candidate_terms(message)
    exact_matches = await exact_search(terms=terms, owner=owner, db=db)

    if not semantic_matches:
        return PreRagDecision(
            action=NOT_FOUND,
            message="I do not have enough information in the available resources to answer that.",
        )

    unverified_term = pick_unverified_term(terms, exact_matches)

    if unverified_term:
        return PreRagDecision(
            action=NOT_FOUND,
            message=(
                f"I do not have verified information about {unverified_term}. "
                "Please check the spelling or provide more context."
            ),
        )


    best_score = max(float(match.get("score", 0)) for match in semantic_matches)

    if best_score < 0.70:
        return PreRagDecision(
            action=NOT_FOUND,
            message="I do not have enough information in the available resources to answer that.",
        )

    return PreRagDecision(
        action=ANSWER,
        retrieval_query=message,
        evidence=exact_matches,
    )