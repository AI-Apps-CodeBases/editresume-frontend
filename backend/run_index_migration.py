#!/usr/bin/env python3
"""Run migration to add indexes for job_descriptions and jobs tables to improve query performance"""

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
    from database import engine
    from sqlalchemy import text

    print("Connecting to database...")

    with engine.begin() as conn:
        print("Creating indexes for job_descriptions table...")
        
        indexes = [
            ("idx_job_descriptions_user_id", "CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON job_descriptions(user_id)"),
            ("idx_job_descriptions_created_at", "CREATE INDEX IF NOT EXISTS idx_job_descriptions_created_at ON job_descriptions(created_at DESC)"),
            ("idx_job_descriptions_user_created", "CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_created ON job_descriptions(user_id, created_at DESC)"),
        ]
        
        for index_name, sql in indexes:
            try:
                conn.execute(text(sql))
                print(f"✓ Created index: {index_name}")
            except Exception as e:
                print(f"⚠ Could not create {index_name}: {e}")
        
        print("\nCreating indexes for jobs table...")
        
        jobs_indexes = [
            ("idx_jobs_created_at", "CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC)"),
            ("idx_jobs_user_created", "CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON jobs(user_id, created_at DESC)"),
        ]
        
        for index_name, sql in jobs_indexes:
            try:
                conn.execute(text(sql))
                print(f"✓ Created index: {index_name}")
            except Exception as e:
                print(f"⚠ Could not create {index_name}: {e}")

    print("\n✅ Index migration completed successfully!")

except Exception as e:
    print(f"❌ Migration failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

