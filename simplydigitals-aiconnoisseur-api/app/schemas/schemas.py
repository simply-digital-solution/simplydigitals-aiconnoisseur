"""Legacy shim — all schemas have moved to app/modules/*/schemas.py.

Deprecated: import from the relevant module directly.
"""
from app.modules.auth.schemas import (        # noqa: F401
    FacebookLoginRequest,
    GoogleLoginRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserRead,
)
from app.modules.datasets.schemas import (    # noqa: F401
    DatasetCreate,
    DatasetProfile,
    DatasetRead,
)
from app.modules.models.schemas import (      # noqa: F401
    ModelRead,
    PredictRequest,
    TrainRequest,
)
from app.modules.analytics.schemas import (   # noqa: F401
    AnalyticsRequest,
    CorrelationResponse,
    ForecastRequest,
    ForecastResponse,
)
