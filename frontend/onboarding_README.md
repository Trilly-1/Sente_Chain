SenteChain Onboarding Flow

1. Member onboarding flow
- A person first signs up from the authentication page.
- The sign-up form collects country, SACCO name, name, phone number, and PIN.
- The frontend sends the data to the backend using apiRegister.
- After registration, the app logs the person in using apiLogin.
- The auth token is stored only in memory with setToken.
- The member status becomes pending_kyc.
- The app sends the user to /dashboard.
- The dashboard route checks the role and status.
- Because the status is pending_kyc, the user is routed to /member-onboarding.
- On the member onboarding page, the user uploads identification documents.
- The document submission includes the front and back of the ID or any required proof documents.
- The user reviews the uploaded documents before sending them.
- The user then submits the documents to the backend for verification.
- After submission, the frontend changes the member status to under_review.
- The app sends the user back to /dashboard.
- The dashboard route now sees under_review and shows /member-verification-pending.
- The member stays in that pending state until an admin approves the account.
- When approved, the status becomes active.
- Once active, the dashboard route sends the member to the Member Dashboard.

2. SACCO onboarding flow
- A user starts SACCO creation from the Register Your SACCO path.
- The frontend sends the user to /register-sacco.
- The first step collects admin details such as name, phone, and PIN.
- The frontend sends the admin data to the backend using apiRegister.
- The new SACCO admin is then logged in using apiLogin.
- The token is stored in memory with setToken.
- The SACCO owner is now authenticated and can continue.
- The next steps collect the SACCO profile information.
- This includes chairman details, secretary details, required documents, and verification data.
- The document submission includes the registration certificate, compliance papers, and any supporting verification files.
- The user reviews the full SACCO application before sending it.
- The user then submits the SACCO documents and details to the backend.
- After submission, the app sends the user to /verification-pending.
- This page means the SACCO onboarding is complete, but the SACCO is still waiting for approval.
- The submitted SACCO stays in review until the project admin checks it.
- If approved, the SACCO can move forward into the live system.
- If rejected, it stays blocked or returns to the registration flow depending on backend logic.

