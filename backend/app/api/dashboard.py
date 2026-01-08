"""Dashboard API endpoints - Real data from PostgreSQL.

NOTE: Dashboard endpoints have been moved to app/features/dashboard/routes.py
for better feature isolation. This file is kept for backward compatibility.
The router is still registered in main.py but routes are now in the feature module.
"""

# Dashboard endpoints moved to app/features/dashboard/routes.py
# Import router from feature module for backward compatibility
from app.features.dashboard.routes import router

# Re-export router for backward compatibility with existing imports
__all__ = ["router"]
