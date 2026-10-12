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

## October 11 — AI Support living knowledge and AI-first handoff

- **AI comes first.** Customers will start with the AI Support Assistant; it answers routine questions only from the approved support knowledge catalog. If a request is unsupported, cannot be answered reliably, requires account-specific authorization, or a human is requested, the AI explains why and offers a **Contact Human Support** path.
- `public/support-knowledge.js` is the **public curated knowledge source**, versioned and reviewed, with 30+ customer FAQ topics. It covers platform onboarding, profile, planning, applications, review/appeals, matching, team-size, group creation, local chat/workspace, feed/discover/notifications, browser-only data, recovery, fraud and privacy warnings, money/equity status, youth safeguards, employee verification and support availability. Every topic has a documented source and **current feature status**. It makes no claim of live signup, payouts, accounts, AI models or human staff messaging.
- `public/ai-first-support-lab.html` and `public/ai-first-support-lab.js` now use the same reviewed knowledge catalog. It is a **scripted offline demonstration**, not an AI model or production customer help desk. The Human Support button is hidden until the scripted assistant cannot answer or lacks authorization.
- `lib/support-handoff-core.js` documents the future server-owned trusted escalation and one-use grant contract. `lib/support-ai-context.js` prepares a source-labeled knowledge packet but refuses use without trusted authenticated adult/consent context and never calls a provider or includes actual customer records.
- `docs/SUPPORT_AI_KNOWLEDGE_POLICY.md` defines **mandatory knowledge updates for future customer-facing features**: inspect actual product state, update affected answers/availability with sources, increment version/review date, test restricted or unknown prompts and review privacy implications before release. `scripts/check-support-knowledge.js` validates customer-public sources and detects changes to selected customer-facing files in PRs without matching knowledge edits.
- `tests/support-knowledge.test.js`, `tests/support-ai-context.test.js`, and `tests/support-handoff.test.js` cover grounding, forbidden access, protected context and fictional handoffs. GitHub Actions runs these and the knowledge validator.
- **Not active:** No genuine customer authentication, live model, model fine-tuning, access to a person's private account, real staff booking, outbound customer chat, or automatic unreviewed ingestion of new code into AI. These require separate secure APIs, human review and launch clearance.

This knowledge catalog is a **living reviewed source**, not a promise that every possible future question already has an answer. Unknown or ambiguous information must trigger honest uncertainty and safe handoff, never invention.

## October 12 — Response-ready AI Support (PRIVATE BETA; real AI not activated)

**User-reported issue:** the visually finished support page could not respond flexibly. It was a scripted public FAQ, not a connected language model. Replaced the unresponsive unknown-question path with an optional real server-side model adapter and retained an immediate approved-answer fallback.

### Implementation
- `public/support.html` remains the **single customer-visible entry point** from the ASD Industry demo. No Founder, Manager or direct Human Support staff-login link is added.
- `public/support-page.js` immediately answers recognized questions from the reviewed, versioned `public/support-knowledge.js`, keeps a clear "thinking" state for server-model requests, uses a response timeout/error fallback, and lets users submit with Enter (Shift+Enter inserts a newline). It shows **Contact Human Support** only for unanswerable or unauthorized requests (and explicit human requests), but **human chat is still fictional**.
- `lib/customer-support-ai.js` is a new **optional** Express `/api/support-ai` endpoint. It is mounted in `server.js` only on the isolated v0.9 development branch. It can call an external provider through **server-side** fetch after configured activation. Defaults to **disabled**, with no public signup, human agent, data storage or outbound messages. It intentionally omits customer history and refuses emails, secrets, private identifiers and sensitive account-changing actions. It has origin validation, request bounds, a basic per-IP limiter, 8.5-second upstream cutoff, short JSON output validation, and no logging of messages or credentials.
- Supported providers: OpenAI-compatible official Chat Completions API via `SUPPORT_AI_PROVIDER=openai`, or Google's Gemini GenerateContent endpoint via `SUPPORT_AI_PROVIDER=gemini`. No API key is committed or embedded in website JavaScript; both providers require a separately provisioned key and budget/quota controls.

### Server settings (development service only)
Use the isolated Node staging **web service**, NOT the static design preview or the public production site.

```text
SUPPORT_AI_ENABLED=true
SUPPORT_AI_PROVIDER=gemini          # or openai
SUPPORT_AI_MODEL=gemini-2.5-flash-lite  # choose a currently available supported model
SUPPORT_AI_API_KEY=<set as private server environment secret, never put in chat>
SUPPORT_AI_ORIGIN=https://<exact-own-hostname>
```

If using OpenAI, configure a compatible model instead (such as `gpt-4.1-mini`). Model support, pricing, latency, regional availability, and quota must be verified before release. Setting a public-facing flag on a production service is **NOT** authorized. Keep existing Render staff and production services unchanged until explicit release review.

`GET /api/support-ai/status` reports whether a model is configured (without revealing keys); `POST /api/support-ai/ask` accepts only 2–500-character, non-sensitive demo questions with same-origin POST and rate limits. Reviewed FAQ answers are returned without a provider call. Unmatched questions are sent to the configured provider only if the flag, key, model and allowed origin are present.

### Reality and launch blockers
- The existing public **static** preview can only provide immediate reviewed knowledge and simulated human handoff. It cannot execute Node API routes; copying browser code to static hosting **does not connect an AI model**.
- This work prepares AI for real answers but **has not configured a provider credential or deployed a live-model Node service**. Until those are explicitly configured, unknown questions will honestly get a fallback and an optional fictional handoff.
- Fast reviewed FAQs are synchronous. External AI responses depend on provider latency and network; "instant" cannot be guaranteed.
- Real customers, youth-safety processes, provider privacy assessment, logging/retention consent, spending limits, secure customer authentication, single-use server-verified handoff, real staff messaging, human password recovery and MFA are still launch gates. Do not unlock access early.
- Run `tests/customer-support-ai.test.js`, `tests/support-page.test.js`, and existing CI before considering the dev branch verified.
