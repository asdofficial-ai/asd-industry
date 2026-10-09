# ASD Industry v0.6 — AI Staff & Human Review Department

**Status:** isolated development branch, no live account access, no actual staff authentication or real project approvals.

The product owner is founder of ASD Industry. AI staff perform analysis and summarize applications; real, authenticated human staff are responsible for accepting, rejecting, contacting members, permitting recruitment, responding to safeguarding alerts, and resolving disputes.

## Department and roles

| Role | Responsibility | NOT allowed |
|---|---|---|
| Intake Coordinator | Validate submission completeness, organize projects and requests | Approve |
| Safety & Trust Officer | Identify safety, privacy, scam and minor-safeguarding concerns | Ban or contact users |
| Feasibility Analyst | Suggest MVP scope, milestones and evidence requirements | Change ownership or project status |
| Talent & Matching Lead | Recommend complementary team skills after approval | Recruit/invite participants directly |
| Operations Coordinator | Consolidate handoff checklist and staff review questions | Create team groups or approve funding |

Human staff receives a report packet containing individual specialist assessments and any flags. Only an authenticated human reviewer may make real decisions. The founder defines governance rules and can oversee escalations; no AI role may override the human gate.

## v0.6 UI demo

At `/review.html`, five distinct staff personas have a visual headquarters, application review queue, rule-based reports, and **mandatory human decision confirmation** with reviewer name and written reason.

This is a local-only preview of intended functionality. Reports currently use deterministic rules and have `engine="deterministic-demo"`. They are **not** AI-model generated. The reviewer identity field is *not* authentication.

1. Sign up to the browser-local demo.
2. Go to `/projects.html`, submit a valid project and choose the number of additional teammates.
3. Open `/review.html`, select a pending project and click **Prepare 5 staff reports**.
4. Examine all five reports. Provide a **human reviewer name** and **10+ characters** explaining the decision.
5. Confirm either simulated approval or request changes. The app records a local audit-history event.
6. Only after simulated human approval can the founder recruit. The group chat and workspace remain locked until the requested fictional members have been recruited and the founder creates the group.

The legacy v0.5 review preview is replaced by the headquarters, with no route linked from public platform navigation. **The URL is not protected** and must not be confused with a real staff interface.

## Staged provider integration (internal module only)

`lib/ai-staff-runner.js` implements a five-role **model adapter**, but is **OFF by default and is not exposed by Express or the frontend**. It uses the Responses API, requests JSON-only assessments with no tool access and `store:false`, and generates only text recommendations. No payment, acceptance, rejection, messaging, database write or group-creation tools are available.

Enabling requires a trusted internal worker, separate secured staff accounts, and all of:

- `NODE_ENV=production`
- `AI_STAFF_ENABLED=true`
- `OPENAI_API_KEY` set **server-side only**
- `AI_STAFF_MODEL` configured to an API-supported model
- An authenticated internal execution context with `humanStaffAuthorized=true`, `aiProcessingApproved=true`, `isVerifiedAdult=true`, and `isMinorRelated=false`

The internal runner rejects apparent contact details and credentials, but regex screening is NOT reliable PII removal. **Do not send actual submissions to an external model or enable the adapter until there is a full data-protection, consent, retention and vendor review.** Real usage by anyone under 18 is blocked in this stage. No actual provider calls have been made.

### Next production gates

- Secure account and email verification system (v0.4 is a separate draft branch), dedicated database, role-based access control and verified human reviewer identities
- Persistent project submission and human task queue with state transitions enforced **server-side**, not in the browser
- Per-application source references, report versioning, reviewer signatures, immutable approval/audit log, explicit internal escalation ownership, and incident response
- Safe handling of minors (age assurance, appropriate guardian consent, moderation, abuse reporting, privacy settings and restrictions on contact and direct messaging)
- Model red-team tests, prompt-injection defense, safe content minimization, data retention/erasure and provider configuration approval
- No autonomous approvals, denials, invitations, group creation, team access, payments, or public notifications by AI

## Test gates

Run `node --test tests/portal-core.test.js tests/staff-workflow.test.js tests/ai-staff-runner.test.js` and Node syntax checks. Tests confirm no AI-authorized status changes, requirement for a current packet and human decision note, five-role handoff, resubmission invalidation and disabled real-model execution.

**A passing demo test does not establish production safety.**
