# ASD Industry v0.7 — Human Staff Review Backend

**State: staged private adult-test implementation; not public registration, not production-ready.**

Development branch `feature/v0.7-human-staff-backend` continues v0.6's five AI staff roles and rule-based advisory reports.

## Who is allowed to do what?

| Role | Read review queue | Prepare advisory packet | Approve, request changes, decline |
|---|---|---|---|
| Founder (real authenticated staff) | Yes | Yes | Yes |
| Human reviewer | Yes | Yes | Yes |
| Human safety staff | Yes | Yes | **No** |
| AI agent or model | **No account** | Only through future controlled service | **Never** |
| Public visitor / builder | No | No | No |

The public platform's **`/review.html` remains a labeled local simulation** on this branch, separate from this real API foundation. The staff console lives at **`/staff-console.html`**. Its HTML and CSS are statically accessible, but real review records and API actions are protected by server-side staff sessions. When the backend is disabled, the staff page shows a disabled notice and no review records.

## Protected backend endpoints (all disabled except status until explicitly configured)

- `GET /api/staff/status`: safely reports whether private staff testing is enabled.
- `POST /api/staff/login`: password login for provisioned human staff, server-issued HttpOnly, Secure, SameSite=Strict session cookie.
- `GET /api/staff/me`: signed-in staff identity and reviewer role.
- `POST /api/staff/logout`: revoke staff session.
- `GET /api/staff/queue`: restricted review queue.
- `GET /api/staff/requests/:id`: full private review and most recent report.
- `POST /api/staff/intake`: reviewer-created **synthetic/adult-only test data** (no public or under-18 submissions).
- `POST /api/staff/requests/:id/prepare`: five-part **deterministic advisory packet**. Does not approve.
- `POST /api/staff/requests/:id/decision`: only founder or human reviewer sessions can approve, request changes or decline; a current packet and at least 12 characters of rationale are mandatory.

Role checks are in the backend. Decisions are recorded transactionally in dedicated staff tables and the audit log. Account passwords use salted scrypt. Session tokens are random, sent in secure cookies and stored only as HMAC digests. Staff accounts **cannot sign themselves up** and must be provisioned by a trusted operator. An AI model cannot obtain a staff review session via any documented AI endpoint.

## Database isolation and activation

**Do not use ASD Pay's Render DB or ASDP Staging's Neon project.** Set up a separately owned, ASD Industry-only Postgres database first. Schema is in `db/migrations/001_staff_review.sql`.

Safeguarded setup, from a trusted private environment:
1. `STAFF_DB_URL`: a new dedicated DB. Never commit it.
2. Run `npm run staff:migrate` manually.
3. Privately set `NEW_STAFF_EMAIL`, `NEW_STAFF_PASSWORD` (16+ chars) and `NEW_STAFF_ROLE` (`founder`, `reviewer`, `safety`), and run `npm run staff:provision`.
4. Set **all** `NODE_ENV=production`, `STAFF_BACKEND_ENABLED=true`, `STAFF_ORIGIN=https://...`, `STAFF_DB_URL`, and `STAFF_SESSION_PEPPER` (random secret 32+ chars) only on a dedicated HTTPS staff test service. Do not activate this on the public youth demo.
5. Staff access at `/staff-console.html` is only for trusted adult testers with the privately provisioned login.

Default: all staff routes except status return HTTP 503. No database query occurs in disabled mode.

## AI staff status

- Five specialist **rule-based** reports and the human handoff operate in the separate browser-local demo.
- The server's `/prepare` currently writes **deterministic-demo** report packets; this is not a model-generated report.
- The v0.6 `lib/ai-staff-runner.js` provider adapter remains **disabled** and unmounted. No real user text is sent to an AI provider.
- No models may sign in as humans, make decisions, grant recruitment privileges, contact children, open groups or transfer funds.

## Known release blockers

This is **not yet production-grade security**. Before connecting real human or under-18 project records: staff MFA/passkeys, staff account lifecycle, password reset and recovery, shared rate limits, stronger audit monitoring, rigorous account onboarding and age assurance, explicit guardian consent where applicable, safeguarding/moderation workflows, data minimization, anti-abuse review, email confirmation, backups, independent security review and verified server authorization for team memberships.

The `/api/staff/intake` endpoint only imports fictional or approved adult test descriptions, and the current simple content screening is inadequate to protect minors' personal details. Staff must never upload real minor records at this stage.

**The new staff database is independent of the older v0.4 email-registration branch.** A later consolidation will need deliberate migrations, authenticated users and integration tests.

## Checks

`npm install && node --test tests/portal-core.test.js tests/staff-workflow.test.js tests/ai-staff-runner.test.js tests/staff-auth.test.js`.

These are automated code-level checks; a live database, full authorization and end-to-end browser testing are still required before deployment with real users.
