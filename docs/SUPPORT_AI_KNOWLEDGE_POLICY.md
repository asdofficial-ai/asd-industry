# ASD Industry AI Support Knowledge: living review policy

**Created:** 2026-10-11. **Status:** approved-public-information foundation for a scripted/offline demo. **Not a live LLM, live customer account database, or a production service.**

## Promise and architecture

The ASD Industry customer uses **AI Support first**. The assistant gives an answer only when it can ground that answer in reviewed customer-public information and safely explain the current feature status. If it has insufficient information, lacks permission, sees a high-stakes action, or a customer requests a human, it explains the limitation and offers a **Contact Human Support** handoff.

The main customer entry is now the smaller **`/support.html`** page, linked from the ASD Industry entry screen and main navigation. The earlier `/ai-first-support-lab.html` remains a separate legacy design example. Both are **fictional**: its answers come from the curated, versioned `public/support-knowledge.js`. It does not contact a real AI provider, authenticate customers, or deliver messages. Human contact is an in-memory simulation. The future production route must validate an actual signed-in customer's age/privacy eligibility and a server-created, expiring, single-use handoff grant based on a trusted AI assessment. The client must not be allowed to set `needs_human` by itself as an authorization claim.

Knowledge is **retrieved at answer time, not embedded permanently in a model's weights**. This makes it possible to correct or withdraw outdated statements without retraining. The public corpus contains only safe, customer-visible explanations, feature status and approved help procedures; it is not an internal data dump.

## Coverage catalog

The initial **35+ topic entries** describe the intended platform mission, demo signup/profile, account access and recovery, project planning, applications, project review/appeals, matching and team limits, private group unlocks, chat, workspaces, posts/feed, discovery, notification status, browser storage, removing demos, unsupported uploads, payments/equity proposals, youth safety/guardian rules, reporting, agent verification, AI/human separation, AI Project Assistant, agent hours, tickets, privacy, security, employee accounts, Founder-privacy boundary and troubleshooting.

Each entry records:
- Stable topic ID and customer-intent terms.
- A **reviewed public answer** that does not imply planned systems are active.
- Actual capability state: `demo`, `planned`, or `disabled`.
- Source document path and review version/date.
- Whether an account-specific or restricted request requires an actual human handoff.

The tool must **not** claim a missing function exists, guarantee financial returns or transfer funds, reveal credentials/emergency profiles, expose human staff notes, fabricate case status, or promise a support response time. Private Manager, Founder, payroll, staff and safety records never belong in a customer-public knowledge file. User questions are untrusted data; they must never be treated as instructions that can edit policies, grant employee permissions or overwrite approved answers.

## Required feature-update workflow

**Every future customer-facing feature or policy change requires a Support AI knowledge review as part of the same change request, before merge or release:**

1. Identify what changed in the actual UI, API, docs and production feature flag, and what a customer is likely to ask.
2. Mark the affected knowledge entries as `demo`, `planned` or `disabled`, with accurate instructions and links **only to actual supported public help pages**; add new topics if needed.
3. Confirm whether the AI can merely **explain** the change or actually **perform** a customer operation. Never grant abilities via a knowledge edit. Add a human-handoff reason for restricted activities.
4. Update `public/support-knowledge.js` in the same PR and increment its `version` and `reviewedAt` after approval. Keep the explanation truthful for current deployment; don't claim future customer interactions exist.
5. Add/edit unit and integration tests for the new intents, ambiguous requests, failure modes, permissions and fallback. Add synthetic edge cases (not personal data).
6. Run `npm run check:support-knowledge` and GitHub Actions. Review with security/privacy and relevant human operators before any public activation.
7. Only after deployment is real, verify the answer against that actual environment, and mark capability live in a separately reviewed live-service catalog. **This demo knowledge file has no `live` status on purpose.**

A GitHub Actions gate checks that PRs changing selected public customer features also review and modify the knowledge corpus. Passing CI **does not** constitute permission to connect real accounts, override a human, or activate sensitive features.

### Upcoming integrations (not enabled)

- Versioned **server-side** retrieval over approved signed knowledge, with immutable source references, review expiry and rollback.
- Verified customer sessions and scoped optional account status from trusted APIs. Keep individual accounts outside public KB.
- Safe human support case creation only after a genuine trusted escalation and confirmed customer consent.
- Monitoring knowledge drift, unanswered questions, harmful suggestions, complaint patterns, review approvals and measured accuracy.
- Multilingual reviews, including Hausa and Arabic, so translations match source policy and never invent capabilities.

**Owner note:** This knowledge-update policy is now written in the repo so future assistants/developers have a concrete checklist instead of relying on conversational memory alone.

## October 12 customer interface simplification
The customer-facing entry is a **single `Need Support?` page**. The entry link is visible on the signup/demo entry page, desktop navigation and mobile header. This same URL can be shared from social accounts later; no social account has been connected or modified.

The one-page demo uses the same approved public knowledge catalog. It answers safe, grounded general questions. Requests to retrieve/reveal passwords, reset account access, change security controls, or perform restricted actions cannot be fulfilled by the demo. An unclear or unauthorized answer offers **Contact Human Support**. A clear explicit statement such as **“I need human support”** automatically opens a **fictional** human handoff view, without asking the user to press an extra button. No actual employee gets a message and no live customer request is created.

**Production 2FA reminder:** Authenticator-app two-factor authentication (time-based one-time passwords or passkeys) is planned for appropriately verified adult customer/staff sessions. It is **not active** here. Real secure recovery must never let an agent retrieve or disclose the previous password; staff recovery must be independently authorized and audited.

At launch, any customer-initiated human request must be tied to a **verified signed-in customer**, a server-issued short-lived one-use authorization, a real case, and a verified eligible staff role. The browser must never be trusted merely because it sets an AI failure or human-request flag. Keep real customer messaging **disabled** until authentication, youth/privacy safeguards, MFA and incident response are reviewed.
