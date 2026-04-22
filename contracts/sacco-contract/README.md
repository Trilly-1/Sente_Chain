# SenteChain SACCO Smart Contract (Soroban)

## Overview

SenteChain SACCO is a decentralized savings and credit cooperative (SACCO) built on the Stellar Soroban smart contract platform. The system enables members to save, access loans, and participate in governance while ensuring transparency and automated financial rules on-chain.

The contract manages member registration, deposits, loan lifecycle management, treasury accounting, and governance proposals.

---

## Contract Information

- Contract Name: sacco-contract  
- Contract ID: CCBYT7PYS5SP2T4UPVK7A2U5F57FSGAHAR2ZWVPXQXDLB7VRNNSR7WIB  
- Network: Stellar Testnet  
- Deployment Status: Active  
- WASM Target: wasm32-unknown-unknown  
- CLI Version Used: 25.2.0  

---

## Admin Account

The admin account has full control over SACCO operations including initialization, member registration, loan approval, and governance execution.

- Admin Address:  
  GAZV6GG4GDOGHEQ5XHPFP2BTDM3WYEUTMMGTJCNQD3XM2BBTGYMTWBSL  

---

## Member Accounts

Example test member used during deployment:

- Name: Alice  
- Address: GCFWZKR2Z7LDQDHHB5LL34E3XLIT467SHGHGX7JJF5AJEEYC7E6S2R7R  

---

## Core Functionalities

### 1. Initialization
Initializes the SACCO configuration including:
- Admin assignment
- Interest rate setup
- Loan multiplier configuration
- Treasury initialization
- Governance counters

---

### 2. Member Management
- Register new members
- Track member savings history
- Maintain member status (Active, Suspended, Exited)
- Store personal and financial data

---

### 3. Savings (Deposits)
Members or admin record deposits which:
- Increase member savings balance
- Increase SACCO treasury
- Update total SACCO deposits
- Track saving months

---

### 4. Loan System

#### Loan Eligibility
A member is eligible if:
- Account is active
- Minimum saving months met (default: 3)
- Has fewer than 2 active loans
- Treasury has sufficient funds

#### Loan Lifecycle
- Request loan
- Approve loan (admin)
- Disburse loan (admin)
- Repay loan (member)

#### Interest Calculation
Interest is computed using:
- Annual rate in basis points
- Loan term in months

---

### 5. Treasury Management
The treasury tracks SACCO liquidity:
- Increased by member deposits and repayments
- Decreased by loan disbursements

---

### 6. Governance System
Members participate in SACCO governance through proposals:

- Create proposals
- Vote on proposals
- Execute passed proposals

Proposal types include:
- Interest rate adjustment
- Loan multiplier adjustment
- Minimum saving months adjustment
- General governance actions

---

## Business Rules

- Minimum saving period: 3 months
- Maximum active loans per member: 2
- Default interest rate: 15% annual (1500 basis points)
- Loan multiplier: 3x member savings
- Voting quorum: 51% of total members

---

## Deployment Flow

1. Contract compiled using Rust and Soroban SDK
2. WASM built for wasm32-unknown-unknown target
3. Contract deployed to Stellar Testnet
4. Initialization executed by admin
5. Members registered and onboarded
6. Financial operations tested (deposit, loan, repayment)

---

## Example Workflow

1. Admin initializes SACCO
2. Admin registers member Alice
3. Alice makes multiple deposits
4. System evaluates loan eligibility
5. Alice requests loan
6. Admin approves and disburses loan
7. Alice repays loan over time
8. Treasury is updated automatically
9. Governance proposals are created and voted on

---

## Explorer Links

- Contract:  
  https://lab.stellar.org/r/testnet/contract/CCBYT7PYS5SP2T4UPVK7A2U5F57FSGAHAR2ZWVPXQXDLB7VRNNSR7WIB

- Transaction Explorer:  
  https://stellar.expert/explorer/testnet

---

## Technical Stack

- Rust (no_std environment)
- Soroban SDK
- Stellar CLI
- WebAssembly (WASM)
- Stellar Testnet

---

## Notes

- This project is deployed on Stellar Testnet for testing and development purposes.
- All financial operations are simulated on-chain.
- Contract uses deterministic storage patterns for SACCO state management.