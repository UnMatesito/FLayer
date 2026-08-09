import re
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _validate_hex_color(v: str | None) -> str | None:
    if v is None:
        return None
    if not HEX_COLOR_PATTERN.match(v):
        raise ValueError("primary_color must be a #RRGGBB hex string")
    return v.upper()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OtpVerifyRequest(BaseModel):
    code: str


class OtpSendRequest(BaseModel):
    pass


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str
    primary_color: str | None = None

    @field_validator("primary_color")
    @classmethod
    def valid_primary_color(cls, v: str | None) -> str | None:
        return _validate_hex_color(v)


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    primary_color: str | None = None
    logo_url: str | None = None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    name: str | None = None
    primary_color: str | None = None

    model_config = {"extra": "forbid"}

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        if not stripped:
            raise ValueError("Name must not be empty")
        if len(stripped) > 255:
            raise ValueError("Name must be at most 255 characters")
        return stripped

    @field_validator("primary_color")
    @classmethod
    def valid_primary_color(cls, v: str | None) -> str | None:
        return _validate_hex_color(v)


class LoginResponse(BaseModel):
    user: UserResponse
    otp_required: bool


class OtpVerifyResponse(BaseModel):
    detail: str = "OTP verified"


class OtpSendResponse(BaseModel):
    detail: str = "OTP sent"


class RegisterResponse(BaseModel):
    id: UUID
    email: str
    name: str
    primary_color: str | None = None


class LogoutResponse(BaseModel):
    detail: str = "Logged out"


class DetailResponse(BaseModel):
    detail: str
