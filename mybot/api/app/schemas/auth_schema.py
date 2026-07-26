from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: EmailStr
    password: str
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    new_password: str


class AdminChangePasswordRequest(BaseModel):
    new_password: str


class AdminChangeRoleRequest(BaseModel):
    role: str


class UserResponse(BaseModel):
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    avatar: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    address: Optional[str] = None
    company_name: Optional[str] = None
    website: Optional[str] = None
    bio: Optional[str] = None

    system_prompt: Optional[str] = None
    openai_api_key: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

    avatar: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    address: Optional[str] = None
    company_name: Optional[str] = None
    website: Optional[str] = None
    bio: Optional[str] = None

    system_prompt: Optional[str] = None
    openai_api_key: Optional[str] = None


class AdminUserListResponse(BaseModel):
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class AdminUserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    system_prompt: Optional[str] = None
    openai_api_key: Optional[str] = None


class AdminUserCreateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: str = "user"
    is_active: bool = True