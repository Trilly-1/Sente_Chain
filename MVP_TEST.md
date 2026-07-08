# SenteChain — Quick reference

## System admin (SenteChain platform)

| Field | Value |
|-------|--------|
| Phone | `+256764331334` |
| PIN | `0909` |
| Role | Project admin (`is_project_admin`) |
| Dashboard | `/sc-project-master-gate` |

Also in `backend/.env` as `PROJECT_ADMIN_PHONE` / `PROJECT_ADMIN_PIN`.  
Apply migration `000009` to create this user in the database.

**Demo admin** (migration `000003`): `+256700000001` / PIN `1234`

### Other demo accounts (PIN `1234`)

| Role | Phone |
|------|-------|
| SACCO admin | `+256700000002` |
| Cashier | `+256700000003` |
| Member | `+256700000004` |

---

## Payment webhooks (ready to receive)

Register these URLs with MTN / Airtel (replace host with your API):

| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/webhooks/health` | Ops check — confirms webhooks are live |
| GET | `/webhooks/mtn/momo` | URL verification ping |
| POST | `/webhooks/mtn/momo` | MTN MoMo payment callbacks |
| GET | `/webhooks/airtel/money` | URL verification ping |
| POST | `/webhooks/airtel/money` | Airtel Money callbacks |

**Production:** set in `.env`:

```
MTN_MOMO_CALLBACK_URL=https://your-api.com/webhooks/mtn/momo
AIRTEL_CALLBACK_URL=https://your-api.com/webhooks/airtel/money
```

Optional: `MTN_MOMO_WEBHOOK_SECRET` / `AIRTEL_WEBHOOK_SECRET` — when set, callbacks must include the matching signature header.

**Check status:** `GET /payments/integration-status`

**Local test** (non-production only):

```http
POST http://localhost:8080/webhooks/test/inbound-payment
Content-Type: application/json

{
  "external_id": "test-001",
  "amount": 50000,
  "currency": "UGX",
  "payer_phone": "+256700000004",
  "payee_phone": "+256700000099",
  "reference": "S-XXXXXXXX",
  "provider": "mtn_momo"
}
```

Use the SACCO's configured payee phone and a member reference (`S-`, `L-`, `I-` + member code).

Duplicate `external_id` callbacks are **idempotent** (safe retries).

---

## Product flows

See previous sections: USSD/web payments, SACCO admin approvals, public ledger at `/sacco/:id`.

## Run locally

```
VITE_API_URL=http://localhost:8080
VITE_USE_DEMO=false
```

Backend: migrations up → `go run ./cmd/api`  
Frontend: `npm run dev`
