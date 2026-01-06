"""Analytics API endpoints - migrated from legacy_app.py

NOTE: Analytics endpoints have been moved to app/features/analytics/routes.py
for better feature isolation. This file is kept for backward compatibility.
The router is still registered in main.py but routes are now in the feature module.
"""

# Analytics endpoints moved to app/features/analytics/routes.py
# Import router from feature module for backward compatibility
from app.features.analytics.routes import router

# All endpoint definitions have been moved to features/analytics/routes.py
# This file now re-exports the router for backward compatibility
