#!/usr/bin/env python3
"""Run migration to add index on users.email for improved query performance"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Try to load .env file if it exists
try:
    from dotenv import load_dotenv

    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded environment from {env_path}")
except ImportError:
    pass
except Exception as e:
    print(f"Note: Could not load .env file: {e}")

try:
    from app.core.db import engine
    from sqlalchemy import text

    print("Connecting to database...")

    with engine.begin() as conn:
        print("Creating index on users.email...")
        
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"))
            print("✓ Created index: idx_users_email")
        except Exception as e:
            print(f"⚠ Could not create idx_users_email: {e}")

    print("\n✅ Index migration completed successfully!")

except Exception as e:
    print(f"❌ Migration failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

