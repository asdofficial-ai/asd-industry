# ASD Industry Founder Command Center — v0.8

**A coded, separate founder account interface. Not an image.** Page: `/founder.html`.

## What is implemented

Founder-level dashboard shell, desktop sidebar and responsive mobile navigation. Nine dedicated founder sections:

- Overview: project/staff metrics and management shortcuts
- Projects & Approvals: review applications, link to protected human staff console
- AI Staff Department: five specialist roles and their advisory-only responsibilities
- Human Staff: founder/reviewer/safety roles, protected staff directory
- Private Workspaces: approval → recruitment → founder-created group workflow
- Platform Intelligence: real counts only if authenticated; no fabricated revenue
- Security & Audit: protected staff activity and audit summary
- **Theme Studio: seven named founder styles, image previews and actual working apply buttons**
- Founder Settings: account and saved visual preference

All seven available site themes:
1. **Command Red** — black/crimson
2. **Luxury Gold** — black/gold
3. **Global Blue** — deep navy/electric blue
4. **Visionary Green** — charcoal/emerald
5. **Command Purple** — deep purple/neon violet
6. **Industrial Orange** — blue-black/copper
7. **Executive White** — white/navy/royal blue

Users can select any theme from Theme Studio or seven mini previews on Overview. The selection changes the entire page colors, header art, text and controls and is stored in this browser's `localStorage`. Each theme has a separate local SVG visual-preview asset. These SVG dashboard illustrations recreate the design direction; they are **not exact copies of the originally generated photographic mockups**. The UI code has predictable asset paths so production picture assets can replace SVG previews later.

## Founder-only real data

On each load the page asks `GET /api/staff/status`, `GET /api/staff/me`, then (only for role `founder`) `GET /api/staff/founder/overview` for a staff-account session. Server enforces human-staff session validation and the founder role for the third route. The route uses **read-only queries** returning counts, staff directory, recent requests and action/audit entries. Other roles are denied.

Because the backend is **disabled by default** and no founder account was provisioned, the new page displays an obvious preview banner and hides private data. Approval controls are NOT faked; the page instead offers an actual link to the human staff console for future review. No client-side stored theme choice grants security permissions.

The database role `asd_industry_staff_runtime` has been granted SELECT on audit records so this founder-only endpoint can eventually read the audit trail. The role is NOLOGIN, and no service credentials are connected yet.

## How to try it

Visit `/founder.html` on the standalone development preview. Tap **Customize my dashboard**, choose each theme and **Apply theme**. Navigate around Projects, AI Staff, Human Staff, Private Workspaces, Analytics, Security and Settings. The different themes, page navigation and saved preference work without real staff data.

Use `/staff-console.html` for the protected human approval workflow foundation; until safely connected it also shows disabled.

## What must be completed before real founder access

1. Separately provision secure founder identity, login credential and MFA/passkey.
2. Establish a restricted database LOGIN role connected privately to Render (do not reuse the Neon owner password), confirm restricted permissions and TLS.
3. Enable the staff backend **only** in a controlled adult-only environment after an account-security review.
4. Run a live session end-to-end on the founder route; validate all prohibited roles return 403.
5. Add authorized, audited backend actions for staff management, agent policy changes, project decisions, workspaces and system settings. Model agents cannot approve/reject projects or manage users.
6. Complete youth safeguarding, guardian consent where necessary, authentication, server-side project membership, safe file handling, moderation, privacy/legal and security reviews.

There is no actual revenue feed, active AI-model workforce, private member chat or financially actionable feature behind the Founder theme mockup.

## CI

Node test suite validates the presence of seven design assets, complete page navigation, persistent theme switch, server-only founder authorization, and the real PostgreSQL API integration test checks that safety/reviewer roles receive 403 and that a founder sees real test database metrics.
