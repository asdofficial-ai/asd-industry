# ASD Industry Founder Account — Secure Activation (v1.0 staging)

**The Founder Page is implemented. Founder credentials are not provisioned and the backend remains OFF.**

## Founder Account responsibilities

- Signed-in Founder controls staff access, project assessments, human approval decisions, specialist report policy, audit visibility and the seven full-screen visual modes.
- The Founder role exists only in a protected database row; not in public profile data or browser storage.
- Live platform membership, real youth messages, payments and public project databases are NOT connected to this staff console.

## New authentication requirement

A Founder must sign in using all of:

1. A private, pre-provisioned Founder email.
2. A strong password (16+ characters) stored as a salted scrypt hash.
3. A six-digit time-based (TOTP) code from an authenticator app.

Each TOTP seed is encrypted with AES-256-GCM at rest, bound to the staff record. The server accepts a 30-second code only once and stores the last used counter. Codes outside the normal time window or reused codes are rejected. Password-only Founder authentication is forbidden.

The backend **cannot be enabled** without `STAFF_MFA_KEY` — a random 32-byte key expressed as 64 hexadecimal characters. Never print this key in web build logs, commit it, or paste it into chat. Any MFA seed recovery or resetting must be performed only after an independently verified identity-recovery process, by a trusted human administrator.

## Setup sequence in a trusted private environment

1. Confirm ownership of the dedicated ASD Industry Neon project (`plain-moon-61920823`) and its database `asd_industry_staff`. Do not connect to ASD Pay or ASDP Staging.
2. Run the private migration command with `STAFF_ADMIN_DB_URL`: `npm run staff:migrate`. All three migrations are idempotent and apply the schema for staff, Founder controls, and encrypted TOTP.
3. Configure a restricted LOGIN role for staff runtime. It should inherit **only** `asd_industry_staff_runtime`. Save the new login and TLS connection URL **only** in Render's secret environment configuration, never in a document or chat. The runtime is not entitled to create roles or schema objects.
4. The Founder provides the email address for their account privately through the trusted provisioning interface; a trusted operator runs `npm run staff:provision` using `STAFF_ADMIN_DB_URL`, `NEW_STAFF_EMAIL`, `NEW_STAFF_PASSWORD` and `NEW_STAFF_ROLE=founder`. No account should be created until that email's ownership is independently verified.
5. In the trusted terminal, set `STAFF_MFA_KEY` and `CONFIRM_FOUNDER_MFA_SETUP=I_AM_ON_A_PRIVATE_TERMINAL`, then run `npm run staff:enroll-mfa` with `NEW_STAFF_EMAIL`. The URI printed **in the private terminal only** contains a secret — never transmit it through chat or screenshots; use it to enroll the Founder authenticator.
6. On a trusted, HTTPS-only adult-test staff environment, set `STAFF_ORIGIN` to the exact origin, `STAFF_DB_URL` to the restricted connection, `STAFF_SESSION_PEPPER` to a random secret (32+ characters), and `STAFF_MFA_KEY` to the enrollment encryption key. Keep `STAFF_ADMIN_DB_URL` out of Render.
7. Verify network TLS, sign-in, invalid password, wrong code, replayed code, logout, administrative role checks and audit events with only synthetic adult-test project data. Then, and only then, consider setting `STAFF_BACKEND_ENABLED=true` for the separate adult-only test deployment.
8. Before real production use: Founder MFA recovery procedures, password reset, anti-phishing protection, staff MFA, age/privacy safeguards, minor safeguarding/moderation and external security assessment.

## Access URLs

- Founder private entry: `/founder-login.html`
- Founder portal: `/founder.html`
- Human staff console: `/staff-console.html`
- Public-facing platform: **separate** main Render service; don't merge this draft branch to main.

## Verification

The system's development tests cover RFC 6238 TOTP generation, encrypted seed authentication, expired and replayed codes, mandatory MFA before Founder sessions, denied non-Founder access, staff/reviewer role restrictions, project-review approvals and audit records. GitHub Actions uses an ephemeral PostgreSQL database.

**The Founder Account is not yet activated.** User choice of Founder email and private password setup are still required. Do not claim this beta is ready to accept data from minors or to provide secure team chat.
