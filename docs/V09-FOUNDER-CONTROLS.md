# ASD Industry Founder Command Center v0.9

**Your Founder Page:** `/founder.html` (in the separate development preview).

This is a coded control center—not a generated dashboard screenshot. The Founder Page has seven user-selectable themes stored on the device, nine management screens, and protected management workflows.

## Seven themes

1. Command Red — black and crimson
2. Luxury Gold — black and gold
3. Global Blue — midnight blue and electric cyan
4. Visionary Green — green and graphite
5. Command Purple — violet and near-black
6. Industrial Orange — copper and steel
7. Executive White — white, navy and royal blue

Theme Studio shows all seven named theme illustrations. Clicking Apply updates the full application palette and the matching illustration. The selected theme is kept in browser storage, and an authenticated Founder can synchronize it with their account database record.

## Management controls

Authenticated Founder (`role=founder`) can:

- Read real staff, application, audit and operation counts from the isolated database.
- Select a pending application, generate the current **deterministic** assessment packet, inspect assessment flags, and enter a written human decision (approval, request changes or decline).
- Pause or resume the contribution of each advisory role to future deterministic packets. This does NOT enable or disable external AI model execution; live model execution remains off.
- Temporarily suspend and restore **non-Founder** human staff login permissions. Suspension invalidates all existing sessions.
- Review audit entries of founder actions and review decisions.
- Save one of the seven account themes.

No Founder can disable their own account through the staff management screen or change another Founder's access. No user can gain a Founder role through a browser flag, theme choice or demo profile.

## Authentication and safety

`/founder.html` is a publicly loadable **UI preview**; all company data and actions require an authenticated Founder session, checked by the Node API and database before every request. When `STAFF_BACKEND_ENABLED=false`, the preview shows locked administration and only the visual controls function.

The Founder Account itself has not yet been provisioned. The backend currently requires: a dedicated restricted Neon runtime LOGIN, a separate admin database credential used only in a private terminal, a privately provisioned Founder account, origin and session signing values configured on Render, and an approved adult-only testing rollout. Staff MFA and youth safeguarding review remain production blockers.

Existing simulated youth profiles, members, private workspaces and sample community feed are NOT real database records. Financial and global metrics must never be invented, so the Founder dashboard uses blank/unavailable placeholders until actual figures exist.

AI staff cannot decide, contact users, move money, create groups or unlock private workspaces. Humans remain responsible for all project decisions.

## New private endpoints

All routes below are protected by staff session, and all mutations require exact-origin requests:

- `GET /api/staff/founder/overview` (Founder only)
- `GET /api/staff/founder/preferences`
- `PUT /api/staff/founder/preferences` (one of seven valid theme IDs)
- `PATCH /api/staff/founder/agents/:id` (specialist inclusion in **deterministic** reports only)
- `PATCH /api/staff/founder/staff/:id` (suspend/restore non-Founder access; revoke sessions)
- Existing human-only review flow: `GET /api/staff/requests/:id`, `POST /api/staff/requests/:id/prepare`, `POST /api/staff/requests/:id/decision`.

Every successful permission change is inserted in the audit log in the same database transaction. There is no public sign-up or tool-driven Founder escalation path.

## Database migration

`db/migrations/002_founder_operations.sql` adds `industry_founder_preferences` and `industry_ai_agent_controls`, with five default advisory role records. Run it only on the dedicated ASD Industry Neon project, not ASDP Staging or ASD Pay.

The runtime database role must be limited to:

- `industry_founder_preferences`: SELECT, INSERT, UPDATE
- `industry_ai_agent_controls`: SELECT, UPDATE
- `industry_staff_accounts`: SELECT and UPDATE **enabled** column only
- The minimal existing grants for sessions, applications, reports, decisions and audit records.

Migration uses `STAFF_ADMIN_DB_URL`, never app runtime credentials.

## Verification

Run `npm install && node --test tests/portal-core.test.js tests/staff-workflow.test.js tests/ai-staff-runner.test.js tests/staff-auth.test.js tests/founder-ui.test.js`.
GitHub Actions additionally creates a disposable PostgreSQL 16 database, executes both migrations and runs `tests/staff-db.integration.test.js` against the real authenticated API routes.

**Dev-preview completion is not equivalent to activating a production-grade Founder Account.** Do not enable real minor accounts, real chat, real model processing or payments until required protections are implemented.

## Dedicated Founder sign-in

`/founder-login.html` is the Founder-only branded entrance. It uses the existing protected staff authentication endpoint, but rejects and logs out sessions whose server-validated role is not `founder`. This route does not register an account or bypass the server's disabled status. In preview mode it explains that activation is pending and links to the seven-theme Founder UI. Staff sessions remain restricted to `/api/staff` and are carried only by HttpOnly, Secure, SameSite cookies.
