"""User management API endpoints.

NOTE: User endpoints have been moved to app/features/user_management/routes.py
for better feature isolation. This file is kept for backward compatibility.
The router is still registered in main.py but routes are now in the feature module.
"""

# User endpoints moved to app/features/user_management/routes.py
# Import router from feature module for backward compatibility
from app.features.user_management.routes import router

# All endpoint definitions have been moved to features/user_management/routes.py
# This file now re-exports the router for backward compatibility
