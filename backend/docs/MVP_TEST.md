# MVP 1 Test Runbook

Production: https://sentechain.vercel.app | API: https://sente-chain.onrender.com

## Flow

1. Project admin approves SACCO + member
2. Admin: payment numbers, loan product, promote cashier
3. Cashier: deposit then withdrawal for member
4. Member: apply loan; cashier approve; repay

## Pass

- Deposit/withdrawal change balance
- Loan apply, approve, repay works
- Member cannot POST /transactions (403)

See API_TESTS.md for webhook simulation.
