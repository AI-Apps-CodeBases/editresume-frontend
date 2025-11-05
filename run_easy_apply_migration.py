#!/usr/bin/env python3
"""Run migration to add easy_apply_url column to job_descriptions table"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from database import engine, Base
    from sqlalchemy import text
    
    print("Connecting to database...")
    
    # Check if column already exists
    with engine.connect() as conn:
        # Get column information
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'job_descriptions' 
            AND column_name = 'easy_apply_url'
        """))
        existing_columns = [row[0] for row in result]
        
        print(f"Checking for easy_apply_url column...")
        
        # Add column if it doesn't exist
        if 'easy_apply_url' not in existing_columns:
            print("Adding easy_apply_url column...")
            conn.execute(text("ALTER TABLE job_descriptions ADD COLUMN easy_apply_url TEXT"))
            conn.commit()
            print("✓ easy_apply_url column added successfully")
        else:
            print("✓ easy_apply_url column already exists")
    
    print("\n✅ Migration completed successfully!")
    
except Exception as e:
    print(f"❌ Migration failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

