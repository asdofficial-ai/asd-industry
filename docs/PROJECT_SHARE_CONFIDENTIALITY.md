# ASD Industry — Project-share confidentiality and manager-only access

**Policy:** Project equity, ownership allocations, financial participation, internal splits, cap tables, investment arrangements, project-specific profit sharing and negotiation drafts are **strictly confidential**, and may only be seen by an independently authenticated and authorized **manager of that specific project**. A generic staff "manager" role is **not** sufficient to access all projects' data.

## Always denied in public and employee help
- Customer-facing AI Support, scripted FAQ and model fallback must never receive those values in their prompt context, training data, retrieval scope, API responses or browser assets.
- A customer, support agent, AI assistant, general project teammate, unrelated project manager, reviewer, website visitor and anyone impersonating staff may not read these details.
- Do not disclose, guess, confirm, compare, hint at figures or restate a claimed allocation. Refuse neutrally. Do not elevate an ordinary human support agent into permission to access a project manager's restricted files.
- The site's customer-visible "full platform guide" and help overview must not include these terms.
- The confidentiality check applies **before** model invocation and **after** generation to prevent hallucinated disclosures. Denials cannot be bypassed by roleplay, prompt injection, alternate spelling or user-provided screenshots.
- Private agreement data must not appear in GitHub README files, public HTML/JS, static deployment assets, error logs, analytics or support case descriptions.

## Future access enforcement (NOT IMPLEMENTED)
A manager-only section must rely on verified account identity and **server-verified project-specific membership** before retrieving data, with denials for everyone else. Use database authorization/row-level controls rather than simply hiding interface elements. Audit every read/change, use MFA, minimize retention, protect exports, and prevent access after revocation. Never pass these records to general AI context. A client-side fictional manager demo is **not** a secure store for real terms.

## Remediation
The public FAQ and overview were redacted on October 12, 2026. The public README and demo page that previously included terms were also updated. Publishing code updates does not erase previously downloaded content, screenshots or Git history, so these must not be treated as secret again merely because the current page no longer displays them. Do not rewrite repository history or break deployments without an explicit coordinated review.
