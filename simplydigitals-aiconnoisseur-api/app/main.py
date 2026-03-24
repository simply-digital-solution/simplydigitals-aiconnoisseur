"""FastAPI application factory — modular monolith edition.

Each domain (auth, datasets, models, analytics) is a self-contained
module under app/modules/. This file assembles them and applies
shared cross-cutting concerns: CORS, security headers, rate limiting,
Prometheus metrics, and health check.

Adding a new module:
    1. Create app/modules/<name>/ with models, schemas, service, router
    2. Import the router here and call app.include_router()
    3. Import the ORM models in _import_module_models() so Alembic finds them
    4. Done — no other files need touching
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.shared.config import get_settings
from app.shared.database import engine
from app.shared.logging import configure_logging, get_logger

# ── Module routers ────────────────────────────────────────────────────────────
from app.modules.analytics.router import router as analytics_router
from app.modules.auth.router import router as auth_router
from app.modules.datasets.router import router as datasets_router
from app.modules.models.router import router as models_router

settings = get_settings()
logger = get_logger(__name__)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
)


def _import_module_models() -> None:
    """Import all ORM models so Alembic metadata discovers every table.

    This must run before Base.metadata.create_all() or alembic upgrade.
    Add a new import here whenever a new module introduces ORM models.
    """
    import app.modules.auth.models  # noqa: F401
    import app.modules.datasets.models  # noqa: F401
    import app.modules.models.models  # noqa: F401
    # analytics has no ORM models — it is read-only


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:  # noqa: ARG001
    configure_logging()
    _import_module_models()
    logger.info("startup", environment=settings.ENVIRONMENT, version=settings.APP_VERSION)

    # Auto-create tables for SQLite dev/test.
    # In production always use: alembic upgrade head
    if not settings.is_production:
        from app.shared.base import Base

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    yield

    logger.info("shutdown")
    await engine.dispose()


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "AI Connoisseur — production-grade ML analytics platform by Simply Digital Solutions. "
            "Authenticate via POST /api/v1/auth/login to obtain a JWT bearer token."
        ),
        openapi_url="/openapi.json" if not settings.is_production else None,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Rate limiter ──────────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(  # type: ignore[arg-type]
        RateLimitExceeded, _rate_limit_exceeded_handler
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_HOSTS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── i18n — echo resolved locale back to client ──────────────────────────────
    @app.middleware("http")
    async def content_language_header(request: Request, call_next):  # type: ignore[no-untyped-def]
        from app.shared.i18n.translator import get_locale

        response = await call_next(request)
        response.headers["Content-Language"] = get_locale(request)
        return response

    # ── OWASP security headers ────────────────────────────────────────────────
    @app.middleware("http")
    async def security_headers(request: Request, call_next):  # type: ignore[no-untyped-def]
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        return response

    # ── Validation error handler ──────────────────────────────────────────────
    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:  # noqa: ARG001
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors(), "error_code": "VALIDATION_ERROR"},
        )

    # ── Module routers ────────────────────────────────────────────────────────
    prefix = settings.API_V1_PREFIX  # "/api/v1"
    app.include_router(auth_router, prefix=prefix)
    app.include_router(datasets_router, prefix=prefix)
    app.include_router(models_router, prefix=prefix)
    app.include_router(analytics_router, prefix=prefix)

    # ── Prometheus metrics ────────────────────────────────────────────────────
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"], include_in_schema=False)
    async def health() -> dict[str, str]:
        return {"status": "ok", "version": settings.APP_VERSION}

    return app


app = create_app()

# AWS Lambda handler (Mangum wraps the FastAPI ASGI app)
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except ImportError:
    pass  # mangum not installed in local dev — that is fine
