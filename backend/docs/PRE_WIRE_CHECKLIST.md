# Pre-wire checklist — security, hardcoding, Render, caching

Review before setting `VITE_USE_DEMO=false` and connecting the frontend.

---

## 1. Hardcoded values audit

| Area | Status | Notes |
|------|--------|-------|
| Backend DB / JWT / Stellar | OK | All from env via `config.Load()` |
| Frontend `USE_DEMO` | Pending wire | Still `true` in `services/api.js` — switch via `VITE_USE_DEMO` when ready |
| Frontend API URL | Fix at wire | `api.js` falls back to production URL; set `VITE_API_URL` in Render |
| `frontend/src/api/*.js` | Orphan files | Hardcoded `api.sentechain.app` — delete or align at wire time |
| `SACCO01` nav links | Demo UX | Replace with dynamic SACCO id from API |
| Dev seed `000003` | Dev only | Never run in production Neon |

---

## 2. Security fixes applied

| Issue | Fix |
|-------|-----|
| Role escalation on register | Joining a SACCO always creates `member` role |
| Admin approves cashier/admin KYC | Rejected unless role is `member` |
| Stellar anchor by any member | Restricted to SACCO admin/cashier + project admin |
| Suspended members read txs | Denied when membership not `active` |
| Weak JWT default | Removed; min 32 chars, weak values blocked |
| OTP in API response | Gated on `EXPOSE_OTP_IN_RESPONSE` (blocked in prod) |
| No rate limiting | `/auth/*` limited per IP (`AUTH_RATE_LIMIT`) |
| No CORS | `CORS_ALLOWED_ORIGINS` allowlist |
| Swagger in prod | Off when `APP_ENV=production` unless `ENABLE_DOCS=true` |
| Gin debug mode | Release mode when `APP_ENV=production` |

### Still recommended (post-wire)

- Redis-backed rate limiting for multi-instance Render
- JWT refresh / revocation
- Document URL allowlist (SSRF)
- OTP verify row locking
- Never expose internal errors to clients (sanitize handlers)

---

## 3. Rate limiting

Configured via env:

```env
AUTH_RATE_LIMIT=20
AUTH_RATE_WINDOW_SEC=60
```

Applies to all `/auth/*` routes per client IP. Returns **429** when exceeded.

For production at scale on Render (multiple instances), upgrade to Redis (e.g. Render Key Value) so limits are shared across instances.

---

## 4. Caching on Render

### API (backend web service)

Public GET endpoints send `Cache-Control` headers for Render’s CDN:

| Route | max-age |
|-------|---------|
| `GET /saccos` | 300s |
| `GET /saccos/{id}/public` | 60s |

Authenticated routes are **not** cached.

In Render Dashboard → your API service → enable **Edge Caching** if available on your plan, or rely on `Cache-Control` headers.

### Frontend (static site on Render)

`render.yaml` sets:

- `/assets/*` → `max-age=31536000, immutable` (Vite hashed bundles)
- `/*` → `max-age=0, must-revalidate` (HTML shell always fresh)

### What not to cache

- `/auth/*`, `/transactions/*`, `/admin/*`, `/members/onboarding/*`
- Any response with `Authorization` header

---

## 5. Render + GitHub setup

### One-time Render setup

1. Push repo to GitHub
2. Render → **New** → **Blueprint** → select repo → uses root `render.yaml`
3. Set secret env vars in Render dashboard:
   - `DATABASE_URL` (Neon pooled URL)
   - `CORS_ALLOWED_ORIGINS` (e.g. `https://sentechain-web.onrender.com`)
   - `STELLAR_*` (testnet for staging)
   - Frontend `VITE_API_URL` → your API URL (e.g. `https://sentechain-api.onrender.com`)
4. Run migrations against production Neon (from local or CI):
   ```bash
   migrate -path ./migrations -database "$MIGRATIONS_DATABASE_URL" up
   ```
   **Skip** `000003_seed_dev` in production or use a prod-only migration set.

### GitHub Actions

| Workflow | Purpose |
|----------|---------|
| `.github/workflows/backend-ci.yml` | Build + vet on PR/push |
| `.github/workflows/deploy-render.yml` | POST deploy hooks on `main` |

Add GitHub repository secrets:

| Secret | Where to get it |
|--------|-----------------|
| `RENDER_API_DEPLOY_HOOK` | Render → API service → Settings → Deploy Hook |
| `RENDER_WEB_DEPLOY_HOOK` | Render → static site → Settings → Deploy Hook |

If secrets are unset, deploy workflow skips gracefully.

---

## 6. Production env checklist

**API (`sentechain-api`):**

```env
APP_ENV=production
ENABLE_DOCS=false
EXPOSE_OTP_IN_RESPONSE=false
JWT_SECRET=<openssl rand -hex 32>
CORS_ALLOWED_ORIGINS=https://your-frontend.onrender.com
DATABASE_URL=<neon pooled url>
```

**Frontend (`sentechain-web`):**

```env
VITE_API_URL=https://sentechain-api.onrender.com
VITE_USE_DEMO=false
VITE_STELLAR_NETWORK=testnet
```

---

## 7. Order of operations

1. Apply this security pass (done in codebase)
2. Deploy API to Render + run migrations (no dev seed)
3. Smoke-test API on Render (`/health`, `/ready`, `/saccos`)
4. Deploy frontend with `VITE_USE_DEMO=false`
5. Wire frontend `api.js` to env flags
6. End-to-end test auth → onboarding → transactions → anchor
