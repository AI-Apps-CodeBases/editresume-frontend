"""Collaboration API endpoints - migrated from legacy_app.py

NOTE: Collaboration endpoints have been moved to app/features/collaboration/routes.py
for better feature isolation. This file is kept for backward compatibility.
The router is still registered in main.py but routes are now in the feature module.
"""

# Collaboration endpoints moved to app/features/collaboration/routes.py
# Import router and websocket_collab from feature module for backward compatibility
from app.features.collaboration.routes import router

# Re-export router for backward compatibility with existing imports
__all__ = ["router"]
