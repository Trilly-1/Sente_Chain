# SenteChain

**SenteChain** is a SACCO management platform built for **Uganda**. It digitizes member onboarding, SACCO operations, and financial records in **UGX**, with optional **Stellar** proof anchoring so transaction integrity can be verified on-chain.

PostgreSQL is the operational database. The blockchain layer stores proof hashes—not full financial ledgers—keeping costs low while preserving auditability.

---

## Repository layout

```
Sente_Chain/
├── backend/          # Go API (Gin, PostgreSQL, JWT + PIN auth)
├── frontend/         # React + Vite web app
├── contracts/        # Stellar Soroban smart contract (experimental)
├── .github/workflows # CI and deploy automation
└── render.yaml       # Render.com blueprint (API + static frontend)
```

| Component | Stack | Purpose |
|-----------|--------|---------|
| **Backend** | Go, Gin, pgx, golang-migrate | REST API, auth, SACCO ops, transactions, admin review |
| **Frontend** | React 19, Vite, React Router | Member, cashier, SACCO admin, and project admin UIs |
| **Database** | PostgreSQL (e.g. Neon) | Users, memberships, SACCOs, documents, transactions, audit log |
| **Stellar** | Horizon testnet/mainnet | Anchor transaction proof hashes (optional) |

---

## Features

- **PIN-based auth** — phone + 4-digit PIN, JWT sessions
- **Member onboarding** — KYC document metadata, project-admin approval
- **SACCO onboarding** — draft → documents → submit → project-admin approval
- **Role-based access** — `member`, `cashier`, `admin`, project admin
- **SACCO operations** — member list, role changes, suspend/activate
- **Transactions** — deposits, withdrawals, transfers; Stellar anchor + verify
- **Public transparency** — approved SACCO summary and recent activity (`GET /saccos/:id/public`)
- **Audit log** — project-admin view of system actions

> **Note:** Loan workflows exist in the frontend UI only. There is no loans API in the backend yet.

---

## Quick start (local)

### Prerequisites

- **Go** 1.18+
- **Node.js** 18+ and npm
- **PostgreSQL** 12+ (or a [Neon](https://neon.tech) database)
- **golang-migrate** (for schema migrations) — `make install-migrate` in `backend/`

### 1. Clone and configure

```bash
git clone https://github.com/Trilly-1/Sente_Chain.git
cd Sente_Chain
```

**Never commit real secrets.** Copy the example env files and fill in your own values locally:

```bash
# Backend
cd backend
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux

# Frontend (separate terminal)
cd ../frontend
copy .env.example .env
```

See [Environment variables](#environment-variables) below. Full variable lists live in:

- `backend/.env.example`
- `frontend/.env.example`

### 2. Database migrations

```bash
cd backend
make migrate-up
```

For **local development only**, migration `000003` seeds a project admin and demo SACCO (see [Dev test accounts](#dev-test-accounts)). Do **not** run dev seed migrations in production.

### 3. Run the API

```bash
cd backend
make run
```

- API: `http://localhost:8080`
- Health: `GET /health`
- Readiness (DB): `GET /ready`
- Swagger UI (when `ENABLE_DOCS=true`): `http://localhost:8080/docs`
- OpenAPI spec: `http://localhost:8080/openapi.yaml`

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

Set `VITE_API_URL=http://localhost:8080` and `VITE_USE_DEMO=false` in `frontend/.env` to use the real API.

---

## Environment variables

Secrets stay in local `.env` files or your host’s dashboard—they are **gitignored** and must not be committed.

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `MIGRATIONS_DATABASE_URL` | Yes* | Migrate URL (Neon pooler may need `options=endpoint%3D...`) |
| `JWT_SECRET` | Yes | Min 32 characters; use a cryptographically random value |
| `JWT_EXPIRY_HOURS` | No | Token lifetime (default 24) |
| `PORT` | No | HTTP port (default 8080) |
| `APP_ENV` | No | `development` or `production` |
| `CORS_ALLOWED_ORIGINS` | Yes (prod) | Comma-separated frontend origins |
| `EXPOSE_OTP_IN_RESPONSE` | No | Must be `false` in production |
| `ENABLE_DOCS` | No | Swagger at `/docs`; off in production by default |
| `AUTH_RATE_LIMIT` | No | Rate limit for `/auth/*` |
| `STELLAR_*` | No | Horizon URL, network passphrase, source keys for anchoring |

Generate a JWT secret (example):

```bash
openssl rand -hex 32
```

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend base URL (e.g. `http://localhost:8080` or your Render URL) |
| `VITE_USE_DEMO` | `true` = mock data; `false` = live API |
| `VITE_STELLAR_NETWORK` | `testnet` or `mainnet` (explorer links) |

---

## Dev test accounts

After running dev migrations (`000003`), you can use:

| Role | Phone | PIN | Notes |
|------|-------|-----|--------|
| Project admin | `+256700000001` | `1234` | Full platform review (SACCO + member KYC) |
| Demo SACCO | — | — | Code `DEMO01`, country `UG` — join as a member via signup |

Change these credentials in production. Do not rely on seed data outside local/dev environments.

---

## API overview

All JSON responses use a `{ "success": true, "data": ... }` envelope unless documented otherwise.

| Area | Endpoints |
|------|-----------|
| **Health** | `GET /health`, `GET /ready` |
| **Auth** | `POST /auth/register`, `/login`, `/otp/send`, `/otp/verify`, `GET /auth/me` |
| **SACCOs (public)** | `GET /saccos`, `GET /saccos/:id/public` |
| **SACCO onboarding** | `POST /saccos`, `GET/PATCH /saccos/:id`, `/documents`, `/submit`, `/status` |
| **Member KYC** | `POST /members/onboarding/documents`, `GET .../status` |
| **Transactions** | `POST/GET /transactions`, `GET /transactions/:id`, `/anchor`, `/verify` |
| **SACCO staff** | `GET /saccos/:id/members`, role/suspend/activate |
| **Project admin** | Pending members/SACCOs, approve/reject, `GET /admin/audit-logs` |

Interactive docs: run the backend with `ENABLE_DOCS=true` and open `/docs`.

Manual test notes: `backend/docs/API_TESTS.md`.

---

## Frontend routes

| Path | Audience |
|------|----------|
| `/` | Landing |
| `/auth` | Login & signup |
| `/dashboard` | Role-based home (member / cashier / admin) |
| `/register-sacco` | New SACCO application |
| `/verification-pending` | SACCO awaiting approval |
| `/member-onboarding` | Member KYC upload |
| `/member-verification-pending` | Member awaiting approval |
| `/sc-project-master-gate` | Project admin console |
| `/sacco/:saccoId` | Public SACCO ledger view |

API client: `frontend/src/services/api.js`.

---

## Deployment

### Backend (Render)

The repo includes `render.yaml` for a Go web service:

- Build: `go build -o bin/api ./cmd/api`
- Start: `./bin/api`
- Health check: `/health`

Set these in the Render dashboard (not in git):

- `DATABASE_URL`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`
- Stellar variables if anchoring is enabled
- `APP_ENV=production`, `EXPOSE_OTP_IN_RESPONSE=false`

Production API example: `https://sente-chain.onrender.com`

### Frontend (Vercel / Render static)

```bash
cd frontend
npm ci && npm run build
```

Publish the `dist/` folder. Required build-time env:

```
VITE_API_URL=<your-api-url>
VITE_USE_DEMO=false
```

Add the deployed frontend URL to backend `CORS_ALLOWED_ORIGINS`.

### CI

- `backend-ci.yml` — Go build and tests on push/PR
- `deploy-render.yml` — optional Render deploy workflow

---

## Security

- `.env` files are gitignored; only `.env.example` files are tracked (placeholders only).
- PINs are bcrypt-hashed server-side; never stored or logged in plain text.
- JWT secret must be at least 32 characters in production.
- Stellar anchoring is restricted to SACCO admin/cashier roles.
- Registering with a SACCO always creates a `member` role (no privilege escalation via signup).
- Rate limiting applies to `/auth/*` routes.

---

## Smart contracts

`contracts/sacco-contract/` contains an experimental Soroban contract. The live product currently anchors proofs via the Go Stellar service and Horizon—not via on-chain contract calls. See `contracts/sacco-contract/README.md` for contract-specific docs.

---

## Contributing

1. Fork the repo and create a feature branch.
2. Run `make check` in `backend/` and `npm run build` in `frontend/` before opening a PR.
3. Do not commit `.env`, credentials, or production secrets.
4. Keep API changes reflected in `backend/openapi/openapi.yaml` and `backend/docs/API_TESTS.md`.

---

## License

See repository settings or contact the maintainers for license terms.

---

## Links

- **Repository:** https://github.com/Trilly-1/Sente_Chain
- **API docs (local):** http://localhost:8080/docs
- **Backend details:** [backend/README.md](backend/README.md)
