from sqlalchemy import select

from app.database.db import AsyncSessionLocal
from app.models.user_model import User
from app.services.auth_service import hash_password


async def seed_users():
    async with AsyncSessionLocal() as db:

        users = [
            {
                "first_name": "Admin",
                "email": "admin@obs.com",
                "password": hash_password("obs@1234#"),
                "role": "admin",
            },
            {
                "first_name": "Customer",
                "email": "customer@obs.com",
                "password": hash_password("customer@1234#"),
                "role": "customer",
            },
            {
                "first_name": "User",
                "email": "user@obs.com",
                "password": hash_password("user@1234#"),
                "role": "user",
            },
        ]

        for user_data in users:

            result = await db.execute(
                select(User).where(User.email == user_data["email"])
            )

            existing_user = result.scalar_one_or_none()

            if not existing_user:
                user = User(
                    first_name=user_data["first_name"],
                    email=user_data["email"],
                    password=user_data["password"],
                    role=user_data["role"],
                    is_active=True,
                )

                db.add(user)

        await db.commit()

        print("Users seeded successfully")