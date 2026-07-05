from openai import AsyncOpenAI

from app.settings.dbdriver import settings


def get_openai_client(openai_api_key: str) -> AsyncOpenAI:
    if not openai_api_key:
        raise RuntimeError("OpenAI API key is required")

    return AsyncOpenAI(api_key=openai_api_key)


async def create_embedding(text: str, openai_api_key: str) -> list[float]:
    client = get_openai_client(openai_api_key)

    response = await client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=text,
    )

    return response.data[0].embedding


async def create_embeddings(texts: list[str], openai_api_key: str) -> list[list[float]]:
    if not texts:
        return []

    client = get_openai_client(openai_api_key)

    response = await client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=texts,
    )

    return [item.embedding for item in response.data]