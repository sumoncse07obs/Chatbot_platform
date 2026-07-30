import re


def normalize_term(value: str) -> str:
    return " ".join(value.lower().strip().split())


def build_source_excerpt(content: str, term: str, radius: int = 180) -> str:
    lower_content = content.lower()
    position = lower_content.find(term.lower())

    if position < 0:
        return content[:500]

    start = max(0, position - radius)
    end = min(len(content), position + len(term) + radius)

    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(content) else ""

    return f"{prefix}{content[start:end].strip()}{suffix}"


def extract_verified_terms(text: str) -> list[dict]:
    """
    Extract only literal values that appear in the uploaded resource text.

    This function never creates aliases or assumes two similar terms are the
    same. It only creates searchable evidence for future exact/candidate lookup.
    """
    candidates: list[tuple[str, str]] = []

    quoted_values = re.findall(r'["“]([^"”]{2,120})["”]', text)
    candidates.extend((value.strip(), "quoted_term") for value in quoted_values)

    email_values = re.findall(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        text,
        flags=re.IGNORECASE,
    )
    candidates.extend((value, "email") for value in email_values)

    phone_values = re.findall(r"\+?\d[\d\s().-]{6,}\d", text)
    candidates.extend((value.strip(), "phone") for value in phone_values)

    identifier_values = re.findall(
        r"\b(?:[A-Z]{2,}[-_]?\d+[A-Z0-9_-]*|\d{5,})\b",
        text,
        flags=re.IGNORECASE,
    )
    candidates.extend((value, "identifier") for value in identifier_values)

    title_case_values = re.findall(
        r"\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3}\b",
        text,
    )
    candidates.extend((value, "named_term") for value in title_case_values)

    results: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for raw_term, term_type in candidates:
        term = " ".join(raw_term.split())
        normalized = normalize_term(term)

        if len(normalized) < 3:
            continue

        key = (normalized, term_type)
        if key in seen:
            continue

        seen.add(key)
        results.append(
            {
                "term": term,
                "normalized_term": normalized,
                "term_type": term_type,
                "source_text": build_source_excerpt(text, term),
            }
        )

    return results[:100]