"""Legacy shim — all models have moved to app/modules/*/models.py.

Deprecated: import from the relevant module directly.
"""
from app.modules.auth.models import AuthProvider, User  # noqa: F401
from app.modules.datasets.models import Dataset          # noqa: F401
from app.modules.models.models import (                  # noqa: F401
    AlgorithmType,
    MLModel,
    ModelStatus,
)
