import asyncio

from app.seeders.user_seeder import seed_users


async def run_seeders():
    await seed_users()


asyncio.run(run_seeders())