# ASD Industry v0.8 — Account identities, employee badges and human recovery

**State: architecture and tested private prototype. Not public signup, an activated staff directory, or a working identity-recovery system.**
This branch is built atop `feature/v0.7-human-staff-backend`. The existing public demo, v0.7 staff service, ASD Pay and ASD Pay Neon databases must not be modified or unlocked.

## Disjoint types of identity
The source of truth is `lib/identity-roles.js`, **not** text chosen by a user in a profile form.

| Identity | Service | Rights | Visible label |
|---|---|---|---|
| Community builder | User project participation | Own approved projects (future) | Builder, not staff |
| Project AI | Project planning/research (future AI runtime) | No staff sessions, moderation decisions, or founder files | AI Project Assistant |
| Support AI | FAQ and safe handoff (future AI runtime) | Never verify identity, reset passwords, or impersonate employees | AI Support Assistant |
| Review AI | Advisory report generator only | Never approve projects or act as human staff | AI Review Assistant |
| Human support | Private provisioned human staff login | Help triage future recovery; no confidential project review approvals | Human Support Agent |
| Human reviewer | Private provisioned human staff login | Review and make human project decisions | Human Project Reviewer |
| Human safety | Private provisioned human staff login | Safety review and report preparation, no approvals | Human Safety Officer |
| Manager | Private provisioned human staff login | Review queue and operational oversight; no final project approval | ASD Industry Manager |
| Founder | **Single enabled founder identity**, privately provisioned | Founder-only overview and authorized reviewer actions; no secrets readable | ASD Industry Founder |

A builder who founded *their own project* is **not** ASD Industry's platform founder. A display name, badge image, email address or client-supplied role does not grant employee permissions. All private endpoints check **database-owned server sessions and roles**.

## Founder account and emergency readiness
`public/founder-console.html` + `GET /api/staff/founder/overview` provide an owner-only, role-checked UI and non-sensitive operational counts. `db/migrations/002_identity_separation.sql` adds a private encrypted payload table, and `lib/founder-emergency.js` provides AES-256-GCM authenticated encryption scoped to the founder account ID.

**Do not collect real emergency information yet.** Encrypting alone is insufficient. Before enabling private create/read endpoints, add independently verified founder identity, hardware-backed MFA/passkeys, per-access reauthentication, private key rotation and KMS custody, least-privilege DB roles, auditable break-glass access, access notification, backup/restore, retention rules and operator review.

Future minimal, consented emergency profile fields (encrypted): founder's preferred name, recovery email, emergency phone, designated emergency contact (with that person's consent), contact method, country/timezone and escalation instructions. Keep these **private**. Never ask for or store a plaintext password, private keys, NIN/BVN, ID scans, wallet seed phrases or recovery codes in this emergency profile. No such data or passwords have been supplied or saved.

Your Founder role is not automatically provisioned by this code; doing so from a chat claim would allow founder impersonation. Only a trusted private operator with independently verified ownership can create it.

## Real human employee badge
`industry_staff_public_profiles` holds private administrator-managed `display_name`, `badge_verified_at`, and `directory_opt_in`. Defaults are **unverified and hidden**. The server-side, optional `GET /api/staff/directory` returns display name and derived role badge *only* when:
1. Staff identity was privately provisioned and remains enabled.
2. Trusted administrators verified the person's employment.
3. The employee opted in to public listing.
4. Both `STAFF_BACKEND_ENABLED=true` and separate `STAFF_PUBLIC_DIRECTORY_ENABLED=true` were intentionally set after review.

No public employee email, emergency contact, session token or password hash is returned. A verified employee label must never appear on an AI assistant; AI has explicit AI-label types. `public/verified-team.html` and `public/identity-hub.html` show the design. There is no self-serve 'Get employee badge' action.

## Safe human-assisted forgotten-password recovery
**No staff member, founder or AI may look up, read, share or email an old password.** The separate `feature/v0.4-safe-account-foundation` has a password field, confirmation, strength guidance and **scrypt salted hashes**. Original plaintext passwords are not retained. The main public v0.3 demo remains a browser-local demonstration that intentionally does not collect a real password.

The future recovery flow:
1. An adult account holder requests a reset from a rate-limited **official** support channel. Respond generically to avoid exposing account existence.
2. An AI support assistant may provide general instructions or route to a human, but may not approve recovery.
3. A verified human support employee opens a tracked case. Evidence must come through a secure, minimal, time-limited collection process—not email/chat attachments, copied IDs or questions based only on public information.
4. A separate authorized reviewer checks ownership, suspicious history, high-risk indicators and recovery requirements. Require a second approver for the Founder and other privileged roles.
5. If sufficiently verified, a short-lived, one-use reset authorization permits the user to choose a **new** strong password. The old hash is replaced, active sessions are revoked, and appropriate out-of-band notifications are sent. Do not reveal the former password.
6. Record purpose-limited audit details, limit staff access and retain or delete evidence under a reviewed policy.

`industry_account_recovery_cases` is currently **schema only**. It stores an HMAC-style account digest placeholder and case metadata, no identity proof documents. There are no active public recovery endpoints, evidence uploads, or password-reset approval routes. **Do not activate recovery before MFA, identity verification and staff-abuse safeguards exist.**

## Safe rollout
- Use a separate ASD Industry staff PostgreSQL database. Never use `ASDP Staging` or any ASD Pay DB.
- `002_identity_separation.sql` is applied only by trusted private migration scripts, **not** public service startup. The restricted staff runtime can SELECT opt-in badge rows only if its DB role is present; it has **no grant** on founder emergency or recovery case tables.
- Staff console, founder console, support console, manager console and badge directory can render in demo mode while the API is disabled. They are not evidence of live staff verification or actual AI.
- Keep `STAFF_BACKEND_ENABLED=false` and `STAFF_PUBLIC_DIRECTORY_ENABLED=false` on existing Render services. No production human or minor credentials were created.
- Maintain closed public youth signup until age assurance, verified guardian consent where necessary, child-appropriate safety controls and legal/privacy review are completed.
- Test rules and schema on disposable PostgreSQL via GitHub Actions before any live staff migrations.

## Development navigation
- `/identity-hub.html` — overview of separate identities
- `/founder-console.html` — private Founder login shell and restricted overview
- `/manager-console.html` — separate Manager operations shell
- `/support-console.html` — Human Support Desk shell
- `/staff-console.html` — private review/safety shell
- `/verified-team.html` — opt-in public badge directory shell

Email sending, identity-recovery proof verification, operational AI chat, and founder emergency-data uploads remain future work.

## Founder UI design follow-up — October 10, 2026
- **Customer privacy:** Removed the public Founder login link **and Founder-account card** from `public/identity-hub.html`. Only a verified Founder session can see the Founder link in the restricted staff console. Obscuring a URL is not authorization; the API's Founder role check remains mandatory.
- **Seven interactive visual directions:** `Obsidian Gold`, `Royal Crimson`, `Titanium`, `Solar Forge`, `Monarch`, `Spectre`, and `Ivory Noir`. The complete **fictional design lab** is `/founder-design-lab.html`. The **private real API shell** is `/founder-console.html`.
- **Private Founder page:** Responsive mobile layout, restricted login shell, live overview cards only after server-side authenticated Founder authorization, Management and Security tabs, theme switcher (this-page memory only), and ALTernate demonstration.
- **ALTernate:** On the private page and design lab, the scripted example does NOT call models, read real manager messages, or store chat history. The UI explicitly says when reports and trusted sources are not connected. No fake manager statements are represented as truth.
- **Automated regression checks:** `tests/founder-ui.test.js` validates missing public Founder links/cards, role-gated private panel markup, referenced assets, seven style controls and network-free scripted assistant. Included in GitHub Actions.
- **Deployment separation:** A separate public **static visual review** may serve the fictional lab; it has no actual staff API. The existing real human staff service stays disabled. The real Founder account has not been provisioned, and emergency information is not uploaded.
- **Next gates:** independently verify Founder ownership, staff MFA/passkeys and restricted staff database access before activating the real Founder login; connect any manager reports only through auditable server-side permission checks.
