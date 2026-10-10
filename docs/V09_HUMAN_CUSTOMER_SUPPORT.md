# ASD Industry v0.9 — Human Customer Support Workspace

**Status: private staff-only synthetic adult-test implementation. Not live customer support, not production, not connected to real people, minors, email or password recovery.**

This project is deliberately independent from ASD Pay and the ASD Industry Founder Command Center. It extends the private, database-backed staff roles from v0.8 on its own feature branch.

## Separate human employee accounts
Only privately provisioned **Human Support Agent** (staff role `support`) or **Manager** (`manager`) can access `/api/staff/support/*`. Employee sign-in uses the existing scoped, HttpOnly, Secure, SameSite=Strict staff session and password hashes (scrypt). No public self-registration or AI agent identity can create an employee account. Verified employee badges require separate administrator verification and consent; login alone does not create a verified badge.

The Founder account, project reviewers, safety personnel, community builders and AI helpers **cannot** access support ticket routes under the current least-privilege matrix. Human support agents **cannot approve projects**, access Founder emergency information, look up passwords or issue recovery tokens.

## What works in code
- `public/support-console.html`, `public/support-workspace.css`, `public/support-workspace.js`: phone-responsive dark Staff Support Desk with login gate, live-scoped overview, claimable case queue, internal-only notes, status changes, synthetic ticket intake and manager assignment.
- `lib/support-case-core.js`: strict validation for fictional adult-test support data. Rejects real contact details, passwords, identity numbers and secrets. Server-side role matrix and case-status transition policy.
- `lib/support-case-api.js`: staff-session-scoped endpoints:
  - `GET /api/staff/support/dashboard`: restricted counts.
  - `GET /api/staff/support/cases`: assigned or unclaimed summaries for agents, full queue for Managers.
  - `POST /api/staff/support/cases`: synthetic adult-test case creation **only** (no public customer submission).
  - `GET /api/staff/support/cases/:id`: Managers and **assigned** agents only; unclaimed case descriptions/notes remain private until claim.
  - `POST /api/staff/support/cases/:id/claim`: atomic first-come claim, rejects races.
  - `POST /api/staff/support/cases/:id/assign`: Managers can assign only to active human Support Agents.
  - `POST /api/staff/support/cases/:id/note`: internal-only synthetic notes, never sent to customers.
  - `POST /api/staff/support/cases/:id/status`: reviewed status transitions. Only Managers can close cases.
  - `GET /api/staff/support/agents`: Manager-only opaque agent IDs.
- `db/migrations/003_human_support_cases.sql`: separate support case table with assignment/status indexes and append-only auditable case-event table. Existing migration script applies it **only** using a trusted restricted ASD Industry administrator connection.
- Existing public ASD Industry customer pages no longer link to employee/manager/staff sign-in. Removing a link is not security; route access is checked on the server.
- `public/support-design-lab.html`, `public/support-lab.js`: a completely fictional interactive phone demo of this workflow. It does **not** call APIs, store data or collect credentials.

## Permission rules
| Action | Human Support Agent | Manager | AI / Project Reviewer / Public |
|---|---|---|---|
| View unclaimed case summaries | Yes | Yes | No |
| Read internal details of unclaimed case | No, claim first | Yes | No |
| Claim unassigned case | Yes | Yes | No |
| View/annotate assigned case | Yes | Yes | No |
| Read another agent's assigned case | No | Yes | No |
| Assign/reassign agent | No | Yes | No |
| Move case to resolved | Yes, if assigned | Yes | No |
| Close a resolved case | No | Yes | No |
| Access passwords, actual recovery evidence or identity documents | Never | Never | Never |
| Send real messages, real recovery resets or act on youth accounts | Disabled | Disabled | Disabled |

## Security and deployment
- No production or live staff activation. Existing staff Render services stay locked; a static web preview is separate from the staff API.
- Rate limiting/CSRF protection currently relies on existing origin checks and in-memory throttles. Before real service activation, add persistent distributed rate limits, MFA/passkeys, anti-CSRF tokens, agent onboarding and offboarding, independent security review, structured safe evidence and policy, child privacy/guardian requirements when applicable, and shared audit monitoring.
- The currently separate Founder branch and Founder account were not changed. Do not merge to `main` yet.
- Postgres integration tests use a disposable GitHub Actions PostgreSQL database, synthetic adult staff accounts and non-identifying test cases; they verify cross-agent isolation, unauthorized role rejection, manager-only assignment/closure, origin checks, atomic claim and audits.

## Next development milestone
Add an audited **support case escalation and two-person review workflow**, improved staff assignment search (non-sensitive display name instead of raw ID), abuse controls, human-agent status/availability, customer-facing request creation only after safely verified account signup and privacy readiness, and official in-app secure customer communication. Recovery authorization must be a separate audited workflow with identity checks, one-time reset tokens and session invalidation — never old-password disclosure.

## October 10 hardening sprint — near-feature-complete private beta
The private Human Support workspace now includes these additional **implemented, non-public** pieces:
- **Agent identity cards and availability**: `/support/profile` (GET/PATCH) with display name, one of four safe preset illustrated avatars and status `available | busy | away | offline`. Role, badge verification, and department are **never self-editable**. Availability defaults to offline; non-manager agents must set Available or Busy before claiming new work. No photo or identity-document uploads.
- **Manager team roster**: `GET /support/team` and `PATCH /support/team/:id/department`, with a safe list of enabled employee IDs, names, workloads, status and assigned department. Only a real staff-session Manager can assign a support department; audits record profile and department changes. Manager assignment to a case requires an enabled Support-role recipient currently Available/Busy.
- **Explained escalations**: An agent/manager cannot escalate without selecting a category and writing a substantial fictional reason. The case enters `escalated`, and only a different authorized Manager can review it using `GET /support/escalations` and `POST /support/cases/:id/escalation-review` with a review note. Standard status edits and reassignment cannot bypass review. An escalation cannot be self-reviewed.
- **Saved draft replies, not sent**: `GET /support/cases/:id/draft` and `PATCH /support/cases/:id/draft` save a synthetic training response for the authenticated author only. Drafts require explicit synthetic-test confirmation, strict text screening and case ownership; they have **no customer send path** and are read-only when the case is closed. Audited `reply_drafted` events contain no draft body. The staff UI clearly labels these as never delivered.
- **UI and demo**: Real staff UI adds My Profile (display name, avatar, availability, badge explanation), Manager Team & Escalations, legible assignment labels, two-person escalation forms and unsent response drafts. The separate mobile **fictional preview** adds simulated profile, staff/manager role views and response-draft interactions, with no network calls or stored credentials.
- **Migrations** `004_support_profiles_escalations.sql` and `005_support_reply_drafts.sql` extend the isolated staff database only; all use the existing explicit admin migration script. No existing ASD Industry public data or production database has been modified.
- **Tests**: Core and disposable PostgreSQL integration coverage includes forged role/badge fields, offline claim denial, manager-only department assignment, refusal to assign unavailable staff, ownership-sensitive drafts, attempted escalation bypass, manager independent review, and read-only closed cases.

### Private beta vs. launch readiness
We can describe the **staff-workflow prototype as mostly implemented**, but a numerical statement like "90% production ready" would be misleading. The highest-risk launch work remains: independent business/identity verification and staff onboarding, MFA/passkeys, approved and safe real customer intake, customer-facing secure messaging with consent/retention controls, real age/guardian safeguards if applicable, audited password reset and proof handling, distributed abuse controls, observability/backups, penetration/security/privacy review, and coordinated production roll-out.

**Do not** set `STAFF_BACKEND_ENABLED=true` on the public Render demo, deploy customer-facing ticket endpoints, provision actual human employees, publish credentials, or merge this draft PR into `main` until these gates are passed.

### Final handoff checklist
- [x] Distinct Human Support and Manager sessions; AI and reviewers cannot enter human support
- [x] Staff case intake for **synthetic adult-only** training, claim, assignment, review and close
- [x] Human team profiles, availability, department routing and official badge separation
- [x] Escalation, different-Manager oversight and append-only operational records
- [x] Private response drafts with no outbound delivery
- [x] Mobile UI, fictional mobile preview and PostgreSQL integration tests
- [ ] Verified employee onboarding, secure staff MFA, account recovery
- [ ] Real customer identity/session integration, safe customer submission and messaging
- [ ] Legal/privacy/age review, operational security verification and release acceptance
