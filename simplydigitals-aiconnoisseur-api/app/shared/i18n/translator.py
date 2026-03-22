"""i18n translation engine.

Reads Accept-Language from each HTTP request and returns messages
in the best matching supported locale. Falls back to English.

Usage in a service or router:
    from app.shared.i18n.translator import get_translator
    from fastapi import Request

    async def my_endpoint(request: Request):
        t = get_translator(request)
        raise HTTPException(detail=t("auth.invalid_credentials"))

Supported locales: en, ms, zh, ta
Adding a new locale: drop a new JSON file in locales/ — no code changes needed.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Callable

from fastapi import Request
from app.shared.logging import get_logger

logger = get_logger(__name__)

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "locales")
SUPPORTED_LOCALES = {"en", "ms", "zh", "ta"}
DEFAULT_LOCALE = "en"


@lru_cache(maxsize=None)
def _load_locale(locale: str) -> dict:
    """Load and cache a locale file. Called once per locale per process."""
    path = os.path.join(LOCALES_DIR, f"{locale}.json")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning("locale_file_not_found", locale=locale, path=path)
        return {}
    except json.JSONDecodeError as e:
        logger.error("locale_file_invalid", locale=locale, error=str(e))
        return {}


def _resolve_locale(accept_language: str | None) -> str:
    """Parse Accept-Language header and return best matching locale.

    Examples:
        "ms-MY,ms;q=0.9,en;q=0.8"  → "ms"
        "zh-CN,zh;q=0.9"            → "zh"
        "ta-IN"                      → "ta"
        "fr-FR,fr;q=0.9"            → "en"  (not supported, falls back)
        None                         → "en"
    """
    if not accept_language:
        return DEFAULT_LOCALE

    for part in accept_language.split(","):
        # Strip quality value: "ms;q=0.9" → "ms"
        tag = part.strip().split(";")[0].strip()
        # Try full tag first ("zh-CN"), then language prefix ("zh")
        for candidate in [tag.lower(), tag.split("-")[0].lower()]:
            if candidate in SUPPORTED_LOCALES:
                return candidate

    return DEFAULT_LOCALE


def _translate(locale: str, key: str, **kwargs: str) -> str:
    """Look up a dotted key in the locale dict and interpolate variables.

    Example:
        _translate("en", "datasets.parse_error", detail="unexpected EOF")
        → "Could not parse CSV: unexpected EOF"
    """
    data = _load_locale(locale)
    parts = key.split(".")

    value: dict | str = data
    for part in parts:
        if isinstance(value, dict):
            value = value.get(part, "")
        else:
            value = ""
            break

    if not value:
        # Fall back to English if key missing in requested locale
        if locale != DEFAULT_LOCALE:
            return _translate(DEFAULT_LOCALE, key, **kwargs)
        logger.warning("translation_key_missing", locale=locale, key=key)
        return key  # Return the key itself as last resort

    if kwargs:
        try:
            return str(value).format(**kwargs)
        except KeyError:
            return str(value)

    return str(value)


def get_translator(request: Request) -> Callable[..., str]:
    """FastAPI dependency — returns a translate function bound to the request locale.

    Usage:
        @router.post("/login")
        async def login(request: Request, ...):
            t = get_translator(request)
            raise HTTPException(detail=t("auth.invalid_credentials"))
    """
    accept_language = request.headers.get("Accept-Language")
    locale = _resolve_locale(accept_language)

    def translate(key: str, **kwargs: str) -> str:
        return _translate(locale, key, **kwargs)

    return translate


def get_locale(request: Request) -> str:
    """Return just the resolved locale string (useful for logging)."""
    return _resolve_locale(request.headers.get("Accept-Language"))
