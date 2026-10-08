# ASD Industry v0.4 — Account foundation (development branch)

**Status: staged implementation, not public registration.**
Branch: `feature/v0.4-safe-account-foundation`.

## What it provides

The public website stays the v0.3.1 **browser-local demo**. This branch adds:

- PostgreSQL migration for an **isolated ASD Industry** accounts table, profiles and hashed session records.
- A fail-closed API under `/api/beta`; **all write and identity endpoints return 503 unless explicitly enabled**.
- A limited, invite-only **18+ tester** registration and login path.
- Adult beta profile updates, session cookies and logout.
- Passwords stored only as memory-hard salted scrypt hashes.
- Opaque session tokens sent in HttpOnly, SameSite=Strict cookies; only their SHA-256 hashes are stored in the database.
- Origin checks, JSON content-type enforcement, request-size limits and an in-memory rate limiter.
- Tests demonstrating under-18 rejection and disabled beta behavior.

**No frontend path is wired to this account API** on the public site.

## Endpoint and data scope

| Route | Action | Availability |
|---|---|---|
| GET /api/beta/status | Reports closed/open state | Always |
| POST /api/beta/signup | Invite-only adult tester signup | Only when configured |
| POST /api/beta/login | Adult tester login | Only when configured |
| GET /api/beta/me | Current tester profile | Only when configured |
| PATCH /api/beta/profile | Update role, interests, availability | Only when configured |
| POST /api/beta/logout | Revoke session | Only when configured |

In this milestone, signup requires `handle`, `email`, `password` (12+ characters), `ageGroup="18+"`, `inviteCode`, `role`, `availability`, and an `interests` array. It does **not** imply age verification, verified email, or a full identity system. The beta is intended only for authorized adult testers and should not be advertised as publicly available.

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
3. No production invitation distribution, email verification, password recovery, or account deletion/export yet.
4. No real payments, equity contracts or cash handling.
5. No automatic database migration/deployment to public Render.
6. In-memory rate limiting is insufficient for multi-instance or high-volume services; a shared rate-limit store and additional defenses are needed before wider testing.

## Next engineering gates

Before any youth-facing launch: qualified Nigerian privacy/child-safety legal review; age assurance; verified guardian consent where required; consent revocation; default-private profiles; verified guardianship process; human moderation and abuse escalation; child-appropriate content and contact safeguards; data retention/deletion policy; security testing; authentication hardening (email verification, account recovery, session revocation); monitoring and incident-response procedures; independent risk review of the 30/70 ownership concept.

No API flag should bypass these safeguards for minors.
