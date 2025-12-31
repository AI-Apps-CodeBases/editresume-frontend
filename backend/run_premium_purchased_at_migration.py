#!/usr/bin/env python3
"""Run migration to add premium_purchased_at column to users table"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from database import engine
    from sqlalchemy import text

    print("Connecting to database...")

    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(
            text(
                """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'premium_purchased_at'
        """
            )
        )
        column_exists = result.fetchone() is not None

        if not column_exists:
            print("Adding premium_purchased_at column...")
            conn.execute(
                text("ALTER TABLE users ADD COLUMN premium_purchased_at TIMESTAMP NULL")
            )
            conn.commit()
            print("✓ premium_purchased_at column added")
        else:
            print("✓ premium_purchased_at column already exists")

        # Create index if it doesn't exist
        result = conn.execute(
            text(
                """
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'users' 
            AND indexname = 'idx_users_premium_purchased_at'
        """
            )
        )
        index_exists = result.fetchone() is not None

        if not index_exists:
            print("Creating index on premium_purchased_at...")
            conn.execute(
                text("""
                    CREATE INDEX idx_users_premium_purchased_at 
                    ON users(premium_purchased_at)
                """)
            )
            conn.commit()
            print("✓ Index created")
        else:
            print("✓ Index already exists")

        # For existing premium users, set premium_purchased_at to created_at as fallback
        print("Updating existing premium users with purchase dates...")
        result = conn.execute(
            text("""
                UPDATE users 
                SET premium_purchased_at = created_at 
                WHERE is_premium = true AND premium_purchased_at IS NULL
            """)
        )
        updated_count = result.rowcount
        conn.commit()
        print(f"✓ Updated {updated_count} existing premium users")

    print("\n✅ Migration completed successfully!")

except Exception as e:
    print(f"❌ Migration failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

