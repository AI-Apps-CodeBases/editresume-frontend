"""Job description API endpoints - migrated from legacy_app.py

NOTE: Job endpoints have been moved to app/features/job_management/routes.py
for better feature isolation. This file is kept for backward compatibility.
The router is still registered in main.py but routes are now in the feature module.
"""

# Job endpoints moved to app/features/job_management/routes.py
# Import router from feature module for backward compatibility
from app.features.job_management.routes import router

# All endpoint definitions have been moved to features/job_management/routes.py
# This file now re-exports the router for backward compatibility
