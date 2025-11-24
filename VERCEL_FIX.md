# ⚠️ CRITICAL FIX: "No Next.js version detected" Error

## Problem
Vercel can't find your Next.js app because it's looking in the wrong directory.

## Solution: Set Root Directory in Vercel Dashboard

### Step-by-Step Fix:

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Click on **Settings** (gear icon)

2. **Open General Settings**
   - Click on **General** in the left sidebar

3. **Set Root Directory** ⚠️ THIS IS CRITICAL
   - Scroll down to **Root Directory** section
   - Enter: `frontend` (just the word "frontend", no slash, no quotes)
   - Click **Save**

4. **Verify Build Settings**
   After setting Root Directory, Vercel should auto-detect:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

5. **Redeploy**
   - Go to **Deployments** tab
   - Click the three dots (⋯) on the failed deployment
   - Click **Redeploy**
   - OR push a new commit to trigger a new deployment

## Why This Happens

Vercel looks for `package.json` in the root directory by default. Since your Next.js app is in the `frontend/` subdirectory, you must tell Vercel where to look.

## Verification

After setting Root Directory and redeploying, you should see:
- ✅ Build starts successfully
- ✅ Next.js is detected
- ✅ Dependencies install from `frontend/package.json`
- ✅ Build completes

## For Both Environments

**IMPORTANT**: You need to set Root Directory for BOTH:
- Production (main branch)
- Preview/Staging (staging branch)

The Root Directory setting applies to all environments, so once you set it, both will work.

## Updated vercel.json

The `vercel.json` has been simplified. When Root Directory is set to `frontend` in the Vercel dashboard:
- Vercel automatically runs commands from the `frontend/` directory
- No need for `cd frontend &&` in build commands
- Next.js will auto-detect the framework and use default commands

**If you see "cd: frontend: No such file or directory" error:**
- This means Root Directory is NOT set in Vercel dashboard
- Set Root Directory to `frontend` and the error will be resolved

