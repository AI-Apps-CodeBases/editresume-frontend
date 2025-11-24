#!/usr/bin/env python3
"""Run migration to add new fields to job_descriptions table:
max_salary, status, follow_up_date, important_emoji, notes
"""

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
    # dotenv not installed, that's OK
    pass
except Exception as e:
    print(f"Note: Could not load .env file: {e}")

try:
    from database import engine, Base
    from sqlalchemy import text

    print("Connecting to database...")

    # Check if columns already exist and add them if needed
    with engine.begin() as conn:
        # Get column information
        result = conn.execute(
            text(
                """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'job_descriptions' 
            AND column_name IN ('max_salary', 'status', 'follow_up_date', 'important_emoji', 'notes')
        """
            )
        )
        existing_columns = [row[0] for row in result]

        print(f"Existing columns: {existing_columns}")

        # Add columns if they don't exist
        columns_to_add = [
            ("max_salary", "INTEGER"),
            ("status", "VARCHAR(50) DEFAULT 'bookmarked'"),
            ("follow_up_date", "TIMESTAMP"),
            ("important_emoji", "VARCHAR(10)"),
            ("notes", "TEXT"),
        ]

        for col_name, col_type in columns_to_add:
            if col_name not in existing_columns:
                print(f"Adding {col_name} column...")
                try:
                    conn.execute(
                        text(
                            f"ALTER TABLE job_descriptions ADD COLUMN {col_name} {col_type}"
                        )
                    )
                    print(f"✓ {col_name} column added")
                except Exception as e:
                    print(f"⚠ Error adding {col_name}: {e}")
                    raise
            else:
                print(f"✓ {col_name} column already exists")

    print("\n✅ Migration completed successfully!")

except Exception as e:
    print(f"❌ Migration failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)
