import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from app.database.db import Base
from app.settings.dbdriver import settings

# Import all models so Alembic can detect metadata changes.
from app.models.user_model import User  # noqa: F401
from app.models.user_meta_model import UserMeta  # noqa: F401
from app.models.media_model import Media  # noqa: F401
from app.models.resource_model import Resource  # noqa: F401
from app.models.resource_chunk_model import ResourceChunk  # noqa: F401
from app.models.api_key_model import ApiKey  # noqa: F401
from app.models.widget_install_model import WidgetInstall  # noqa: F401
from app.models.chat_conversation_model import ChatConversation  # noqa: F401
from app.models.chat_message_model import ChatMessage  # noqa: F401

config = context.config

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = settings.DATABASE_URL

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    configuration = config.get_section(config.config_ini_section)

    if configuration is None:
        raise RuntimeError("Alembic configuration section was not found")

    configuration["sqlalchemy.url"] = settings.DATABASE_URL

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()