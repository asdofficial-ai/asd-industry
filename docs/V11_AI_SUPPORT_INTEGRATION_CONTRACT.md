# ASD Industry — AI-first support integration contract (v1.1)

Status: DESIGN ONLY / NOT LIVE. This branch is isolated from main, Founder identity, ASD Pay and production.

## Trust boundaries
1. Customer identity is established by a trusted server-verified session, never a browser-provided role, customer ID or age flag.
2. Knowledge answers use the reviewed public catalog and disclose actual demo/planned/disabled status. No internal staff or Founder information is supplied.
3. The server evaluates unresolved, restricted, unsupported, or human-requested cases. The UI may request escalation but cannot authorize it.
4. Customer explicitly consents to share a minimal summary with Human Support. The server issues a short-lived, audience-bound, single-use handoff grant tied to customer session, support intent and nonce. Store only a hash of the grant; consume atomically.
5. Case creation uses an idempotency key, server-derived customer scope and a separate staff-only datastore. Never accept arbitrary agent assignment, role, case ownership or delivery flags from clients.
6. Agents can read only their assigned cases; Managers have separately audited access. Never disclose internal notes or draft replies to customers.
7. external_delivery remains false. Do not expose public ticket creation, outbound messaging or real staff provisioning in this development phase.

## Planned API (not implemented)
- POST /api/customer/support/assess — authenticated, CSRF-protected, rate-limited, grounded response + server decision.
- POST /api/customer/support/handoff-grant — authenticated consent and server-approved decision; opaque expiring grant.
- POST /api/customer/support/cases — atomically consume grant, enforce idempotency and create restricted case.
- GET /api/customer/support/cases/:id — verify ownership, return customer-safe fields only.

## Required negative tests before any implementation is considered safe
- Spoofed customer ID, employee role, age, consent or escalation decision denied.
- Replayed/expired/other-session grants denied; simultaneous redemption creates at most one case.
- Cross-customer and cross-agent reads denied, including error-message leakage.
- Prompt injection cannot change knowledge policy or grant permissions.
- Duplicate submissions return same case, not duplicate cases.
- Staff-only notes, Founder records and credentials never enter AI context or customer responses.
- Failed or unavailable staff service fails closed without claiming human contact succeeded.
- Synthetic adult-only test records, no outbound delivery.

## Release blockers
Verified customer auth, age/privacy review, secure CSRF and distributed throttling, staff MFA/onboarding, retention and deletion policy, monitoring, independent security review and production authorization. Keep existing draft PRs unmerged and production flags disabled.
