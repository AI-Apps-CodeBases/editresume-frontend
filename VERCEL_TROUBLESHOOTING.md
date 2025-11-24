# Vercel Troubleshooting: "cd frontend: No such file or directory"

## The Problem
Vercel is still trying to run `cd frontend && npm install` even after setting Root Directory.

## Possible Causes

### 1. Root Directory Not Actually Set
- The setting might not have saved
- It might be set for the wrong environment (Production vs Preview)
- There might be environment-specific overrides

### 2. Cached Configuration
- Vercel might be using cached build settings
- Old deployment configuration might be persisting

### 3. Project Settings vs Environment Settings
- Root Directory might need to be set for each environment separately
- Preview/Staging might have different settings than Production

## Step-by-Step Fix

### Step 1: Verify Root Directory is Set (All Environments)

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **General**
2. Scroll to **Root Directory**
3. **VERIFY** it shows: `frontend` (not empty, not `/frontend`, just `frontend`)
4. **IMPORTANT**: Check if there are environment-specific overrides:
   - Look for dropdowns or tabs for "Production", "Preview", "Development"
   - Make sure Root Directory is set for **ALL** environments
   - Especially check **Preview** environment (this is what staging branch uses)

### Step 2: Clear All Custom Build Commands

1. In **Settings** → **General** → **Build & Development Settings**
2. **Install Command**: 
   - Should be EMPTY (let Vercel auto-detect)
   - OR set to: `npm install` (NO `cd frontend &&`)
   - If you see `cd frontend && npm install`, DELETE IT
3. **Build Command**:
   - Should be EMPTY (let Vercel auto-detect)
   - OR set to: `npm run build` (NO `cd frontend &&`)
4. **Output Directory**:
   - Should be EMPTY (let Vercel auto-detect)
   - OR set to: `.next` (NO `frontend/.next`)
5. **Framework Preset**: Should show **Next.js**
6. Click **Save**

### Step 3: Check for Environment-Specific Overrides

1. In **Settings** → **General**
2. Look for any tabs or sections labeled:
   - "Production"
   - "Preview" 
   - "Development"
3. Check EACH environment and ensure:
   - Root Directory is set to `frontend`
   - No custom commands with `cd frontend &&`

### Step 4: Force a Fresh Deployment

1. Go to **Deployments** tab
2. Find the latest failed deployment
3. Click the **three dots (⋯)** menu
4. Click **Redeploy**
5. **OR** make a small commit and push to trigger a new deployment:
   ```bash
   git commit --allow-empty -m "Trigger Vercel redeploy"
   git push origin staging
   ```

### Step 5: Check Deployment Logs

After redeploying, check the logs. You should see:
```
Running "install" command: `npm install`...
```
**NOT:**
```
Running "install" command: `cd frontend && npm install`...
```

## Alternative: Use vercel.json Only

If dashboard settings keep causing issues, you can try:

1. **Remove ALL custom commands from Vercel dashboard** (set to empty/auto-detect)
2. **Set Root Directory to `frontend`** in dashboard
3. **Let vercel.json handle everything**

The current `vercel.json` should work if Root Directory is set correctly.

## Nuclear Option: Reconnect Repository

If nothing works:

1. Go to **Settings** → **Git**
2. Disconnect the repository
3. Reconnect it
4. Set Root Directory to `frontend` again
5. Set environment variables
6. Redeploy

## Verification Checklist

After making changes, verify:

- [ ] Root Directory = `frontend` (in dashboard, all environments)
- [ ] Install Command = empty OR `npm install` (NO `cd frontend &&`)
- [ ] Build Command = empty OR `npm run build` (NO `cd frontend &&`)
- [ ] Output Directory = empty OR `.next` (NO `frontend/.next`)
- [ ] Framework Preset = Next.js
- [ ] Redeployed after making changes
- [ ] Checked deployment logs for correct commands

## Still Not Working?

If you've done all of the above and it's still failing:

1. **Screenshot** your Vercel dashboard settings (General page, Build & Development Settings)
2. **Check** the exact error message in deployment logs
3. The issue might be that Vercel needs the Root Directory to be set BEFORE the first deployment, and subsequent deployments might be cached

Try creating a **new Vercel project** and importing the repository fresh, then set Root Directory immediately.

