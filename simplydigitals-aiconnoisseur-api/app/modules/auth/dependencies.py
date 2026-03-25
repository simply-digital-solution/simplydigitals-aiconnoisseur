"""Auth module — FastAPI dependencies.

get_current_user is imported by datasets, models, and analytics routers.
It is the only cross-module dependency — and it is intentionally kept
in the auth module so the contract is clear.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.modules.auth.service import UserService
from app.shared.database import get_db
from app.shared.security import decode_token

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.modules.auth.models import User

bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate JWT and return the authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
        user_id: str = payload["sub"]
    except (JWTError, KeyError) as exc:
        raise credentials_exception from exc

    user = await UserService(db).get_by_id(user_id)
    if not user or not user.is_active:
        raise credentials_exception
    return user
