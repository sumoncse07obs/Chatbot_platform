import logging
import json
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
MIN_SEMANTIC_SCORE = 0.35

GROUNDED_RESPONSE = "grounded"
CONVERSATION_RESPONSE = "conversation"
CLARIFICATION_RESPONSE = "clarification"
NOT_FOUND_RESPONSE = "not_found"
HANDOFF_RESPONSE = "handoff"


ClassifierIntent = Literal[
    "greeting",
    "agent_capability",
    "project_interest",
    "resource_question",
    "human_request",
    "security_request",
    "out_of_scope",
    "confirmation_accepted",
    "confirmation_rejected",
    "unclear",
]

@dataclass
class ClassifierResult:
    intent: ClassifierIntent


@dataclass
class PreRagDecision:
    action: str
    response_mode: str
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
) -> ClassifierResult:
    """
    Classifies intent only.

    This model call never writes a visitor-facing answer. It cannot retrieve,
    validate, correct, or invent company facts. Deterministic backend code
    remains responsible for tenant scope, term matching, pending state, and
    final ANSWER / CLARIFY / NOT_FOUND / HANDOFF policy.
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
                        "agent_capability",
                        "project_interest",
                        "resource_question",
                        "human_request",
                        "security_request",
                        "out_of_scope",
                        "confirmation_accepted",
                        "confirmation_rejected",
                        "unclear",
                    ],
                }
            },
            "required": ["intent"],
            "additionalProperties": False,
        },
    }

    system_prompt = """
You are a strict JSON intent classifier for a SaaS website chat.

Return JSON only, exactly matching the supplied schema. Never write visitor-facing
prose, answers, suggestions, or explanations.

You must never provide, infer, validate, correct, select, or invent company facts,
customer facts, services, products, pricing, policies, names, contact information,
or resource content.

Choose exactly one intent:

- confirmation_accepted:
  Use only when pending clarification exists and the visitor clearly confirms the
  verified candidate term.

- confirmation_rejected:
  Use only when pending clarification exists and the visitor clearly and directly
  rejects the verified candidate term.

- human_request:
  The visitor asks to speak with, contact, or receive help from a human, person,
  representative, sales team, or support team.

- agent_capability:
  The visitor asks what the chatbot can do, how it works, how to use it,
  what they can ask, or asks for general help using the assistant.

- project_interest:
  The visitor expresses interest in starting, discussing, buying, planning,
  comparing, or getting help with a business project, AI project, chatbot,
  automation, integration, website, dashboard, or other service.

- security_request:
  The visitor asks for system prompts, API keys, passwords, tokens, private
  data, database information, internal instructions, hidden configuration,
  or implementation secrets.

- out_of_scope:
  The visitor asks for information unrelated to the business and available
  resources, such as live weather, cryptocurrency prices, sports predictions,
  general trivia, or unrelated personal advice.

- resource_question:
  The visitor asks for factual information about the company, services, products,
  people, skills, technologies, pricing, support, documentation, or resources.
  Use this for informal, abbreviated, lower-case, or rephrased factual questions.

- greeting:
  The current message itself is an opening social greeting with no factual question.

- unclear:
  Everything else, including acknowledgments, thanks, status replies,
  incomplete text, ambiguous messages, and references with no clear subject.
  Do not use unclear when one of the other categories fits.

Pending clarification rules:
- If pending clarification is absent, confirmation_accepted and
  confirmation_rejected are forbidden.
- A new or rephrased factual question is resource_question even when a pending
  clarification exists.
- Do not treat a new factual question as rejection only because it does not confirm
  the current candidate.
- When uncertain, choose unclear.
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
            "agent_capability",
            "project_interest",
            "resource_question",
            "human_request",
            "security_request",
            "out_of_scope",
            "confirmation_accepted",
            "confirmation_rejected",
            "unclear",
        }

        if intent not in allowed_intents:
            raise ValueError("Classifier returned an unsupported intent.")

        logger.info(
            "Agent intent classifier selected intent=%s for message=%r",
            intent,
            message[:200],
        )

        if not pending and intent in {
            "confirmation_accepted",
            "confirmation_rejected",
        }:
            return ClassifierResult(intent="unclear")

        return ClassifierResult(intent=intent)

    except (OpenAIError, ValueError, json.JSONDecodeError, KeyError, IndexError):
        logger.exception(
            "Agent intent classifier failed for message=%r",
            message[:200],
        )
        return ClassifierResult(intent="unclear")


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
    Suggest one verified tenant term only when it is the clear best fuzzy match.

    The function never authorizes an answer. It only returns a safe clarification
    candidate from the current tenant's indexed resource terms.
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
        normalized_term = resource_term.normalized_term

        if normalized_term in candidates_by_term:
            continue

        candidates_by_term[normalized_term] = {
            "term": resource_term.term,
            "resource_id": resource_term.resource_id,
            "chunk_id": resource_term.resource_chunk_id,
            "resource_title": resource_title,
            "score": float(score),
        }

    candidates = list(candidates_by_term.values())

    if not candidates:
        return None

    best_candidate = candidates[0]

    # A close runner-up means the system cannot safely select one term.
    if len(candidates) > 1:
        second_best_candidate = candidates[1]
        score_gap = best_candidate["score"] - second_best_candidate["score"]

        if score_gap < 0.08:
            return None

    return best_candidate

    
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
            response_mode=GROUNDED_RESPONSE,
            retrieval_query=corrected_query,
            candidate_term=pending.candidate_term,
            intent=intent,
        )

    if intent == "confirmation_rejected":
        pending.status = REJECTED_STATUS
        pending.resolved_at = datetime.utcnow()

        return PreRagDecision(
            action=NOT_FOUND,
            response_mode=NOT_FOUND_RESPONSE,
            candidate_term=pending.candidate_term,
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
    """
    Decide how to handle a visitor message.

    Important policy:
    - Never require an exact keyword or resource-term match before retrieval.
    - Every factual question is sent to tenant-scoped semantic retrieval.
    - Vector-search relevance decides whether the answer is grounded or unavailable.
    - The classifier is used only for conversation, handoff, and pending clarification.
    """

    pending = await get_pending_action(conversation, api_key, db)

    try:
        classifier_result = await classify_visitor_message(
            message=message,
            pending=pending,
            openai_key=openai_key,
            model=model,
        )
        intent = classifier_result.intent
    except (OpenAIError, ValueError, json.JSONDecodeError):
        # If classification is unavailable, continue with semantic retrieval.
        # A classifier outage must never make the chatbot unable to answer.
        intent = "resource_question"

    if pending:
        pending_decision = await resolve_pending_clarification(intent, pending)

        if pending_decision:
            return pending_decision

        if intent == "unclear":
            return PreRagDecision(
                action=CLARIFY,
                response_mode=CLARIFICATION_RESPONSE,
                candidate_term=pending.candidate_term,
                intent=intent,
            )

    if intent == "greeting":
        return PreRagDecision(
            action=ANSWER,
            response_mode=CONVERSATION_RESPONSE,
            retrieval_query=message,
            intent=intent,
        )

    if intent == "human_request":
        return PreRagDecision(
            action=HANDOFF,
            response_mode=HANDOFF_RESPONSE,
            retrieval_query=message,
            intent=intent,
        )

    if intent in {
        "agent_capability",
        "project_interest",
        "security_request",
        "out_of_scope",
    }:
        return PreRagDecision(
            action=ANSWER,
            response_mode=intent,
            retrieval_query=message,
            intent=intent,
        )

    if intent == "unclear":
        return PreRagDecision(
            action=ANSWER,
            response_mode=CONVERSATION_RESPONSE,
            retrieval_query=message,
            intent=intent,
        )

    # All factual questions use semantic retrieval.
    # Do not check exact terms, keywords, spelling, or resource-term catalogue first.
    return PreRagDecision(
        action=ANSWER,
        response_mode=GROUNDED_RESPONSE,
        retrieval_query=message,
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
            response_mode=NOT_FOUND_RESPONSE,
            intent=decision.intent,
        )

    best_score = max(float(match.get("score", 0)) for match in semantic_matches)

    if best_score < MIN_SEMANTIC_SCORE:
        return PreRagDecision(
            action=NOT_FOUND,
            response_mode=NOT_FOUND_RESPONSE,
            intent=decision.intent,
        )

    return decision