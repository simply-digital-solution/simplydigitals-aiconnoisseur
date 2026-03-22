"""Auth module — OAuth provider verification with i18n."""

from __future__ import annotations

import hashlib
import hmac
from typing import Callable

import httpx
from fastapi import HTTPException, status

from app.modules.auth.service import OAuthProfile
from app.shared.config import get_settings
from app.shared.logging import get_logger

logger = get_logger(__name__)


async def verify_google_token(
    id_token: str,
    t: Callable[..., str] = lambda k, **kw: k,
) -> OAuthProfile:
    settings = get_settings()
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(url)
        except httpx.RequestError as exc:
            logger.error("google_token_verify_network_error", error=str(exc))
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=t("auth.google_unavailable")) from exc
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("auth.google_token_invalid"))
    data = resp.json()
    if settings.GOOGLE_CLIENT_ID and data.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("auth.google_audience_mismatch"))
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("auth.google_no_email"))
    return OAuthProfile(
        provider_id=data["sub"],
        email=email,
        full_name=data.get("name") or data.get("given_name", "Google User"),
        avatar_url=data.get("picture"),
    )


async def verify_facebook_token(
    access_token: str,
    t: Callable[..., str] = lambda k, **kw: k,
) -> OAuthProfile:
    settings = get_settings()
    if not settings.FACEBOOK_APP_ID or not settings.FACEBOOK_APP_SECRET:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=t("auth.facebook_not_configured"))
    app_token = f"{settings.FACEBOOK_APP_ID}|{settings.FACEBOOK_APP_SECRET}"
    debug_url = f"https://graph.facebook.com/debug_token?input_token={access_token}&access_token={app_token}"
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            debug_resp = await client.get(debug_url)
        except httpx.RequestError as exc:
            logger.error("facebook_token_verify_network_error", error=str(exc))
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=t("auth.facebook_unavailable")) from exc
    if debug_resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("auth.facebook_token_invalid"))
    debug_data = debug_resp.json().get("data", {})
    if not debug_data.get("is_valid"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("auth.facebook_token_invalid"))
    if debug_data.get("app_id") != settings.FACEBOOK_APP_ID:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("auth.facebook_wrong_app"))
    proof = hmac.new(settings.FACEBOOK_APP_SECRET.encode(), access_token.encode(), hashlib.sha256).hexdigest()
    me_url = f"https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token={access_token}&appsecret_proof={proof}"
    async with httpx.AsyncClient(timeout=10) as client:
        me_resp = await client.get(me_url)
    me = me_resp.json()
    email = me.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("auth.facebook_no_email"))
    pic = me.get("picture", {}).get("data", {})
    avatar_url = pic.get("url") if pic and not pic.get("is_silhouette") else None
    return OAuthProfile(
        provider_id=me["id"],
        email=email,
        full_name=me.get("name", "Facebook User"),
        avatar_url=avatar_url,
    )
