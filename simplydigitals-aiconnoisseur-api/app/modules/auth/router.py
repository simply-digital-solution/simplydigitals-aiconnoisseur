"""Auth module — API router.

Routes: /auth/register, /auth/login, /auth/refresh, /auth/google, /auth/facebook
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AuthProvider
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
from app.shared.logging import get_logger
from app.shared.security import create_access_token, create_refresh_token, decode_token

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> UserRead:
    """Register a new user with email and password."""
    user = await UserService(db).create(payload)
    return UserRead.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Authenticate with email and password."""
    user = await UserService(db).authenticate(payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    logger.info("user_login", user_id=user.id, provider="local")
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Exchange a refresh token for a new token pair."""
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from exc
    user = await UserService(db).get_by_id(claims["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/google", response_model=TokenResponse)
async def google_login(
    payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Authenticate via Google ID token."""
    profile = await verify_google_token(payload.id_token)
    user = await UserService(db).get_or_create_oauth_user(profile, AuthProvider.GOOGLE)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    logger.info("user_login", user_id=user.id, provider="google")
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/facebook", response_model=TokenResponse)
async def facebook_login(
    payload: FacebookLoginRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Authenticate via Facebook access token."""
    profile = await verify_facebook_token(payload.access_token)
    user = await UserService(db).get_or_create_oauth_user(profile, AuthProvider.FACEBOOK)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    logger.info("user_login", user_id=user.id, provider="facebook")
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )
