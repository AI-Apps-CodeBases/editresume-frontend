# ⚠️ Vercel Dashboard Configuration Checklist

## The Error You're Seeing
```
Running "install" command: `cd frontend && npm install`...
sh: line 1: cd: frontend: No such file or directory
```

This means Vercel is trying to run `cd frontend && npm install` but can't find the directory.

## Root Cause
Either:
1. **Root Directory is NOT set** in Vercel dashboard, OR
2. **Custom build commands** are set in Vercel dashboard that include `cd frontend &&`

## Fix: Check Vercel Dashboard Settings

### Step 1: Check Root Directory
1. Go to **Vercel Dashboard** → Your Project → **Settings** → **General**
2. Scroll to **Root Directory**
3. **MUST BE SET TO**: `frontend` (just the word, no slash)
4. If it's empty or set to something else, change it to `frontend`
5. Click **Save**

### Step 2: Check Build & Development Settings
1. In the same **Settings** → **General** page
2. Scroll to **Build & Development Settings**
3. Check these fields:

   **Install Command:**
   - Should be: `npm install` (NOT `cd frontend && npm install`)
   - Or leave it empty to auto-detect

   **Build Command:**
   - Should be: `npm run build` (NOT `cd frontend && npm run build`)
   - Or leave it empty to auto-detect

   **Output Directory:**
   - Should be: `.next` (NOT `frontend/.next`)
   - Or leave it empty to auto-detect

4. **If you see `cd frontend &&` in any of these fields, REMOVE IT**
5. Click **Save**

### Step 3: Verify Framework Detection
1. In **Settings** → **General**
2. Check **Framework Preset**
3. Should show: **Next.js** (auto-detected)
4. If not, the Root Directory is probably not set correctly

## How It Should Work

### With Root Directory Set to `frontend`:
- Vercel automatically changes to `frontend/` directory
- Commands run from `frontend/` directory
- No need for `cd frontend &&` in commands
- `npm install` runs in `frontend/`
- `npm run build` runs in `frontend/`
- Output is in `frontend/.next/`

### Current vercel.json Configuration:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

This assumes Root Directory is set to `frontend` in the dashboard.

## After Making Changes

1. **Save all settings** in Vercel dashboard
2. Go to **Deployments** tab
3. Find the failed deployment
4. Click **Redeploy** (or push a new commit)

## Verification

After fixing, you should see in the build logs:
```
Running "install" command: `npm install`...
✓ Installed dependencies
Running "build" command: `npm run build`...
✓ Build completed
```

**NOT:**
```
Running "install" command: `cd frontend && npm install`...  ❌
```

## Quick Fix Summary

1. ✅ Set **Root Directory** = `frontend` in Vercel dashboard
2. ✅ Remove `cd frontend &&` from any custom commands
3. ✅ Let Vercel auto-detect or use commands from `vercel.json`
4. ✅ Redeploy

