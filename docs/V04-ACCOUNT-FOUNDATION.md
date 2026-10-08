# ASD Industry v0.4 — Account foundation (development branch)

**Status: staged implementation, not public registration.**
Branch: `feature/v0.4-safe-account-foundation`.

## What it provides

The public website stays the v0.3.1 **browser-local demo**. This branch adds:

- PostgreSQL migration for an **isolated ASD Industry** accounts table, profiles and hashed session records.
- A fail-closed API under `/api/beta`; **all write and identity endpoints return 503 unless explicitly enabled**.
- A limited, invite-only **18+ tester** registration and login path with mandatory email confirmation before activation.
- Adult beta profile updates, session cookies and logout.
- Passwords stored only as memory-hard salted scrypt hashes.
- Opaque session tokens sent in HttpOnly, SameSite=Strict cookies; only their SHA-256 hashes are stored in the database.
- Origin checks, JSON content-type enforcement, request-size limits and an in-memory rate limiter.
- Tests demonstrating under-18 rejection and disabled beta behavior.

**The production landing page is not wired to this account API** on the public site.

## Endpoint and data scope

| Route | Action | Availability |
|---|---|---|
| GET /api/beta/status | Reports closed/open state | Always |
| POST /api/beta/signup | Invite-only adult tester signup; sends 6-digit code | Only when configured |
| POST /api/beta/verify-email | Confirms 6-digit code and activates adult account | Only when configured |
| POST /api/beta/resend-verification | Rate-limited replacement code | Only when configured |
| POST /api/beta/login | Adult tester login | Only when configured |
| GET /api/beta/me | Current tester profile | Only when configured |
| PATCH /api/beta/profile | Update role, interests, availability | Only when configured |
| POST /api/beta/logout | Revoke session | Only when configured |

In this milestone, signup requires `handle`, `email`, `password` (12+ characters), `ageGroup="18+"`, and `inviteCode`. **Role, availability, and interests are intentionally collected later** when the user starts building a project. It does **not** imply age verification, verified email, or a full identity system. The beta is intended only for authorized adult testers and should not be advertised as publicly available.

## Local checks

```bash
npm install
npm run check
npm test
```

By default `ACCOUNTS_BETA_ENABLED` is unset and all endpoints except status return HTTP 503. No database connection is attempted in disabled mode.

**To initialize a separate database later:** set a dedicated `DATABASE_URL` (never the ASD Pay DB) in the private backend environment and run `npm run db:migrate` manually. Before enabling beta endpoints, also set a long random `BETA_INVITE_CODE`, `PUBLIC_ORIGIN` equal to the private beta web origin, and `ACCOUNTS_BETA_ENABLED=true`. Use HTTPS and `NODE_ENV=production`. Do not place credentials in GitHub files or browser code.

## What is deliberately not done

1. **No live accounts for ages 12–17.** User-supplied age bands are insufficient age verification.
2. **No real group chat.** Real young-user messaging requires safeguarding, reporting, blocking, moderation, abuse-response operations, and guardian workflows.
3. No production invitation distribution, password recovery, or account deletion/export yet. The email-verification implementation is staged; no email provider credentials or real database are connected.
4. No real payments, equity contracts or cash handling.
5. No automatic database migration/deployment to public Render.
6. In-memory rate limiting is insufficient for multi-instance or high-volume services; a shared rate-limit store and additional defenses are needed before wider testing.

## Next engineering gates

Before any youth-facing launch: qualified Nigerian privacy/child-safety legal review; age assurance; verified guardian consent where required; consent revocation; default-private profiles; verified guardianship process; human moderation and abuse escalation; child-appropriate content and contact safeguards; data retention/deletion policy; security testing; authentication hardening (email verification, account recovery, session revocation); monitoring and incident-response procedures; independent risk review of the 30/70 ownership concept.

No API flag should bypass these safeguards for minors.

## Email verification (staged)

Signup requires a valid email and password for invited **18+ adult testers**, but project role, skills and interests are not requested during registration. These belong in project setup.

The signup endpoint creates an unverified account and sends a six-digit code by the configured Resend transactional-email provider. Code entry is available at `POST /api/beta/verify-email` and resend at `POST /api/beta/resend-verification`. Codes expire after 10 minutes, have five verification attempts, are rate-limited at the API, and are stored as keyed HMAC digests (never plaintext). A new valid code replaces the previous one, with a 60-second resend interval. The login route and session creation reject unverified accounts.

The new separate adult-beta sign-up interface is at `/beta-signup.html` **on the development branch only**. It displays a disabled/unavailable state without the server-side email and database configuration. The public landing page remains a separate local demonstration.

Required backend variables, in addition to the existing invite-only flags and dedicated DATABASE_URL:

- `EMAIL_OTP_PEPPER`: random secret at least 32 characters
- `RESEND_API_KEY`: transactional email provider API key
- `VERIFICATION_EMAIL_FROM`: verified sender address on the email provider

Use `npm run db:migrate` to apply both SQL migrations. No emails can be sent or received until the owner configures a verified domain and sending provider.

Email verification proves control of an address. **It does not prove age or guardian consent.** Real minor accounts remain disabled.
