# ASD Industry — AI-to-human support handoff launch gate

**State:** development-only; real customer messaging and handoff are disabled. This branch is not production-ready. Founder routes, credentials and production data must remain unchanged.

## Required customer journey
1. An authenticated customer first asks the AI Support Assistant.
2. A trusted server classifies the response: answered, cannot answer, insufficient confidence, action unsupported, permission denied, or human requested.
3. Only an unresolved/unauthorized request, or a customer's explicit request for a human, qualifies for a handoff. Never accept a browser-provided `verifiedServerSide` flag or an AI-generated link as authorization.
4. After customer authentication, the trusted AI assessment is persisted with a unique assessment ID and linked to the correct support case. The server issues an expiring one-use grant tied to a pseudonymous customer subject.
5. The customer redeems the grant against the same verified account and case. Redemption uses a single conditional database UPDATE so two tabs cannot redeem it twice. Wrong identity, wrong case, expired, revoked or consumed grants are rejected.
6. The server then establishes a customer-authorized conversation; staff case ownership and permissions remain independently enforced. Internal staff notes are never included in customer-facing history.
7. Each customer and human-agent message is auditable, idempotent, and delivered only after consent, privacy and operational readiness.

## Implemented but not activated
- `lib/support-handoff-core.js`: trusted AI escalation decision contract.
- `lib/support-handoff-store.js`: internal-only SQL grant issue/redeem/revoke helpers. **No public route imports this module.** Helpers require a transaction-owning caller to commit or roll back issuance and audit together.
- `db/migrations/007_ai_human_handoff_grants.sql`: unique AI assessment, short expiry, consumed/revoked state, audit events; **no grants to runtime DB roles**.
- `tests/support-handoff-store.test.js` and `tests/support-handoff-db.integration.test.js`: identity, replay, expiry, revocation, audit tests; integration requires disposable CI Postgres.
- Existing staff conversation trainer and mobile previews remain fictional, with no outbound delivery.

## Must be finished before launch
- Build actual customer signup/signin, verified sessions, MFA as appropriate, safe recovery and age/privacy protections.
- Implement a **server-owned AI assessment store**: the current `verifiedServerSide` flag is only a service-internal contract and is not independently cryptographically verified. Never expose it to client input.
- Integrate issuance and redemption inside a properly authenticated customer API, with one transaction and authorization checks linking customer/case; prevent cross-tenant cases.
- Add a true customer-safe transcript view, separate from internal staff notes, with retention, deletion/export policy and abuse controls.
- Add staff MFA, provisioning/offboarding, session revocation, verified badge administration, availability and escalation SLAs.
- Add persistent distributed rate limiting, CSRF defense, incident logs/alerts, human review for sensitive recovery, red-team testing and a security/privacy assessment.
- Test concurrent redemption with independent database connections, full customer ↔ AI ↔ human ↔ manager end-to-end journey, and failures/retries. Test only with synthetic adult identities until privacy review.
- Configure infrastructure and perform launch signoff. **No automatic production merge or unlock.**

## Current limitation
The staff-only conversation backend is a training simulator; it is **not** a live customer messaging backend. The offline AI-first UI is a design simulation, not proof that a real customer can contact a real agent. Do not represent either as live.
