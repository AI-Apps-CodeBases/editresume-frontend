"""AI-related API endpoints including ATS scoring, improvements, and content generation.

NOTE: AI endpoints have been moved to app/features/ai/routes.py
for better feature isolation. This file is kept for backward compatibility.
The router is still registered in main.py but routes are now in the feature module.

NOTE: ATS scoring endpoints have been moved to app/features/ats_scoring/routes.py
"""

# AI endpoints moved to app/features/ai/routes.py
# Import router from feature module for backward compatibility
from app.features.ai.routes import router

# All endpoint definitions have been moved to features/ai/routes.py
# This file now re-exports the router for backward compatibility
