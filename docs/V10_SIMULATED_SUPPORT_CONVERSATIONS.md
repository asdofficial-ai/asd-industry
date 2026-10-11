# ASD Industry — v1.0 Customer ↔ Human Support Conversation Simulator

**Implementation: separate private development branch, simulation only. No live customer support, messaging, delivery, email, account recovery, or production database changes.**

This work builds on v0.9 Human Customer Support Workspace. It does **not** edit or activate the Founder account and does not share databases with ASD Pay.

## What exists

**Fictional phone preview**: `/support-conversation-lab.html` with `support-conversation-lab.css` and `support-conversation-lab.js`. Switch between fictional customer and fictional human support agent; change between sample cases; compose fictional messages and update a sample status. The page stores messages in JavaScript memory until refreshed, and makes **zero network requests**. It has no login fields or external recipient.

**Private staff-only training conversation API**:
- `GET /api/staff/support/cases/:caseId/training-thread` requires an authenticated, enabled Human Support Agent assigned to that case or a Manager. It returns up to 100 most recent synthetic messages, without emails, passwords, staff identity details or delivery destinations. Unclaimed cases cannot expose thread contents to ordinary agents.
- `POST /api/staff/support/cases/:caseId/training-thread` requires the same permissions, exact permitted Origin and JSON content type, rate-limit middleware, an explicit `syntheticAdultTest: true`, a unique UUID request ID, and a strict message speaker. Only Managers can generate **fictional** customer messages. Agents can compose only `agent_simulated`. The API rejects external delivery and recipient fields. Messages cannot be added to resolved, closed or escalated cases.
- Per-case PostgreSQL row locking protects conversation writes against concurrent reassignment and closure; `UNIQUE(case_id, actor_staff_id, request_id)` prevents duplicate writes. Identical retries return the same result without a duplicate audit event; conflicting content is rejected.
- An append-only support-case event records `training_message_posted` plus its role label, but no full message body.
- Database constraint `external_delivery = false` prevents training messages from being marked as delivered. **There is no send-to-customer action, address, email, API key, provider integration, websocket delivery or public customer inbox.**

**Private Human Support UI**: case details now include a clearly labeled *training conversation* timeline and test composer after server authorization. Customer persona message creation is available to Manager roles only. The interface has no real "Send to customer" button.

**Database migration**: `db/migrations/006_support_training_conversations.sql` runs only through the existing explicit private staff admin migration script on disposable PostgreSQL CI. Never apply it to ASD Pay or an existing public production service.

## Security and launch limitations
- AI agents, customers, Founder accounts and project reviewers do not receive support-role access.
- UI-hidden navigation is not authorization; the staff API always checks session role, case assignment and status server-side.
- Synthetic text validation filters likely passwords, identity numbers, personal contact details and recovery codes, but is not a guarantee for real personal data. **No real customer, minor, employee, document, or contact information should be entered.**
- This is a development simulator, not a production-ready customer support service. The private staff service remains disabled on public Render.
- Before launching any real message flow, implement independently verified customer sessions, staff MFA and onboarding/offboarding, account consent, role-scoped conversation participants, safe message delivery and receipts, privacy/age controls, abuse controls, monitoring, retention, audited reset and escalation, and full independent security review.

## Tests
- `tests/support-conversation-core.test.js`: validates role separation, allowed simulated speaker and content, mandatory synthetic flags, idempotency UUID, absence of delivery/recipient fields, and offline preview isolation.
- `tests/support-conversation-db.integration.test.js`: verifies simulated-only writes on disposable PostgreSQL, exact-origin checks, unauthorized role/case restrictions, manager-only fictional customer messages, duplicate-write idempotency, no outbound marking, append-only audit, and closed-case write blocks.

No real accounts were created and no production services were unlocked.
