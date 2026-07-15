from uuid import UUID

from pydantic import BaseModel, EmailStr


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


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str

    model_config = {"from_attributes": True}


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


class LogoutResponse(BaseModel):
    detail: str = "Logged out"


class DetailResponse(BaseModel):
    detail: str
