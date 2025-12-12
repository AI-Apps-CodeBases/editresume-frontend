# Environment Variables - editresume.io

**Generated:** 2025-01-27  
**Purpose:** Complete reference for all environment variables used in the application

---

## Backend Environment Variables

### Application Configuration

| Variable | Type | Required | Default | Purpose |
|----------|------|----------|---------|---------|
| `APP_NAME` | string | No | `"editresume.io API"` | Application name |
| `ENVIRONMENT` | string | No | `"development"` | Environment (development/staging/production) |
| `APP_VERSION` | string | No | `"0.1.0"` | Application version |
| `PREMIUM_MODE` | boolean | No | `false` | Enable premium features |

### Database

| Variable | Type | Required | Default | Purpose |
|----------|------|----------|---------|---------|
| `DATABASE_URL` | string | **Yes** | `None` | PostgreSQL connection string |

### OpenAI Configuration

| Variable | Type | Required | Default | Purpose |
|----------|------|----------|---------|---------|
| `OPENAI_API_KEY` | string | **Yes** (for AI features) | `None` | OpenAI API key for AI features |
| `OPENAI_MODEL` | string | No | `"gpt-4o-mini"` | OpenAI model to use |
| `OPENAI_MAX_TOKENS` | integer | No | `2000` | Maximum tokens per request |
| `USE_AI_PARSER` | boolean | No | `"true"` | Enable AI-powered resume parsing |

### Firebase Configuration

| Variable | Type | Required | Default | Purpose |
|----------|------|----------|---------|---------|
| `FIREBASE_PROJECT_ID` | string | **Yes** | `None` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | string | No | `None` | Firebase service account JSON (alternative to base64/path) |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | string | No | `None` | Firebase service account JSON encoded as base64 |
| `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` | string | No | `None` | Path to Firebase service account key file |

**Note:** At least one of `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, or `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` must be provided.

### Stripe Configuration

| Variable | Type | Required | Default | Purpose |
|----------|------|----------|---------|---------|
| `STRIPE_SECRET_KEY` | string | **Yes** (for payments) | `None` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | string | **Yes** (for webhooks) | `None` | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | string | **Yes** (for payments) | `None` | Stripe price ID for subscriptions |
| `STRIPE_SUCCESS_URL` | string | No | `None` | Redirect URL after successful payment |
| `STRIPE_CANCEL_URL` | string | No | `None` | Redirect URL after cancelled payment |
| `STRIPE_PORTAL_RETURN_URL` | string | No | `None` | Return URL for Stripe customer portal |

### LinkedIn Integration

| Variable | Type | Required | Default | Purpose |
|----------|------|----------|---------|---------|
| `LINKEDIN_CLIENT_ID` | string | No | `None` | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | string | No | `None` | LinkedIn OAuth client secret |
| `LINKEDIN_REDIRECT_URI` | string | No | `None` | LinkedIn OAuth redirect URI |

### CORS Configuration

| Variable | Type | Required | Default | Purpose |
|----------|------|----------|---------|---------|
| `ADDITIONAL_CORS_ORIGINS` | string | No | `""` | Comma-separated list of additional CORS origins |

---

## Frontend Environment Variables

### API Configuration

| Variable | Type | Required | Default | Purpose |
|----------|------|----------|---------|---------|
| `NEXT_PUBLIC_API_BASE` | string | No | Auto-detected | API base URL (overrides auto-detection) |
| `NEXT_PUBLIC_FRONTEND_URL` | string | No | `"http://localhost:3000"` | Frontend URL for redirects |

### Firebase Configuration

| Variable | Type | Required | Default | Purpose |
|----------|------|----------|---------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | string | **Yes** | `None` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | string | **Yes** | `None` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | string | **Yes** | `None` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | string | No | `None` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | string | No | `None` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | string | No | `None` | Firebase app ID |

**Note:** `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` are required for Firebase to initialize.

---

## Environment-Specific Configuration

### Development

```bash
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/editresume
OPENAI_API_KEY=sk-...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./path/to/service-account.json
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Frontend
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### Staging

```bash
# Backend
ENVIRONMENT=staging
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
FIREBASE_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT_BASE64=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Frontend
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_API_BASE=https://editresume-staging.onrender.com
```

### Production

```bash
# Backend
ENVIRONMENT=production
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
FIREBASE_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT_BASE64=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Frontend
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_API_BASE=https://api.editresume.io
```

---

## Required vs Optional

### Backend - Required for Production

- `DATABASE_URL` - **Required**
- `OPENAI_API_KEY` - **Required** (for AI features)
- `FIREBASE_PROJECT_ID` - **Required**
- At least one Firebase service account method - **Required**
- `STRIPE_SECRET_KEY` - **Required** (for payments)
- `STRIPE_WEBHOOK_SECRET` - **Required** (for webhooks)
- `STRIPE_PRICE_ID` - **Required** (for subscriptions)

### Frontend - Required for Production

- `NEXT_PUBLIC_FIREBASE_API_KEY` - **Required**
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - **Required**
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - **Required**

---

## Security Notes

1. **Never commit** `.env` files to version control
2. **Use base64 encoding** for service account JSON in CI/CD (not plain JSON)
3. **Rotate secrets** regularly, especially after team member changes
4. **Use different keys** for development, staging, and production
5. **Restrict CORS origins** in production using `ADDITIONAL_CORS_ORIGINS`

---

## Validation

### Backend

Environment variables are validated using Pydantic in `app/core/config.py`. Missing required variables will cause the application to fail at startup.

### Frontend

Firebase configuration is validated at runtime in `src/lib/firebaseClient.ts`. Missing required variables will cause Firebase initialization to fail.

---

## CI/CD Integration

### Vercel (Frontend)

Set environment variables in Vercel dashboard:
- Project Settings → Environment Variables

### Render (Backend)

Set environment variables in Render dashboard:
- Service → Environment → Environment Variables

---

## Troubleshooting

### Backend won't start
- Check `DATABASE_URL` is set and valid
- Verify Firebase service account credentials
- Ensure `OPENAI_API_KEY` is set (if using AI features)

### Frontend Firebase errors
- Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set
- Check Firebase project ID matches backend configuration
- Ensure Firebase project has authentication enabled

### CORS errors
- Add frontend URL to `ADDITIONAL_CORS_ORIGINS` in backend
- Verify `NEXT_PUBLIC_API_BASE` matches backend URL

---

## References

- Backend config: `backend/app/core/config.py`
- Frontend config: `frontend/src/lib/config.ts`
- Firebase client: `frontend/src/lib/firebaseClient.ts`

