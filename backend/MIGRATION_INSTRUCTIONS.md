# Migration Instructions: Add New Job Description Fields

## Problem
The extension is giving an error because the new columns (`max_salary`, `status`, `follow_up_date`, `important_emoji`, `notes`) don't exist in the database yet.

## Solution: Run the Migration

### Option 1: Using Python Script (Recommended)

1. Make sure you have your `DATABASE_URL` environment variable set:
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```

2. Run the migration script:
   ```bash
   cd backend
   python3 run_job_fields_migration.py
   ```

### Option 2: Using SQL directly

If you have direct database access, you can run the SQL commands directly:

```sql
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS max_salary INTEGER;
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'bookmarked';
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP;
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS important_emoji VARCHAR(10);
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS notes TEXT;
```

### Option 3: Using psql

```bash
psql $DATABASE_URL -f migrate_add_job_fields.sql
```

## Verify Migration

After running the migration, verify the columns were added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'job_descriptions' 
AND column_name IN ('max_salary', 'status', 'follow_up_date', 'important_emoji', 'notes');
```

You should see all 5 columns listed.

## Notes

- The migration is safe to run multiple times (it checks if columns exist first)
- All new columns are nullable, so existing data won't be affected
- The `status` column has a default value of 'bookmarked'

