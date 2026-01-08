"""Resume management API endpoints - migrated from legacy_app.py

NOTE: Resume endpoints have been moved to app/features/resume_management/routes.py
for better feature isolation. This file is kept for backward compatibility.
The router is still registered in main.py but routes are now in the feature module.
"""

# Resume endpoints moved to app/features/resume_management/routes.py
# Import router from feature module for backward compatibility
from app.features.resume_management.routes import router

# Re-export router for backward compatibility with existing imports
__all__ = ["router"]
