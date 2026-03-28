"""Auth module — API router with i18n support."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import AuthProvider, User
from app.modules.auth.oauth import verify_facebook_token, verify_google_token
from app.modules.auth.schemas import (
    FacebookLoginRequest,
    GoogleLoginRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserRead,
)
from app.modules.auth.service import UserService
from app.shared.database import get_db
from app.shared.i18n.translator import get_translator
from app.shared.logging import get_logger
from app.shared.security import create_access_token, create_refresh_token, decode_token

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    t = get_translator(request)
    user = await UserService(db).create(payload, t)
    return UserRead.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    t = get_translator(request)
    user = await UserService(db).authenticate(payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=t("auth.invalid_credentials"),
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=t("auth.account_disabled"),
        )
    logger.info("user_login", user_id=user.id, provider="local")
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    payload: RefreshRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    t = get_translator(request)
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=t("auth.invalid_refresh_token"),
        ) from exc
    user = await UserService(db).get_by_id(claims["sub"])
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=t("auth.user_not_found"),
        )
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/google", response_model=TokenResponse)
async def google_login(
    payload: GoogleLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    t = get_translator(request)
    profile = await verify_google_token(payload.id_token, t)
    user = await UserService(db).get_or_create_oauth_user(profile, AuthProvider.GOOGLE)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=t("auth.account_disabled"),
        )
    logger.info("user_login", user_id=user.id, provider="google")
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/facebook", response_model=TokenResponse)
async def facebook_login(
    payload: FacebookLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    t = get_translator(request)
    profile = await verify_facebook_token(payload.access_token, t)
    user = await UserService(db).get_or_create_oauth_user(profile, AuthProvider.FACEBOOK)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=t("auth.account_disabled"),
        )
    logger.info("user_login", user_id=user.id, provider="facebook")
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )
