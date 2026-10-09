# ASD Industry — Google Founder Email Verification (v1.1)

This upgrade allows the Founder to use an existing personal Gmail address; **no custom company domain or paid business email is required**.

## What it does

- `/founder-login.html` offers Google Sign-In using Google's official Identity Services (GIS) button.
- Google's official Node auth library verifies token signature, issuer, audience, and expiration on the server.
- ASD Industry separately requires an email that Google marks as verified, an exact match to `FOUNDER_PENDING_EMAIL`, and a stable Google `sub` identity.
- A successful `POST /api/staff/google-verify` stores only the verified email and Google subject in the restricted ASD Industry database. It **never** creates an account, session or Founder role.
- A later `POST /api/staff/google-login` can authenticate a **separately provisioned, enabled Founder** only if the signed Google token matches the stored email/sub and an enrolled single-use TOTP code is valid.
- The existing password+TOTP option remains available for Founder account recovery under trusted procedures.
- The private login's Content Security Policy permits Google's script and iframe **only on the login page**.

## Configuration — Google Sign-In does not work until these are supplied

Google's web OAuth client ID is needed; it is a **public client identifier, not a secret**.

1. Visit [Google Cloud Console](https://console.cloud.google.com/) and create/select a free project. Register the web OAuth app in Google Auth Platform. Use a Web application OAuth 2.0 Client ID.
2. Authorized JavaScript origin for the present development preview:
   `https://asd-industry-staff-v07-preview.onrender.com`
3. For the **popup-mode GIS button** currently implemented, no redirect callback URI is used. Keep Google's supported/authorized origin exact.
4. If the Google project is in testing mode, add the chosen Founder Gmail as a permitted test user where required.
5. Set in the separate Render preview environment (not the public platform and not GitHub):
   - `GOOGLE_CLIENT_ID=<public web client ID ending in .apps.googleusercontent.com>`
   - `FOUNDER_PENDING_EMAIL=<Founder Gmail you have verified through the browser>`
   - `FOUNDER_GOOGLE_VERIFICATION_ENABLED=true`
   - `STAFF_ORIGIN=https://asd-industry-staff-v07-preview.onrender.com` (exact)
   - Existing restricted `STAFF_DB_URL` (Neon ASD Industry only)
6. Leave `STAFF_BACKEND_ENABLED=false` and `AI_STAFF_ENABLED=false` throughout **email verification**.
7. Open the Founder login page and click **Continue with Google**. The backend validates Google's signature and exact Founder email before recording the proof in `industry_founder_google_claims`.
8. This verifies email ownership **only**. A trusted, separately audited Founder provisioning and authenticator-enrollment workflow is still required before privileged login may be safely activated.

**Never ask the user for their Gmail password, a Google JWT, authentication cookies, or their six-digit authenticator codes in chat.**

## Configuration flags

- `FOUNDER_GOOGLE_VERIFICATION_ENABLED=false` by default.
- `GOOGLE_CLIENT_ID` must be a valid Google web-client identifier.
- `FOUNDER_PENDING_EMAIL` identifies the single authorized personal email for initial proof.
- `STAFF_ORIGIN` must be an exact HTTPS origin.
- `STAFF_DB_URL` must be the separate restricted Neon login.
- `STAFF_BACKEND_ENABLED` remains disabled until independent Founder provisioning, MFA and safeguarding requirements are met.

## Database / API

`db/migrations/004_google_founder_email.sql` creates `industry_founder_google_claims` with unique Google subject binding. The runtime may read, insert and update `verified_at`, **not rewrite the bound Google subject**.

Public, non-privileged endpoints:
- `GET /api/staff/google-config`: feature status and public OAuth client ID only.
- `POST /api/staff/google-verify`: origin-limited, rate-limited, official Google JWT verified against the configured email; no privileged session.

Restricted endpoint (requires explicitly enabled staff backend):
- `POST /api/staff/google-login`: verified Google account **and** a pre-provisioned Founder account **and** mandatory TOTP; session is HttpOnly, Secure and SameSite=Strict.

## Known limits

Google Cloud Console project creation / OAuth client approval is an external user-owned action. The Google client ID has not been created or configured here. Until it is, the page displays an honest setup message instead of a fake functional button.

This is still a **development preview**, not a fully live youth platform; real minors, private chats and financial operations remain unenabled.
