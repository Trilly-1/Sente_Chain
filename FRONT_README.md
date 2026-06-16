# SenteChain Frontend

## Overview

SenteChain is a blockchain-backed SACCO management platform that provides transparent financial record keeping, member onboarding, savings tracking, loan management, and public transaction verification.

The frontend serves four user groups:

- Members
- Cashiers
- SACCO Administrators
- Project Administrators

The system integrates with blockchain transaction verification and supports SACCO onboarding, member KYC verification, loan processing, and audit tracking.

---

## Technology Stack

| Technology | Purpose |
|------------|----------|
| React 19 | Frontend Framework |
| Vite | Build Tool |
| React Router | Routing |
| TypeScript | Application Logic |
| CSS / Tailwind CSS | Styling |
| LocalStorage | Currency Preferences |
| Browser Camera API | Identity Verification |
| REST API | Backend Communication |

---

## Project Structure

```text
src/
├── components/
├── context/
├── pages/
├── services/
├── api/
├── data/
├── styles/
├── App.jsx
└── main.jsx
```

## Available Routes

| Route | Description |
|---------|-------------|
| / | Landing Page |
| /auth | Login & Registration |
| /register-sacco | SACCO Registration |
| /member-onboarding | Member KYC |
| /member-verification-pending | Member Review Status |
| /verification-pending | SACCO Review Status |
| /dashboard | Role-Based Dashboard |
| /sacco/:saccoId | Public SACCO Ledger |
| /sc-project-master-gate | Project Admin |

---

## User Roles

### Member
- View savings balances
- View Stellar blockchain-verified transactions
- Complete identity KYC onboarding
- Apply for cooperative loans with real-time interest calculation
- Track active loan balances, monthly installment dates, and amortization schedules
- Repay outstanding loan balances via simulated mobile money prompts

### Cashier
- Review pending loan applications
- Approve or reject loan requests (disbursing funds on-chain)
- Track active and completed cooperative loans
- Search member registry and inspect transaction history

### Admin
- Manage member accounts and profiles
- Change user roles (e.g. promoting a member to cashier)
- Suspend or activate member accounts
- View SACCO audit logs for compliance tracking

### Project Admin
- Approve or suspend partner SACCO registration requests
- Monitor global platform assets and activity stats
- Access platform-wide audit logs

---

## KYC & Onboarding Flows

SenteChain implements rigorous KYC (Know Your Customer) and AML (Anti-Money Laundering) checks during onboarding for both SACCOs and individual members.

### 1. SACCO Onboarding Process (`/register-sacco`)
A 6-step registration and KYC wizard designed for SACCO administrators:

*   **Step 1: Admin Account Creation**
    *   **Goal:** Register the primary SACCO administrator (typically the Chairman).
    *   **Inputs:** Full Name, Country & Phone Number (supports EAC prefix selector: 🇰🇪 Kenya, 🇺🇬 Uganda, 🇹🇿 Tanzania, 🇷🇼 Rwanda, 🇧🇮 Burundi, 🇸🇸 South Sudan), and a 4-digit security PIN.
    *   **Action:** Registers the admin on the backend via the `/auth` registration endpoint and logs them into a restricted session.
*   **Step 2: SACCO Legal Identity**
    *   **Goal:** Capture the official corporate identity of the cooperative.
    *   **Inputs:** SACCO Legal Name and SACCO Type (selection of *Deposit-taking*, *Non-deposit taking*, or *Community-based*).
*   **Step 3: Contact & Location**
    *   **Goal:** Capture corporate address details for verification.
    *   **Inputs:** Headquarters Address (Street, Building, Floor), Official Phone (with EAC prefix), and Official Email.
*   **Step 4: Document Uploads**
    *   **Goal:** Submit legal compliance documentation for regulatory checks.
    *   **Documents Required:** Registration Certificate, Operational License, and TIN/PIN Certificate.
    *   **Requirements:** PDF, PNG, or JPG formats under 5MB. *(Note: Upload handling is currently simulated in the frontend visual UI).*
*   **Step 5: Key Officials Verification (Liveliness Check)**
    *   **Goal:** Verify the identities of the top board members: the Chairman and the Secretary.
    *   **Inputs:** Full Name and National ID Number for both officials.
    *   **Liveliness Check:** Uses the browser's `Camera API` (via `getUserMedia`) to capture a live portrait inside an oval bounding box, confirming physical presence and verifying their face details.
*   **Step 6: Review & Final Submission**
    *   **Goal:** Verify entered details and agree to regulatory terms.
    *   **Action:** Displays a summary of the SACCO and Chairman details, requiring acceptance of Terms of Service, Privacy Policy, and regional cooperative regulations before submission.

#### SACCO Verification Pending State (`/verification-pending`)
Upon submission, the SACCO administrator is redirected to this state:
*   Displays estimated completion time (typically 24–48 hours).
*   Tracks step-by-step progress: *Submitted* ➔ *Doc Check* ➔ *Gov API Verification* ➔ *Final Review* ➔ *Active*.
*   Handles status-driven UI:
    *   `under_review`: Application reads as pending.
    *   `action_required`: Prompts the administrator to fix issues (e.g. re-upload a blurry TIN scan).
    *   `approved`: Redirects or unlocks full dashboard features.
*   Restricts access to core platform features (like member onboarding or stellar wallets) until the SACCO status is fully approved.

---

### 2. Member Sign-Up & KYC Process (`/member-onboarding`)
A 2-step onboarding wizard for individual members joining an approved SACCO:

*   **Step 1: Verify Your Identity**
    *   **Goal:** Upload identity documents for verification against official government registries.
    *   **Documents Required:** Clear photographs/scans of the **Front of National ID/Passport** and **Back of National ID/Passport**.
    *   **Requirements:** PDF, JPG, or PNG formats under 5MB.
*   **Step 2: Final Review**
    *   **Goal:** Confirm submission details and grant consent.
    *   **Consent:** Member must check the consent box agreeing to the Terms of Service, Privacy Policy, and authorizing the SACCO to verify their documents against regional government databases.

#### Member Verification Pending State (`/member-verification-pending`)
Upon submission, the member's status is set to `under_review` and they are navigated to a pending review page:
*   Displays status check for each submission: *National ID (Front)* [Verified], *National ID (Back)* [Verified], *Liveliness Selfie* [In Review].
*   Restricts member dashboard features, notifying the user that manual review by the SACCO administrators takes up to 24–48 hours to ensure compliance with regional cooperative regulations.

---

### 3. Loan Application & Repayment Flow (`/dashboard`)
For verified members managing cooperative credit and loans on their dashboard:

*   **Apply for a Loan:**
    *   **Goal:** Submit a formal request to the SACCO cashier for loan disbursement.
    *   **Inputs:** Loan Amount, Term Duration (3, 6, 12 months), Purpose of Loan, Collateral, and Guarantor Name.
    *   **Calculation:** The UI calculates and displays a real-time summary using a flat 12% annual interest rate, showing total interest charges, total repayable, and the exact monthly installment amount.
    *   **Submission:** Creates a pending request, which is visible to Cashiers for approval/rejection and updates the member's dashboard with a `Pending Cashier Review` state.
*   **Amortization Schedule tracking:**
    *   **Goal:** View month-by-month repayment deadlines and amounts.
    *   **UI:** An accordion schedule showing Month number, Due Date, Installment amount, and status badge (*Paid* vs. *Upcoming*).
*   **Mobile Money Loan Repayment:**
    *   **Goal:** Pay off outstanding balances directly from mobile wallets.
    *   **Action:** Members click "Repay Loan", specify the amount to pay, and enter their phone number. The UI simulates a Mobile Money push PIN prompt (supporting MTN MoMo / Airtel Money / M-Pesa), updates the remaining balance and schedule status upon approval, and adds a repayment entry to the transaction ledger.

---

## Backend Requirements

### Authentication & Token Propagation
All authenticated requests must include the JWT token in the `Authorization` header as a Bearer token:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Endpoints Contract

#### 1. Authentication
*   **Login: `POST /auth/login`**
    *   **Request Body:**
        ```json
        {
          "phone": "string",
          "pin": "string (4 digits)",
          "role_code": "string (optional, for staff access)"
        }
        ```
    *   **Response Body:**
        ```json
        {
          "token": "string",
          "member_id": "string",
          "name": "string",
          "phone": "string",
          "role": "string",
          "sacco_id": "string",
          "balance_kes": 0,
          "status": "pending_kyc | under_review | approved | suspended"
        }
        ```
    *   *Warning to Dev:* The login page (`Login.jsx`) currently verifies credentials against the static mock dataset `DEMO_USERS` directly in the UI logic and does not invoke the `apiLogin` service helper. This must be refactored to make the API call when transitioning to the backend.

*   **Register Member / Admin: `POST /members`**
    *   **Request Body:**
        ```json
        {
          "name": "string",
          "phone": "string",
          "role": "string (e.g. member | admin)",
          "saccoId": "string"
        }
        ```
    *   **Response Body:**
        ```json
        {
          "token": "string",
          "member_id": "string",
          "name": "string",
          "phone": "string",
          "role": "string",
          "sacco_id": "string",
          "status": "pending_kyc",
          "balance_kes": 0
        }
        ```
    *   *Warning to Dev:* During SACCO registration (`SACCORegistration.jsx`), the admin creates a 4-digit PIN. The UI submits this PIN to `apiRegister`, but the helper function in `src/services/api.js` currently omits it in the request payload. The backend registration API will need to accept `pin` in the payload for account credentials.

#### 2. Members Management
*   **Get All Members: `GET /members`**
    *   **Response Body:**
        ```json
        [
          {
            "id": "string",
            "name": "string",
            "phone": "string",
            "role": "string",
            "status": "string",
            "balance_kes": 0
          }
        ]
        ```
*   **Update Member Role: `PATCH /members/:id/role`**
    *   **Request Body:**
        ```json
        {
          "role": "string (member | cashier | admin)"
        }
        ```
    *   **Response Body:**
        ```json
        { "success": true }
        ```
*   **Update Member Verification Status: `PATCH /members/:id/status`**
    *   **Request Body:**
        ```json
        {
          "status": "string (pending_kyc | under_review | approved | suspended)"
        }
        ```
    *   **Response Body:**
        ```json
        { "success": true }
        ```
*   **Get Member Transactions: `GET /members/:id/transactions`**
    *   **Response Body:**
        ```json
        [
          {
            "id": "string",
            "type": "string (Deposit | Withdrawal | Loan Disbursed | Repayment)",
            "amount": 0,
            "date": "string (ISO timestamp)",
            "status": "string (Completed | Pending | Failed)",
            "reference": "string (blockchain tx hash / reference ID, optional)"
          }
        ]
        ```

#### 3. Loan Processing
*   **Get All Loans: `GET /loans`**
    *   **Response Body:**
        ```json
        [
          {
            "id": "string",
            "memberId": "string",
            "memberName": "string",
            "amount": 0,
            "termMonths": 0,
            "interestRate": 0,
            "purpose": "string",
            "status": "string (Pending | Approved | Rejected)",
            "date": "string (ISO timestamp)"
          }
        ]
        ```
*   **Approve Loan Application: `POST /loans/:id/approve`**
    *   **Response Body:**
        ```json
        { "success": true }
        ```
*   **Reject Loan Application: `POST /loans/:id/reject`**
    *   **Response Body:**
        ```json
        { "success": true }
        ```

#### 4. SACCO General
*   **Get SACCO Summary: `GET /sacco/:id/summary`**
    *   **Response Body:**
        ```json
        {
          "totalAssets": 0,
          "totalSavings": 0,
          "activeLoans": 0,
          "memberCount": 0,
          "name": "string",
          "licenseNumber": "string",
          "status": "string (under_review | approved)"
        }
        ```

#### 5. Platform Administration & Public
*   **Get Audit Log: `GET /audit`**
    *   **Response Body:**
        ```json
        [
          {
            "id": "string",
            "action": "string",
            "performedBy": "string",
            "details": "string",
            "timestamp": "string"
          }
        ]
        ```
*   **Submit Contact Form: `POST /contact`**
    *   **Request Body:**
        ```json
        {
          "name": "string",
          "email": "string",
          "message": "string"
        }
        ```
    *   **Response Body:**
        ```json
        { "success": true }
        ```
*   **Health Check: `GET /health`** (defined in frontend helper but not actively polled)
    *   **Response Body:**
        ```json
        {
          "status": "ok",
          "mode": "string"
        }
        ```

#### 6. Alternative / Legacy API Endpoints (Defined in `src/api/` but currently unused)
*   **Lookup Member: `GET /members/lookup?phone={phone}`**
    *   **Response Body:** `{ "member_id": "string", "name": "string", "phone": "string", "sacco_id": "string" }`
*   **Record Loan Transaction: `POST /transactions/loan`**
    *   **Request Body:** Loan metadata and principal parameters.
*   **Record Repayment: `POST /transactions/repay`**
    *   **Request Body:** Repayment metadata and amount details.

---

## Environment Variables

```env
VITE_API_URL=https://api.sentechain.app
```

---

## Development Setup

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Preview:

```bash
npm run preview
```

---

## Known Gaps

- KYC uploads not fully integrated.
- SACCO document uploads not connected.
- Password reset not implemented.
- Project admin route requires authorization enforcement.
- Registration PIN is collected but not forwarded by the active registration API.

---

