# Live end-to-end test (SKIP_KYC on for testing)

KYC document uploads are **skipped** while `SKIP_KYC=true` / `VITE_SKIP_KYC=true`.  
**Before pilot:** set both to `false` (Render + Vercel) to restore KYC.

SACCO **platform approval** and **member admin approval** still run — only docs/cameras are bypassed.

---

## Accounts

| Who | Phone | PIN | Where |
|-----|-------|-----|--------|
| Platform admin | `+256764331334` | `0909` | `/auth` → Staff → `/sc-project-master-gate` |
| Demo platform admin | `+256700000001` | `1234` | same (needs seed migrations) |

Use **new** phone numbers for SACCO admin + member (not already registered).

---

## Flow to walk

### 1) Platform admin
1. Open live frontend (Vercel).
2. `/auth` → Staff Login → platform admin phone + PIN.
3. You land on **Project Admin** (`/sc-project-master-gate`).
4. Keep **SACCO Approvals** tab ready.

### 2) Create a SACCO (new browser / incognito)
1. Go to **Register Your SACCO** (`/register-sacco`).
2. Step 1: admin name + phone + PIN → creates account.
3. Steps 2–3: SACCO name, type, address, official MoMo phone.
4. Step 4 **Documents** — skipped when `SKIP_KYC` (auto-continues).
5. Step 5: chairman/secretary names + IDs (camera optional when skip).
6. Submit → **Verification pending** (waiting for platform admin).

### 3) Platform admin approves SACCO
1. Back on project admin → **SACCO Approvals**.
2. Approve the new SACCO.
3. SACCO admin: refresh / re-login → **Admin Dashboard**.

### 4) SACCO admin setup
1. **Payment Settings** — set official MTN/Airtel payee numbers (real MoMo numbers for your SACCO).
2. Optional: create loan product.
3. Open **Pending Approvals** tab.

### 5) Member joins
1. Incognito → `/auth` → Member sign up.
2. Pick the new SACCO → register.
3. With `SKIP_KYC`: **no document upload** → waiting screen until SACCO admin approves.
4. SACCO admin → Pending Approvals → **Approve**.
5. Member refresh → **Member Dashboard** (Pay Now, loans, etc.).

### 6) Optional cashier
1. Member signs up as usual (or staff note on signup).
2. SACCO admin promotes them to **cashier** after approval.
3. Staff Login as cashier → deposit/withdrawal flows.

### 7) Payments smoke
1. Member → Pay Now → purpose **savings** → confirm fee line (~1.5%).
2. Without live MTN/Airtel merchant keys, expect manual USSD instructions (not STK yet).
3. Public ledger: `/ledger/:stellarHash` after any anchored tx.

---

## Pilot switch (turn KYC back on)

| Where | Set to |
|-------|--------|
| Render API env | `SKIP_KYC=false` |
| Vercel / frontend env | `VITE_SKIP_KYC=false` |
| `frontend/.env.production` | `VITE_SKIP_KYC=false` |
| Redeploy | API + frontend |

---

## If something fails

- **Login fails for platform admin** → run migration `000009` on Neon.
- **CORS errors** → add your Vercel URL to Render `CORS_ALLOWED_ORIGINS`.
- **API timeout** → wake Render free tier (open `https://sente-chain.onrender.com/health`).
- **No SACCOs on signup** → SACCO not approved yet, or wrong country filter.
