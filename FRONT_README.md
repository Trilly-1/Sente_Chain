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
- View balances
- View transactions
- Complete KYC

### Cashier
- Review loans
- Approve or reject loans
- View member transactions

### Admin
- Manage members
- Change roles
- Suspend accounts
- View audit logs

### Project Admin
- Approve SACCOs
- Monitor platform activity
- Access global audit logs

---

## Backend Requirements

### Authentication
- POST /auth/login
- POST /members

### Members
- GET /members
- PATCH /members/:id/role
- PATCH /members/:id/status
- GET /members/:id/transactions

### Loans
- GET /loans
- POST /loans/:id/approve
- POST /loans/:id/reject

### SACCO
- GET /sacco/:id/summary

### Audit
- GET /audit

### Contact
- POST /contact

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

