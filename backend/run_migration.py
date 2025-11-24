#!/usr/bin/env python3
"""Run migration to add job_type and work_type columns to job_descriptions table"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from database import engine, Base
    from sqlalchemy import text

    print("Connecting to database...")

    # Check if columns already exist
    with engine.connect() as conn:
        # Get column information
        result = conn.execute(
            text(
                """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'job_descriptions' 
            AND column_name IN ('job_type', 'work_type')
        """
            )
        )
        existing_columns = [row[0] for row in result]

        print(f"Existing columns: {existing_columns}")

        # Add columns if they don't exist
        if "job_type" not in existing_columns:
            print("Adding job_type column...")
            conn.execute(
                text("ALTER TABLE job_descriptions ADD COLUMN job_type VARCHAR")
            )
            conn.commit()
            print("✓ job_type column added")
        else:
            print("✓ job_type column already exists")

        if "work_type" not in existing_columns:
            print("Adding work_type column...")
            conn.execute(
                text("ALTER TABLE job_descriptions ADD COLUMN work_type VARCHAR")
            )
            conn.commit()
            print("✓ work_type column added")
        else:
            print("✓ work_type column already exists")

    print("\n✅ Migration completed successfully!")

except Exception as e:
    print(f"❌ Migration failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)
