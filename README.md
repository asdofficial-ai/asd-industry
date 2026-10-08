# ASD Industry — v0.3 Reconstruction (Demo Only)

**ASD Industry** is a youth project-building and team-matching ecosystem, **not** an online school.

This is a **reconstruction from the October 8, 2026 handoff**, not the recovered original v0.3 ZIP (which was not available). The original GitHub repository was empty when work resumed.

## Demo features

- Responsive landing page explaining the build-together philosophy.
- Browser-local pseudonymous profile with interests, role and availability.
- Idea submission and transparent keyword-based risk hints (**not** an AI assessment).
- Illustrative compatibility-ranked matching against **fictional sample profiles**.
- Browser-local project workspace: task list, progress and project notes.
- Proposed 3–6 hour wait/fallback concept shown as UI, **not** an active background service.
- Prominent guardian/legal/privacy and proposed-equity disclaimers.
- `GET /health` endpoint for hosting checks.

## Safety boundaries

**Do not treat this as a live youth community.** No authentication, guardian verification, moderation, real team matching, real messaging, database, payments, ownership allocation or third-party AI is implemented.

The browser stores demo data in **sessionStorage only**, isolated to the current browser tab. It is not sent to the server. Avoid entering any real names, personal contact information, or sensitive ideas. A visitor must not be led to believe that fictional team members are real people. Clear all session data with the Reset Demo button or by closing the tab.

The **30% ASD Industry / 70% team** split is merely a product proposal; the demo creates **no legal rights or financial obligations**. Future age/guardian, Nigerian data protection, safeguarding, employment and equity arrangements require qualified local legal review before any live release.

## Run

Requires Node.js 20 or later.

```bash
npm install
npm start
```

Open http://localhost:3000. Health: http://localhost:3000/health

## Deploy to Render

- GitHub: `asdofficial-ai/asd-industry`
- Service type: Node.js Web Service
- Build: `npm install`
- Start: `npm start`
- Health: `/health`
- `render.yaml` provided as an alternative blueprint.

## Next milestones

v0.4 protected database/data model; v0.5 verified authentication plus minor safeguards before live accounts; v0.6 idea submission backend; v0.7 genuine opt-in matchmaking; v0.8 private team workspaces; v0.9 moderated team discussion; v1.0 human/AI-assisted reviews; v1.1 carefully scoped AI assistant. Real-money payment and equity only after compliance and safety review.

**Do not publicly activate real minor-to-minor communication or collect guardian identity documents in this prototype.**
