import re


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def split_text_into_chunks(
    text: str,
    chunk_size: int = 900,
    overlap: int = 150,
) -> list[str]:
    normalized = normalize_text(text)

    if not normalized:
        return []

    chunks: list[str] = []
    start = 0

    while start < len(normalized):
        end = start + chunk_size
        chunk = normalized[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(normalized):
            break

        start = max(end - overlap, start + 1)

    return chunks


def estimate_token_count(text: str) -> int:
    return max(1, len(text) // 4)