"""Legacy shim — re-exports from app.shared.database.

Deprecated: import directly from app.shared.database.
"""

from app.shared.base import Base  # noqa: F401
from app.shared.database import *  # noqa: F401, F403
