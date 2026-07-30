import json
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

from openai import AsyncOpenAI, OpenAIError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key_model import ApiKey
from app.models.chat_conversation_model import ChatConversation
from app.models.conversation_pending_action_model import ConversationPendingAction
from app.models.resource_model import Resource
from app.models.resource_term_model import ResourceTerm
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

GREETING_MESSAGE = "Hi! How can I help you today?"
GENERIC_FOLLOW_UP_MESSAGE = "How can I help you today?"

ClassifierIntent = Literal[
    "greeting",
    "resource_question",
    "confirmation_accepted",
    "confirmation_rejected",
    "human_request",
    "unclear",
]


@dataclass
class PreRagDecision:
    action: str
    message: str | None = None
    retrieval_query: str | None = None
    candidate_term: str | None = None
    evidence: list[dict] | None = None
    intent: ClassifierIntent | None = None


def normalize_text(value: str) -> str:
    return " ".join(value.lower().strip().split())


async def get_pending_action(
    conversation: ChatConversation,
    api_key: ApiKey,
    db: AsyncSession,
) -> ConversationPendingAction | None:
    result = await db.execute(
        select(ConversationPendingAction)
        .where(
            ConversationPendingAction.conversation_id == conversation.id,
            ConversationPendingAction.api_key_id == api_key.id,
            ConversationPendingAction.status == PENDING_STATUS,
        )
        .order_by(ConversationPendingAction.id.desc())
        .limit(1)
    )
    pending = result.scalar_one_or_none()

    if pending and pending.expires_at <= datetime.utcnow():
        pending.status = EXPIRED_STATUS
        pending.resolved_at = datetime.utcnow()
        return None

    return pending


async def classify_visitor_message(
    message: str,
    pending: ConversationPendingAction | None,
    openai_key: str,
    model: str,
) -> ClassifierIntent:
    """
    Return intent JSON only. The model cannot answer, retrieve, validate terms,
    create facts, or override deterministic backend policy.
    """
    pending_context = None

    if pending:
        pending_context = {
            "original_question": pending.original_user_text,
            "uncertain_term": pending.uncertain_term,
            "verified_candidate_term": pending.candidate_term,
        }

    schema = {
        "name": "visitor_message_intent",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "intent": {
                    "type": "string",
                    "enum": [
                        "greeting",
                        "resource_question",
                        "confirmation_accepted",
                        "confirmation_rejected",
                        "human_request",
                        "unclear",
                    ],
                }
            },
            "required": ["intent"],
            "additionalProperties": False,
        },
    }

    system_prompt = """
You are a strictly limited intent classifier for a SaaS website chatbot.

Return only JSON that matches the provided schema. Do not write prose.

You are NOT an assistant answering the visitor. You must never:
- answer a question;
- provide customer, company, product, service, pricing, support, or resource facts;
- infer, correct, validate, select, or invent a person, product, identifier, or candidate term;
- make a retrieval or handoff decision;
- add fields not included in the JSON schema.

Choose exactly one intent using these mandatory rules, in priority order:

1. confirmation_accepted
Use this ONLY when pending_clarification is present AND the visitor clearly confirms
that the verified candidate term is what they meant. Natural language confirmation is
valid, including affirmative wording together with a correction or restatement.

2. confirmation_rejected
Use this ONLY when pending_clarification is present AND the visitor clearly rejects
the verified candidate term.

3. human_request
Use when the visitor asks to speak with, contact, be called by, or receive help from
a human, person, representative, agent, support team, or sales team.

4. resource_question
Use for a factual question that requires verified company resources to answer.
This includes questions about a company, its services, products, people, skills,
pricing, policies, documentation, support, or other factual business information.

5. greeting
Use ONLY when the current message itself is a greeting or greeting-plus-social opener,
and it contains no factual company-resource question.
A greeting is an opening salutation such as hello, hi, good morning, good afternoon,
good evening, or good day.

6. unclear
Use for everything else, including acknowledgments, thanks, status replies, short
social follow-ups, incomplete text, and ambiguous messages.

Critical greeting restrictions:
- Do NOT classify a message as greeting merely because it is polite or conversational.
- Acknowledgments and social follow-ups are ALWAYS unclear, not greeting.
- Status replies such as being well, being fine, being okay, or being good are unclear.
- Thanks, appreciation, agreement, acknowledgments, and short replies are unclear.
- A message that asks how the assistant is without an actual greeting is unclear.

Critical pending-clarification restrictions:
- If pending_clarification is absent, confirmation_accepted and confirmation_rejected
  are forbidden. Use unclear, greeting, human_request, or resource_question instead.
- The pending candidate is verified context only. Do not decide whether it is factually
  correct beyond classifying whether the visitor accepts or rejects it.

When uncertain, choose unclear.
""".strip()

    payload = {
        "message": message,
        "pending_clarification": pending_context,
    }

    try:
        client = AsyncOpenAI(api_key=openai_key)

        response = await client.chat.completions.create(
            model=model,
            temperature=0,
            max_tokens=30,
            response_format={
                "type": "json_schema",
                "json_schema": schema,
            },
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": json.dumps(payload, ensure_ascii=False),
                },
            ],
        )

        content = response.choices[0].message.content or ""
        intent = json.loads(content).get("intent")

        allowed_intents = {
            "greeting",
            "resource_question",
            "confirmation_accepted",
            "confirmation_rejected",
            "human_request",
            "unclear",
        }

        if intent in allowed_intents:
            return intent

    except (OpenAIError, ValueError, json.JSONDecodeError, KeyError, IndexError):
        pass

    # Fail closed. A classifier problem must never authorize a factual answer.
    return "unclear"


def extract_candidate_terms(message: str) -> list[str]:
    """
    Extract identity-sensitive values only. Extracted terms are subsequently
    verified only against the current tenant's resource-term catalogue.
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

    phone_values = re.findall(r"\+?\d[\d\s().-]{6,}\d", message)
    terms.extend(phone_values)

    identifier_values = re.findall(
        r"\b(?:[A-Z]{2,}[-_]?\d+[A-Z0-9_-]*|\d{5,})\b",
        message,
        flags=re.IGNORECASE,
    )
    terms.extend(identifier_values)

    ignored_title_words = {
        "who",
        "what",
        "when",
        "where",
        "why",
        "how",
        "tell",
        "please",
        "could",
        "would",
        "should",
        "does",
        "your",
        "about",
        "there",
        "this",
        "that",
        "have",
        "need",
        "want",
        "can",
        "the",
    }

    title_case_values = re.findall(
        r"\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2}\b",
        message,
    )
    terms.extend(
        value
        for value in title_case_values
        if normalize_text(value) not in ignored_title_words
    )

    unique_terms: list[str] = []
    seen: set[str] = set()

    for term in terms:
        normalized = normalize_text(term)

        if normalized and normalized not in seen:
            seen.add(normalized)
            unique_terms.append(term)

    return unique_terms[:8]


async def exact_search(
    terms: list[str],
    owner: User,
    db: AsyncSession,
    limit: int = 8,
) -> list[dict]:
    normalized_terms = [
        normalize_text(term)
        for term in terms
        if normalize_text(term)
    ]

    if not normalized_terms:
        return []

    result = await db.execute(
        select(ResourceTerm, Resource.title)
        .join(Resource, Resource.id == ResourceTerm.resource_id)
        .where(ResourceTerm.created_by_id == owner.id)
        .where(ResourceTerm.is_active.is_(True))
        .where(ResourceTerm.normalized_term.in_(normalized_terms))
        .where(Resource.is_active.is_(True))
        .where(Resource.is_indexed.is_(True))
        .limit(limit)
    )

    return [
        {
            "term": resource_term.term,
            "normalized_term": resource_term.normalized_term,
            "resource_id": resource_term.resource_id,
            "chunk_id": resource_term.resource_chunk_id,
            "resource_title": resource_title,
            "resource_type": resource_term.term_type,
            "content": resource_term.source_text,
        }
        for resource_term, resource_title in result.all()
    ]


def pick_unverified_term(
    terms: list[str],
    exact_matches: list[dict],
) -> str | None:
    matched_terms = {
        match["normalized_term"]
        for match in exact_matches
    }

    for term in terms:
        if normalize_text(term) not in matched_terms:
            return term

    return None


async def find_close_candidate(
    requested_term: str,
    owner: User,
    db: AsyncSession,
) -> dict | None:
    """
    Similarity can only suggest a clarification; it never authorizes an answer.
    """
    normalized_requested_term = normalize_text(requested_term)

    if len(normalized_requested_term) < 3:
        return None

    similarity_score = func.similarity(
        ResourceTerm.normalized_term,
        normalized_requested_term,
    )

    result = await db.execute(
        select(
            ResourceTerm,
            Resource.title.label("resource_title"),
            similarity_score.label("score"),
        )
        .join(Resource, Resource.id == ResourceTerm.resource_id)
        .where(ResourceTerm.created_by_id == owner.id)
        .where(ResourceTerm.is_active.is_(True))
        .where(ResourceTerm.normalized_term != normalized_requested_term)
        .where(Resource.is_active.is_(True))
        .where(Resource.is_indexed.is_(True))
        .where(similarity_score >= 0.30)
        .order_by(similarity_score.desc())
        .limit(20)
    )

    candidates_by_term: dict[str, dict] = {}

    for resource_term, resource_title, score in result.all():
        if resource_term.normalized_term in candidates_by_term:
            continue

        candidates_by_term[resource_term.normalized_term] = {
            "term": resource_term.term,
            "resource_id": resource_term.resource_id,
            "chunk_id": resource_term.resource_chunk_id,
            "resource_title": resource_title,
            "score": float(score),
        }

    candidates = list(candidates_by_term.values())

    return candidates[0] if len(candidates) == 1 else None


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
                "similarity_score": candidate["score"],
            },
            expires_at=datetime.utcnow() + timedelta(minutes=10),
        )
    )


async def resolve_pending_clarification(
    intent: ClassifierIntent,
    pending: ConversationPendingAction,
) -> PreRagDecision | None:
    if intent == "confirmation_accepted":
        pending.status = CONFIRMED_STATUS
        pending.resolved_at = datetime.utcnow()

        corrected_query = re.sub(
            re.escape(pending.uncertain_term),
            pending.candidate_term,
            pending.original_user_text,
            count=1,
            flags=re.IGNORECASE,
        )

        return PreRagDecision(
            action=ANSWER,
            retrieval_query=corrected_query,
            candidate_term=pending.candidate_term,
            intent=intent,
        )

    if intent == "confirmation_rejected":
        pending.status = REJECTED_STATUS
        pending.resolved_at = datetime.utcnow()

        return PreRagDecision(
            action=NOT_FOUND,
            message=(
                f"I do not have information about {pending.uncertain_term}. "
                "Please provide the spelling or a little more context."
            ),
            intent=intent,
        )

    if intent == "resource_question":
        pending.status = CANCELLED_STATUS
        pending.resolved_at = datetime.utcnow()

    return None


async def decide_pre_rag_action(
    message: str,
    conversation: ChatConversation,
    api_key: ApiKey,
    owner: User,
    db: AsyncSession,
    openai_key: str,
    model: str,
) -> PreRagDecision:
    pending = await get_pending_action(conversation, api_key, db)

    intent = await classify_visitor_message(
        message=message,
        pending=pending,
        openai_key=openai_key,
        model=model,
    )

    if pending:
        pending_decision = await resolve_pending_clarification(intent, pending)

        if pending_decision:
            return pending_decision

        if intent == "unclear":
            return PreRagDecision(
                action=CLARIFY,
                message=(
                    f"Please confirm whether you meant {pending.candidate_term}, "
                    "or provide the correct spelling."
                ),
                candidate_term=pending.candidate_term,
                intent=intent,
            )

    if intent == "greeting":
        return PreRagDecision(
            action=ANSWER,
            message=GREETING_MESSAGE,
            intent=intent,
        )

    if intent == "human_request":
        return PreRagDecision(
            action=HANDOFF,
            message=(
                "I can help arrange a follow-up. "
                "Please share your email address and a team member can contact you."
            ),
            intent=intent,
        )

    if intent == "unclear":
        return PreRagDecision(
            action=ANSWER,
            message=GENERIC_FOLLOW_UP_MESSAGE,
            intent=intent,
        )

    if intent != "resource_question":
        return PreRagDecision(
            action=NOT_FOUND,
            message="I do not have enough information to answer that.",
            intent=intent,
        )

    terms = extract_candidate_terms(message)
    exact_matches = await exact_search(
        terms=terms,
        owner=owner,
        db=db,
    )

    unverified_term = pick_unverified_term(terms, exact_matches)

    if unverified_term:
        candidate = await find_close_candidate(
            requested_term=unverified_term,
            owner=owner,
            db=db,
        )

        if candidate:
            await save_pending_clarification(
                conversation=conversation,
                api_key=api_key,
                owner=owner,
                original_user_text=message,
                uncertain_term=unverified_term,
                candidate=candidate,
                db=db,
            )

            return PreRagDecision(
                action=CLARIFY,
                message=(
                    f"I do not have information about {unverified_term}. "
                    f"Did you mean {candidate['term']}?"
                ),
                candidate_term=candidate["term"],
                intent=intent,
            )

        return PreRagDecision(
            action=NOT_FOUND,
            message=(
                f"I do not have verified information about {unverified_term}. "
                "Please check the spelling or provide more context."
            ),
            intent=intent,
        )

    return PreRagDecision(
        action=ANSWER,
        retrieval_query=message,
        evidence=exact_matches,
        intent=intent,
    )


def apply_semantic_policy(
    decision: PreRagDecision,
    semantic_matches: list[dict],
) -> PreRagDecision:
    """
    Deterministic final policy after tenant-scoped vector retrieval.
    """
    if decision.action != ANSWER or not decision.retrieval_query:
        return decision

    if not semantic_matches:
        return PreRagDecision(
            action=NOT_FOUND,
            message="I do not have enough information in the available resources to answer that.",
            intent=decision.intent,
        )

    best_score = max(float(match.get("score", 0)) for match in semantic_matches)

    if best_score < 0.70:
        return PreRagDecision(
            action=NOT_FOUND,
            message="I do not have enough information in the available resources to answer that.",
            intent=decision.intent,
        )

    return decision