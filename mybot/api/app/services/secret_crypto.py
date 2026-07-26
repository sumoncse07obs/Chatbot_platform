from cryptography.fernet import Fernet, InvalidToken

from app.settings.dbdriver import settings


def _fernet() -> Fernet:
    return Fernet(settings.OPENAI_KEY_ENCRYPTION_SECRET.encode("utf-8"))


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_secret(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        raise ValueError("Stored secret could not be decrypted")


def mask_secret(value: str | None) -> str | None:
    if not value:
        return None

    return "configured"