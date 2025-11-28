#!/usr/bin/env python3
"""Run migration to add LinkedIn fields to users table"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from database import engine
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
            WHERE table_name = 'users' 
            AND column_name IN ('linkedin_token', 'linkedin_profile_url', 'linkedin_id')
        """
            )
        )
        existing_columns = [row[0] for row in result]

        print(f"Existing LinkedIn columns: {existing_columns}")

        # Add columns if they don't exist
        if "linkedin_token" not in existing_columns:
            print("Adding linkedin_token column...")
            conn.execute(
                text("ALTER TABLE users ADD COLUMN linkedin_token TEXT")
            )
            conn.commit()
            print("✓ linkedin_token column added")
        else:
            print("✓ linkedin_token column already exists")

        if "linkedin_profile_url" not in existing_columns:
            print("Adding linkedin_profile_url column...")
            conn.execute(
                text("ALTER TABLE users ADD COLUMN linkedin_profile_url VARCHAR(255)")
            )
            conn.commit()
            print("✓ linkedin_profile_url column added")
        else:
            print("✓ linkedin_profile_url column already exists")

        if "linkedin_id" not in existing_columns:
            print("Adding linkedin_id column...")
            conn.execute(
                text("ALTER TABLE users ADD COLUMN linkedin_id VARCHAR(255)")
            )
            conn.commit()
            print("✓ linkedin_id column added")
        else:
            print("✓ linkedin_id column already exists")

        # Create index on linkedin_id if it doesn't exist
        result = conn.execute(
            text(
                """
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'users' 
            AND indexname = 'idx_users_linkedin_id'
        """
            )
        )
        index_exists = result.fetchone() is not None

        if not index_exists:
            print("Creating index on linkedin_id...")
            conn.execute(
                text("""
                    CREATE INDEX idx_users_linkedin_id 
                    ON users(linkedin_id) 
                    WHERE linkedin_id IS NOT NULL
                """)
            )
            conn.commit()
            print("✓ Index created")
        else:
            print("✓ Index already exists")

    print("\n✅ Migration completed successfully!")

except Exception as e:
    print(f"❌ Migration failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

