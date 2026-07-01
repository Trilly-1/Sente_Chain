# SenteChain API — Manual Test Guide

Backend-only testing. No frontend required.

**Base URL:** `http://localhost:8080`  
**Interactive docs:** http://localhost:8080/docs  
**OpenAPI spec:** http://localhost:8080/openapi.yaml

---

## 0. Setup

```powershell
cd backend
copy .env.example .env   # if needed — fill Neon URLs + JWT_SECRET
go run ./cmd/api
```

Apply migrations (including dev seed):

```powershell
# Load .env vars, then:
migrate -path ./migrations -database "<MIGRATIONS_DATABASE_URL as postgres://...>" up
```

### Dev seed accounts (migration `000003`)

| Role | Phone | PIN | Notes |
|------|-------|-----|-------|
| Project admin | `+254700000001` | `1234` | `is_project_admin = true` |
| Approved SACCO | — | — | **Demo SACCO** / code `DEMO01` |

Get SACCO id for member registration:

```
GET http://localhost:8080/saccos
```

---

## 1. Health

| Method | URL | Auth |
|--------|-----|------|
| GET | `/health` | No |
| GET | `/ready` | No |

Browser: open URLs directly.

---

## 2. Auth

### Login as project admin

```http
POST /auth/login
Content-Type: application/json

{
  "phone": "+254700000001",
  "pin": "1234"
}
```

Copy `data.token` from the response. Use it as:

```
Authorization: Bearer <token>
```

### Register SACCO admin (step 1 of SACCO flow)

```http
POST /auth/register
Content-Type: application/json

{
  "full_name": "Sarah Chairman",
  "phone": "+254711111111",
  "pin": "1234",
  "country": "KE",
  "role": "admin"
}
```

Note: no `sacco_id` for SACCO admin registration.

### Register member (joins approved SACCO)

```http
POST /auth/register
Content-Type: application/json

{
  "full_name": "John Member",
  "phone": "+254722222222",
  "pin": "1234",
  "country": "KE",
  "sacco_id": "<DEMO_SACCO_UUID>",
  "role": "member"
}
```

### Current user

```http
GET /auth/me
Authorization: Bearer <token>
```

---

## 3. SACCO onboarding flow

Use token from **SACCO admin** register/login.

### Create draft SACCO

```http
POST /saccos
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Starlight SACCO",
  "country": "KE",
  "profile": {
    "type": "Deposit-taking",
    "address": "Nairobi CBD",
    "chairman_name": "Sarah Wanjiku",
    "secretary_name": "Peter Ochieng"
  }
}
```

Save `data.sacco.sacco_id`.

### Update draft

```http
PATCH /saccos/{sacco_id}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "profile": {
    "phone": "+254700123456",
    "registration_number": "CS/12345"
  }
}
```

### Upload documents (metadata + URL)

```http
POST /saccos/{sacco_id}/documents
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "documents": [
    {
      "document_type": "registration_certificate",
      "file_url": "https://example.com/cert.pdf",
      "file_name": "cert.pdf",
      "mime_type": "application/pdf"
    }
  ]
}
```

### Submit for review

```http
POST /saccos/{sacco_id}/submit
Authorization: Bearer <admin_token>
```

Expected status: `under_review`.

### Check status

```http
GET /saccos/{sacco_id}/status
Authorization: Bearer <admin_token>
```

---

## 4. Member KYC flow

Use token from **member** register/login. Status should start as `pending_kyc`.

### Submit KYC documents

```http
POST /members/onboarding/documents
Authorization: Bearer <member_token>
Content-Type: application/json

{
  "documents": [
    {
      "document_type": "id_front",
      "file_url": "https://example.com/id-front.jpg",
      "file_name": "id-front.jpg",
      "mime_type": "image/jpeg"
    },
    {
      "document_type": "id_back",
      "file_url": "https://example.com/id-back.jpg",
      "file_name": "id-back.jpg",
      "mime_type": "image/jpeg"
    }
  ]
}
```

Expected status: `under_review`.

### Check onboarding status

```http
GET /members/onboarding/status
Authorization: Bearer <member_token>
```

---

## 5. Admin review

Login as **project admin** (`+254700000001` / `1234`).

### Pending members

```http
GET /admin/members/pending
Authorization: Bearer <admin_token>
```

### Approve member

```http
PATCH /admin/members/{membership_id}/approve
Authorization: Bearer <admin_token>
```

### Reject member (optional)

```http
PATCH /admin/members/{membership_id}/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "ID document unclear"
}
```

### Pending SACCOs

```http
GET /admin/saccos/pending
Authorization: Bearer <admin_token>
```

### Approve SACCO

```http
PATCH /admin/saccos/{sacco_id}/approve
Authorization: Bearer <admin_token>
```

### Reject SACCO

```http
PATCH /admin/saccos/{sacco_id}/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Missing compliance papers"
}
```

### Audit logs

```http
GET /admin/audit-logs?limit=50&offset=0
Authorization: Bearer <admin_token>
```

---

## 6. Public SACCO list (member signup picker)

```http
GET /saccos
GET /saccos?country=KE
GET /saccos?name=Demo
```

Browser-friendly GET endpoints.

---

## Response format

Success:

```json
{ "success": true, "data": { ... } }
```

Error:

```json
{ "success": false, "error": "message" }
```

---

## Recommended test order

1. `/health` + `/ready`
2. Login project admin
3. `GET /saccos` → copy Demo SACCO id
4. Register + onboard member → admin approve
5. Register SACCO admin → create/submit SACCO → admin approve
6. `GET /admin/audit-logs` → confirm entries

---

## 7. Transactions (Phase 6)

**Prerequisites:** Active member on an **approved** SACCO (complete member onboarding + admin approval first).

### Create transaction (member)

```http
POST /transactions
Authorization: Bearer <active_member_token>
Content-Type: application/json

{
  "sacco_id": "<approved_sacco_uuid>",
  "transaction_type": "deposit",
  "amount": "1500.00",
  "currency": "KES",
  "description": "Monthly savings"
}
```

`currency` comes from the request — not hardcoded by the server.

### List transactions

```http
GET /transactions
GET /transactions?status=recorded&limit=20
Authorization: Bearer <token>
```

### Get one

```http
GET /transactions/{transaction_id}
Authorization: Bearer <token>
```

### Verify proof hash (DB layer)

```http
GET /transactions/{transaction_id}/verify
Authorization: Bearer <token>
```

Expected when intact: `"verified": true`

### Anchor on Stellar (requires env vars)

Set in `.env`:

```env
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
STELLAR_SOURCE_SECRET=<your-testnet-secret>
STELLAR_SOURCE_PUBLIC_KEY=<your-testnet-public-key>
STELLAR_ANCHOR_AMOUNT=0.0000001
```

Create a testnet account at [Stellar Laboratory](https://lab.stellar.org/account/create?network=test), fund it with **Friendbot**, and paste the secret + public key into `.env`. Restart the API after changing env vars.

```http
POST /transactions/{transaction_id}/anchor
Authorization: Bearer <token>
```

Success: `data.stellar_tx_hash` is set and status becomes `anchored`. View the tx on [Stellar Expert (testnet)](https://stellar.expert/explorer/testnet).

Re-run verify — both DB and on-chain checks should pass:

```http
GET /transactions/{transaction_id}/verify
Authorization: Bearer <token>
```

Returns **503** if Stellar env is not configured (by design — no hardcoded keys).

---

## 8. SACCO operations (Phase 8)

### Public SACCO ledger (browser — no auth)

```http
GET /saccos/{sacco_id}/public
```

Returns SACCO name, member count, transaction stats, and recent transactions (no member PII).

### List SACCO members (admin or cashier)

Project admin can also call this for any approved SACCO.

```http
GET /saccos/{sacco_id}/members
GET /saccos/{sacco_id}/members?status=active
Authorization: Bearer <sacco_staff_or_project_admin_token>
```

### Promote member to cashier (SACCO admin only)

```http
PATCH /saccos/{sacco_id}/members/{membership_id}/role
Authorization: Bearer <sacco_admin_token>
Content-Type: application/json

{ "role": "cashier" }
```

### Suspend / reactivate member (SACCO admin only)

```http
PATCH /saccos/{sacco_id}/members/{membership_id}/suspend
PATCH /saccos/{sacco_id}/members/{membership_id}/activate
Authorization: Bearer <sacco_admin_token>
```

### Cashier records transaction for a member

Use `membership_id` of the target member (cashier/admin only):

```http
POST /transactions
Authorization: Bearer <cashier_token>
Content-Type: application/json

{
  "sacco_id": "<sacco_uuid>",
  "membership_id": "<target_member_membership_uuid>",
  "transaction_type": "deposit",
  "amount": "500.00",
  "currency": "KES",
  "description": "Counter deposit"
}
```

---

## Tools

- **Swagger UI:** http://localhost:8080/docs (Authorize with Bearer token for protected routes)
- **Postman / Thunder Client:** import `openapi/openapi.yaml`
- **Browser:** GET endpoints only; POST/PATCH need Postman or Swagger UI
