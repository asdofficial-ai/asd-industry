# ASD Industry — v0.3 Reconstruction (Demo Only)

**ASD Industry** is a youth project-building and team-matching ecosystem, **not** an online school.

This is a **reconstruction from the October 8, 2026 handoff**, not the recovered original v0.3 ZIP (which was not available). The original GitHub repository was empty when work resumed.

## Demo features

- **Design 3** responsive dark-blue landing page, desktop and mobile navigation.
- **Sign-up-first gateway**: asks only for a nickname, age group, role, availability and interests. Visitors enter the site only after completing the demo form; returning visitors in the same tab retain their demo session.
- **Exit / reset** buttons clear the browser-tab session and return to the signup screen.
- Browser-local pseudonymous profile with interests, role and availability.
- Idea submission and transparent keyword-based risk hints (**not** an AI assessment).
- Illustrative compatibility-ranked matching against **fictional sample profiles**.
- Browser-local project workspace: task list, progress and project notes.
- **Group chat demonstration**: visible via navigation or Workspace → Open group chat, with send/delete features. Only the visitor can see messages: fictional teammates never receive, read, or reply.
- Proposed 3–6 hour wait/fallback concept shown as UI, **not** an active background service.
- Prominent guardian/legal/privacy and proposed-equity disclaimers.
- `GET /health` endpoint for hosting checks.

## Safety boundaries

**Do not treat this as a live youth community.** No authentication, guardian verification, moderation, real team matching, **real signups or real-time messaging**, database, payments, ownership allocation or third-party AI is implemented.

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

## Manual demo walkthrough (v0.3.1)

1. Open the Render URL in a fresh browser tab; the **Sign up to build** screen must appear *before* the homepage.
2. Select nickname, age range, role, availability and at least one interest; acknowledge the demo-only notice, then **Create demo profile & enter**.
3. You should reach the homepage. Open **Profile** to see your prefilled demo profile, then try updating a skill and saving.
4. Open **Find your team**, describe a project and click **Find sample teammates**. Compatibility cards must display, explicitly marked fictional.
5. Click **Create simulated project team**. Workspace task creation, completion, deletion, and local notes should work.
6. Open **Group chat** via the top navigation or Workspace's **Open group chat** button. Send and delete local-only messages.
7. Open **Risk review**; rule-based checklist should reflect the idea topic. The AI assistant button links here.
8. Click **Exit** in the header (or **Reset my demo data** in the footer), confirm, and verify the sign-up screen returns and the previous chat/project are gone.
9. Repeat on a narrow phone viewport and wide desktop. Mobile hamburger navigation should open/close correctly.

**No functionality in this demo constitutes actual user registration, legal ownership, age verification or guardian consent.** Real team chat with young users must remain disabled until moderation, reporting/blocking, verified safeguarding and authentication are implemented.
