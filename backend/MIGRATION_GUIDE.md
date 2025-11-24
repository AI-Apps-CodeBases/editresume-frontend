# Migration Guide: Adding New Job Description Fields

## Problem
The extension is giving an error because the new columns don't exist in the database yet.

## Solution

### For Local Development:

1. **Set DATABASE_URL in your .env file:**
   ```bash
   # In the root directory .env file
   DATABASE_URL=postgresql://user:password@localhost:5432/database_name
   ```

2. **Run the migration:**
   ```bash
   cd backend
   python3 run_job_fields_migration.py
   ```

### For Production/Deployment:

**Important:** 
- **Vercel** = Frontend only (no database, no migration needed)
- **Render** = Backend + Database (migration needed here)

You need to run the migration on your **Render database**, not on Vercel.

#### Option 1: Run Migration via Render Shell (Recommended)

1. **Go to your Render dashboard**: https://dashboard.render.com
2. **Select your backend service** (`editresume-backend`)
3. **Click on "Shell" tab** (or use the terminal icon)
4. **Run the migration:**
   ```bash
   cd /opt/render/project/src/backend
   python3 run_job_fields_migration.py
   ```

#### Option 2: Run Migration via Render Database Console

1. **Go to your Render dashboard**
2. **Select your database** (`editresume-db`)
3. **Click on "Connect" or "Query"**
4. **Run the SQL commands:**
   ```sql
   ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS max_salary INTEGER;
   ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'bookmarked';
   ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP;
   ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS important_emoji VARCHAR(10);
   ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS notes TEXT;
   ```

#### Option 3: Run SQL Directly on Production Database

If you have direct database access:

```sql
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS max_salary INTEGER;
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'bookmarked';
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP;
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS important_emoji VARCHAR(10);
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS notes TEXT;
```

#### Option 4: Add Migration to Deployment Process

If your backend is on Render, you can add a **Release Command**:

1. Go to your Render service settings
2. Add a **Release Command**:
   ```bash
   python3 backend/run_job_fields_migration.py && your-normal-start-command
   ```

### Verify Migration

After running, verify the columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'job_descriptions' 
AND column_name IN ('max_salary', 'status', 'follow_up_date', 'important_emoji', 'notes');
```

## Notes

- ✅ Migration is safe to run multiple times
- ✅ All new columns are nullable (won't break existing data)
- ✅ Default value for `status` is 'bookmarked'
- ⚠️ Make sure to run on **production database** before deploying code changes

