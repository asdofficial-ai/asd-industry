# ASD Industry — v0.3 Reconstruction (Demo Only)

**ASD Industry** is a youth project-building and team-matching ecosystem, **not** an online school.

This is a **reconstruction from the October 8, 2026 handoff**, not the recovered original v0.3 ZIP (which was not available). The original GitHub repository was empty when work resumed.

## Demo features

- **Design 3** responsive dark-blue landing page, desktop and mobile navigation.
- **Phone homepage refinement (Oct 9)**: mobile hero now stacks intro, actions and skyline without floating-card overlaps; the four process steps form a compact 2×2 grid, toolkit has three concise rows, and footer uses less space. Desktop styles and existing navigation remain separate. The responsive smoke test checks 320/360/390/430/600/660/768/1280px sizes for clipping and overlap.
- **Sign-up / Log in tabs**: sign-up still creates only a browser-local demo (nickname, age group, test email, country). Log in is a visually prepared but intentionally disabled preview—no account or password system exists. The password containers are disabled and never collect or store credentials.
- **Log out / reset** buttons clear the browser-tab session. Profile has a Log out button; logging out leads to the honest Log in preview (which cannot authenticate until the real system is built). Reset returns to sign-up.
- **View-only Builder Profile + separate Edit Profile screen**: Profile shows the builder card, skills, project stats and history. Pressing Edit profile goes to a separate route where you can change your picture, handle, bio, country, email, age group, skills and project preferences. The preset avatar color buttons are removed; use a neutral initials placeholder or upload any chosen PNG/JPG/WebP picture (max 3 MB, resized locally to 160 × 160). **Email always shows UNVERIFIED**; no email service is connected.
- **Self-marked completed-project history**: click **Mark project complete** in Workspace. It appears under Profile's completed projects; these entries are self-reported, local-only and are not credentials or verified achievements.
- Skills, interests, role, and availability can be set or updated separately in Profile, but they are prompted when starting a project—not on sign-up.
- Idea submission and transparent keyword-based risk hints (**not** an AI assessment).
- Illustrative compatibility-ranked matching against **fictional sample profiles**.
- **Explore projects looking for teammates** on **Find Your Team**: horizontally scrollable cards covering fictional school, technology, creative and community projects. Search by name/skill, filter by project type, and tap **I'm interested** to save/remove an interest in the browser tab. **No real joining, hiring, invitations or notifications** occur. Your own submitted idea can also appear as a clearly labeled **private draft**, visible only to you.
- Browser-local project workspace: task list, progress and project notes.
- **Group chat demonstration**: visible via navigation or Workspace → Open group chat, with send/delete features. Only the visitor can see messages: fictional teammates never receive, read, or reply.
- Proposed 3–6 hour wait/fallback concept shown as UI, **not** an active background service.
- Prominent guardian/legal/privacy and proposed-equity disclaimers.
- `GET /health` endpoint for hosting checks.

## Safety boundaries

**Do not treat this as a live youth community.** No authentication, guardian verification, moderation, real team matching, **real signups or real-time messaging**, database, payments, ownership allocation or third-party AI is implemented.

The browser stores demo data (including resized optional photos) in **sessionStorage only**, isolated to the current browser tab. It is not sent to the server. Use a test/example email and a non-identifying avatar rather than personal data or real photos of children; avoid entering real names, personal contact details, or sensitive ideas. A visitor must not be led to believe that fictional team members are real people. Clear all session data with the Reset Demo button or by closing the tab.

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
2. Choose nickname, age group, valid demo email and country; acknowledge the demo-only notice, then **Enter ASD Industry**.
3. The initial gateway offers Sign up and Log in. Log in and all password fields are disabled, clearly marked coming soon; no credentials should be collected. Use Sign up to enter the local demo. Open **Profile**: the editor must not be visible. Click **Edit profile** to navigate to the dedicated editor. Upload a picture or leave initials, update username, bio, country and skills, then save to return to Profile. Email remains UNVERIFIED.
4. Open **Find your team**: first browse the horizontally scrolling sample project cards, filter to **School projects**, search by name or skill, save an interest (it must explicitly say it is not a real join request), reload and verify the interest persists locally; remove it. Then use **I need teammates** to reach the idea form. Describe a project, choose your role, interests and availability, then click **Find sample teammates**. A private draft card must appear and the fictional match cards must remain available.
5. Click **Create simulated project team**. Workspace task creation, completion, deletion, and local notes should work. Click **Mark project complete**, then return to Profile and verify it appears in self-marked history.
6. Open **Group chat** via the top navigation or Workspace's **Open group chat** button. Send and delete local-only messages.
7. Open **Risk review**; rule-based checklist should reflect the idea topic. The AI assistant button links here.
8. Click **Log out** in Profile or the header; confirm and verify that the browser-tab data is deleted and the Log in preview appears. Real re-login is not yet available. **Reset my demo data** in the footer returns to sign-up.
9. Repeat on a narrow phone viewport and wide desktop. Mobile hamburger navigation should open/close correctly.

**No functionality in this demo constitutes actual user registration, legal ownership, age verification or guardian consent.** Real team chat with young users must remain disabled until moderation, reporting/blocking, verified safeguarding and authentication are implemented.
