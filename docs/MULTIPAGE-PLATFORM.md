# ASD Industry — Multi-page platform preview

Branch: `feature/v0.5-multipage-private-projects`

## The correct founder workflow

1. **Project founder applies to ASD Industry** from the separate Projects page.
2. **ASD Industry staff reviews** the project. In this preview, a plainly labelled *staff simulation* page mimics the decision without real permissions or legal effect.
3. Once approved, the founder decides the exact **number of additional teammates** (1–12) in their project request and recruits that number from **fictional** matched profiles.
4. Only **after those places are filled** does the founder unlock **Create private demo group**.
5. The group's dedicated **Team Chat** and **Workspace** are private *in the intended product design*: the only accessible session in this demo is the founder's current browser session. There are no real teammates and no shared live communications.
6. The community **Home** page is an entirely separate feed for showcasing work. Project applications, discussions, and tasks are never automatically posted publicly.

## Pages

- `/home.html` — community builder feed: local progress, photo, video, and document showcase cards (no actual upload)
- `/discover.html` — discovery with fictional builders and project examples
- `/projects.html` — application, status tracking, demo recruitment, founder-only group creation
- `/team.html` — private team chat demonstration, inaccessible before group creation
- `/workspace.html` — team tasks, members, project history and future private file storage
- `/profile.html` — basic builder identity, activity, bio and exit
- `/notifications.html` — local application and recruitment activity
- `/review.html` — **UNPROTECTED STAFF SIMULATION. DO NOT USE FOR REAL PROJECT APPROVALS.**

## Test in browser

Start at `/` (the demo sign-up gate). Choose a nickname and age group, then enter the site.
Your browser opens `/home.html`. Try moving through the separate pages using the desktop sidebar or mobile bottom navigation.
On Projects, request a project with two additional members. Visit `/team.html` and `/workspace.html` first—both must refuse access.
Visit `/review.html` and use the clearly marked *simulated approval*. Return to Projects, recruit two fictional builders, then have the founder create the private **demo** group.
Now visit Team Chat and Workspace and try local messaging, tasks and the progress timeline.

## Privacy and release limits

**This version is deliberately not a secure shared service.** The workflow is simulated entirely in `sessionStorage` on the client's tab. Client-side checks are **not** server authentication or access control. Every fictional candidate is a demo object, not another human.

For real use by minors, require verified accounts, guardian/age safeguards as required, server-side project and member authorization, genuine staff permissions, invite acceptance, moderation/reporting, safe messaging/file handling, audit trails, safeguarding controls, appropriate legal documentation, and privacy-by-design protections. Do not use the mock staff-review page as a production endpoint. No payments or equity are active.

Existing v0.4 account/email-OTP prototype remains in a **different unmerged branch**, requiring a separate database and verified email sender before use.
