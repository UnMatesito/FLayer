import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user, get_verified_user
from backend.config import settings
from backend.database import get_db
from backend.models.otp_code import OtpCode
from backend.models.user import User
from backend.schemas.auth import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    OtpSendResponse,
    OtpVerifyRequest,
    OtpVerifyResponse,
    ProfileUpdate,
    RegisterRequest,
    RegisterResponse,
    UserResponse,
)
from backend.services import storage_service
from backend.services.email_service import email_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

OTP_EXPIRE_MINUTES = 10
COOKIE_KEY = "access_token"


def _user_response(user: User) -> UserResponse:
    logo_url = storage_service.get_file_url(user.logo_path) if user.logo_path else None
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        business_name=user.business_name,
        primary_color=user.primary_color,
        logo_url=logo_url,
        currency=user.currency,
    )


def _create_token(user: User, otp_verified: bool = False) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "otp_verified": otp_verified,
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def _set_token_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_KEY,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.jwt_expire_minutes * 60,
        path="/api",
    )


def _clear_token_cookie(response: Response) -> None:
    response.set_cookie(
        key=COOKIE_KEY,
        value="",
        httponly=True,
        samesite="lax",
        max_age=0,
        path="/api",
    )


async def _create_and_send_otp(user: User, db: AsyncSession) -> str:
    code = f"{secrets.randbelow(1000000):06d}"
    otp = OtpCode(
        user_id=user.id,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
    )
    db.add(otp)
    await db.flush()
    await email_service.send_otp(user.email, code)
    return code


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None or not bcrypt.checkpw(body.password.encode(), user.hashed_password.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = _create_token(user, otp_verified=False)
    _set_token_cookie(response, token)

    await _create_and_send_otp(user, db)
    await db.commit()

    return LoginResponse(
        user=_user_response(user),
        otp_required=True,
    )


@router.post("/otp/send", response_model=OtpSendResponse)
async def send_otp(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OtpSendResponse:
    await _create_and_send_otp(current_user, db)
    await db.commit()
    return OtpSendResponse()


@router.post("/otp/verify", response_model=OtpVerifyResponse)
async def verify_otp(
    body: OtpVerifyRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OtpVerifyResponse:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(OtpCode).where(
            OtpCode.user_id == current_user.id,
            OtpCode.code == body.code,
            OtpCode.used_at.is_(None),
            OtpCode.expires_at > now,
        ).order_by(OtpCode.created_at.desc())
    )
    otp = result.scalar_one_or_none()
    if otp is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP code",
        )

    otp.used_at = now
    await db.flush()

    token = _create_token(current_user, otp_verified=True)
    _set_token_cookie(response, token)
    await db.commit()

    return OtpVerifyResponse()


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_verified_user),
) -> UserResponse:
    return _user_response(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: ProfileUpdate,
    current_user: User = Depends(get_verified_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    data = body.model_dump(exclude_unset=True)
    if "name" in data:
        current_user.name = data["name"]
    if "business_name" in data:
        current_user.business_name = data["business_name"]
    if "primary_color" in data:
        current_user.primary_color = data["primary_color"]
    if "currency" in data:
        current_user.currency = data["currency"]
    await db.commit()
    await db.refresh(current_user)
    return _user_response(current_user)


@router.post("/me/logo", response_model=UserResponse)
async def upload_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_verified_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    try:
        storage_service.validate_image(file)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))

    if current_user.logo_path:
        storage_service.delete_file(current_user.logo_path)

    path = await storage_service.save_logo(file, current_user.id)
    current_user.logo_path = path
    await db.commit()
    await db.refresh(current_user)
    return _user_response(current_user)


@router.delete("/me/logo", response_model=UserResponse)
async def delete_logo(
    current_user: User = Depends(get_verified_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    if current_user.logo_path:
        storage_service.delete_file(current_user.logo_path)
        current_user.logo_path = None
        await db.commit()
        await db.refresh(current_user)
    return _user_response(current_user)


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_verified_user),
) -> RegisterResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Email already registered",
        )

    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = User(
        email=body.email,
        name=body.name,
        hashed_password=hashed,
        primary_color=body.primary_color,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return RegisterResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        primary_color=user.primary_color,
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LogoutResponse:
    _clear_token_cookie(response)
    return LogoutResponse()
