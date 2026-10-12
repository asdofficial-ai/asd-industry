# ASD Industry — Builder account and project persistence (v1.2 private review)

**Status:** Development branch; not merged or deployed to public ASD Industry. This is a phone-friendly **offline practice demo**, not production registration. The existing Founder, human staff, AI-first support and ASD Pay projects are unaffected.

## Implemented in this branch

- Signup has a real editable password and confirmation **for 18+ practice sessions**; 12–17-year-old visitors retain temporary, guest-only browser tab sessions (no persistent youth accounts).
- Browser-only adult practice account: email + password, login, logout, change password in Profile, and an encrypted workspace vault using Web Crypto AES-256-GCM with per-account salt and PBKDF2-SHA-256 310,000 iterations. We **never persist the plaintext password**. The device/browser must support HTTPS Secure Context and Web Crypto. An email digest indexes the single local account.
- This is deliberately **not secure production authentication**: no server sessions, email verification, device-to-device sync, password reset, shared-browser multi-tenancy, youth consent or remotely enforced controls. The local vault can be deleted by clearing browser storage; recovery is impossible. Never reuse an actual password.
- Registration shows the user's **proposed ₦2,000 one-time bank transfer fee**, with four future states: pending account → bank instructions/reference → provider confirms settled transfer → activate. **No bank details, real transfer capability, payment collection, confirmation API or access gating is live**; simulated login is free. Do not accept receipt screenshots or a button saying “I paid” as proof.
- **No referral field/code**, per user's latest direction.
- **Create projects in Manager** instead of Find Your Team. Long project brief and optional proposed profit terms are collapsed until wanted. Manager houses a locally persisted project library; created and self-marked completed projects can be reopened later in the same encrypted adult practice account. Fictional matching stays illustrative.
- Group/project chat is retained in encrypted adult browser practice state, including per-joined-squad histories. Guests have tab-only ephemeral state. Messages are never delivered to another person.
- Reset demo action explicitly warns before deleting the encrypted practice vault.
- Added regression and Playwright end-to-end checks for mobile layout, role management, adult practice vault signup/login/password rotation, project library and chat recovery, and temporary minor guest sessions.

## Before enabling real accounts

1. Approve exact ₦2,000 registration fee and eligibility policy, including guardian consent or age assurance safeguards for under-18s, if they will ever be served.
2. Choose a legitimate payment provider/bank integration that supports per-customer unique references and **server-verified credit confirmation**. Never use manual receipt uploads as sole evidence. Reconcile payment idempotently; handle underpayments, duplicate transfers, delays, expiry, refunds and incorrect references; audit every status change.
3. Implement managed cloud database, per-account role isolation, salted memory-hard server-side password hashes (Argon2id/scrypt), MFA options, secure session cookies and CSRF protection, anti-bot/rate limiting, reset token flow and verified email ownership. Keep founder/human agent roles separate and provision them privately.
4. Implement secure backend project, membership and chat storage with proper per-project permissions, retention and abuse reporting. Customer payments, chat, minors and public file uploads must remain disabled until privacy/safeguarding review.
5. Security review, mobile QA and production deployment after explicit user sign-off. **Do not merge this draft PR to main automatically**.

## Launch design decisions requested from owner

- Confirm whether the **₦2,000** is a one-time registration charge for eligible adults only, or a project-creation fee, and the refund/cancellation policy.
- Confirm bank-transfer provider options: three personal bank numbers displayed publicly are **not recommended**. Use official business/merchant bank accounts or a provider with unique virtual accounts and signed confirmation webhooks. No bank details requested yet.
- Confirm whether signups should remain possible in “pending payment” state until settlement, with no access to member data before confirmation.

This branch's local encrypted browser practice login is intentionally **separate from the future real cloud account system**.