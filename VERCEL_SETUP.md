# Vercel Deployment Setup Guide

This guide explains how to set up production and staging deployments on Vercel.

## Current Setup

- **Production**: `main` branch → `editresume.io`
- **Staging**: `staging` branch → `staging.editresume.io`

## Vercel Dashboard Configuration

### 1. Production Environment (main branch)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Select **Production** environment
4. Add the following environment variables:

```
NEXT_PUBLIC_API_BASE=https://editresume-api-prod.onrender.com
NEXT_PUBLIC_FRONTEND_URL=https://editresume.io
NEXT_PUBLIC_PREMIUM_MODE=true
NODE_ENV=production
```

### 2. Staging Environment (staging branch)

1. In the same **Environment Variables** section
2. Select **Preview** or **Staging** environment (or create a custom environment)
3. Add the following environment variables:

```
NEXT_PUBLIC_API_BASE=https://editresume-staging.onrender.com
NEXT_PUBLIC_FRONTEND_URL=https://staging.editresume.io
NEXT_PUBLIC_PREMIUM_MODE=false
NODE_ENV=production
```

### 3. Domain Configuration

#### Production Domain (editresume.io)
1. Go to **Settings** → **Domains**
2. Add `editresume.io` and `www.editresume.io`
3. Configure DNS records as instructed by Vercel
4. Ensure this domain is linked to the **Production** environment

#### Staging Domain (staging.editresume.io)
1. In the same **Domains** section
2. Add `staging.editresume.io`
3. Configure DNS records (add a CNAME record pointing to Vercel)
4. Link this domain to the **Preview** or **Staging** environment

### 4. Branch Configuration

1. Go to **Settings** → **Git**
2. Ensure:
   - **Production Branch**: `main`
   - **Preview Branches**: Include `staging` (or set it as a custom production branch)

### 5. Build Settings ⚠️ CRITICAL

**YOU MUST SET THE ROOT DIRECTORY OR DEPLOYMENT WILL FAIL!**

1. Go to **Settings** → **General**
2. **MANDATORY**: Set **Root Directory** to: `frontend`
   - This is the most important setting!
   - Without this, Vercel won't find your `package.json` and Next.js
   - The error "No Next.js version detected" means Root Directory is not set correctly

3. After setting Root Directory, the following will be auto-detected:
   - **Build Command**: `npm run build` (auto-detected from frontend/package.json)
   - **Output Directory**: `.next` (auto-detected for Next.js)
   - **Install Command**: `npm install` (auto-detected)

4. **Alternative** (if you can't set Root Directory):
   - You can override build commands in `vercel.json` (already configured)
   - But Root Directory setting is still recommended for best results

**Troubleshooting**: If you see "No Next.js version detected":
- ✅ Check that Root Directory is set to `frontend` (not empty, not `/frontend`, just `frontend`)
- ✅ Verify that `frontend/package.json` exists and contains `"next"` in dependencies
- ✅ Re-deploy after changing Root Directory setting

## Environment Variables Reference

### Production (main branch)
```bash
NEXT_PUBLIC_API_BASE=https://editresume-api-prod.onrender.com
NEXT_PUBLIC_FRONTEND_URL=https://editresume.io
NEXT_PUBLIC_PREMIUM_MODE=true
NODE_ENV=production
```

### Staging (staging branch)
```bash
NEXT_PUBLIC_API_BASE=https://editresume-staging.onrender.com
NEXT_PUBLIC_FRONTEND_URL=https://staging.editresume.io
NEXT_PUBLIC_PREMIUM_MODE=false
NODE_ENV=production
```

## Deployment Workflow

1. **Production Deployment**:
   - Push to `main` branch
   - Vercel automatically deploys to `editresume.io`
   - Uses production API: `editresume-api-prod.onrender.com`

2. **Staging Deployment**:
   - Push to `staging` branch
   - Vercel automatically deploys to `staging.editresume.io`
   - Uses staging API: `editresume-staging.onrender.com`

## Verifying Setup

1. **Check Production**:
   - Visit `https://editresume.io`
   - Open browser console
   - Check `NEXT_PUBLIC_API_BASE` should point to production API

2. **Check Staging**:
   - Visit `https://staging.editresume.io`
   - Open browser console
   - Check `NEXT_PUBLIC_API_BASE` should point to staging API

## Troubleshooting

### If staging domain doesn't work:
1. Check DNS records for `staging.editresume.io`
2. Verify environment variables are set for Preview/Staging
3. Check Vercel deployment logs

### If wrong API is being used:
1. Verify environment variables in Vercel dashboard
2. Check which environment the deployment is using
3. Re-deploy after updating environment variables

### If build fails:
1. Check that `frontend/package.json` exists
2. Verify build command includes `cd frontend`
3. Check Node.js version (should be >= 18.17.0)

## Notes

- Environment variables are case-sensitive
- Changes to environment variables require a new deployment
- The `vercel.json` file no longer contains hardcoded environment variables
- All environment-specific config is now managed in Vercel dashboard

