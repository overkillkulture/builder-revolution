# The three projects — technical DNA

Everything a contributor + their AI need to work on each project: what it is, how it's wired, where the code is, what access it needs, current task. Technical only — no business/strategy context here.

---

## PROJ-CHATGATE — the login gate
**What:** the four ways into the chat — quick-entry (type a name → guest), Google OAuth, GitHub OAuth, and supabase-bridge (a user already signed in on the main site 100xbuilder.io carried in by their Supabase token).

**How it's wired — 4 hops per OAuth button:**
```
[1] button (/login)  →  [2] provider (accounts.google.com / github.com)  →
[3] callback (/api/auth/callback/<provider>)  →  [4] session cookie → /main
```
- Code: `src/auth.config.ts` (providers + the edge `authorized` callback), `src/auth.ts` (quick-entry + supabase-bridge credentials providers, jwt/session callbacks, guest-tier logic).
- Provider client IDs/secrets live in **Railway env** (`AUTH_GOOGLE_*`, `AUTH_GITHUB_*`) — not in this repo.
- Callback URLs are registered in the Google Cloud console and the GitHub OAuth app; they must exactly equal `https://chat.100xbuilder.io/api/auth/callback/<provider>`.

**Third-party surfaces this touches:** Google OAuth · GitHub OAuth · Railway (host + env + logs) · Supabase (User/Account/session rows) · Netlify (DNS + the main-site bridge). The browser holds the session cookie.

**Scars (don't re-solve):**
- GitHub sends an `iss` param on callback (RFC 9207); older `@auth/core` rejects it → fixed by `issuer:'https://github.com'` on the GitHub provider (`src/auth.config.ts`).
- Never run `signIn()` while a guest session is active — it tries to LINK the OAuth identity to the guest and dies. Drop the guest first (see the lobby verify component).
- Quick-entry is passwordless → guests are ephemeral `@community.local`; reserved names + homoglyphs are blocked so nobody can enter as "Commander"/an existing member.

**A gate flag:** `GUEST_GATE_ENABLED` (Railway env). `false` (current) = guests go straight into the rooms; `true` = guests must verify (Google/GitHub) first. Enforcement code: `src/app/(protected)/layout.tsx`.

**Access to work it:** this repo + Railway (logs) + Supabase (Developer).

---

## PROJ-CHATROOM — the rooms + the landing screen
**What:** the three rooms (Build Guild / Case Builder / Builder Revolution), their channels, DMs, members, and the `/main` screen you land on.

**How it's wired:**
- Rooms = "communities": `/community/build-guild|case-builder|builder-revolution` (singular `/community/`). Combined Slack-style view = `/main`.
- Code: `src/app/(protected)/main/`, `src/app/(protected)/community/[slug]/`.
- Data: `commsunity` schema in Supabase — `User`, `Community`, `Conversation` (type CHANNEL/DM/ROOM), `Message`, `ConversationMember`.

**Known bug folded into the task:** `src/app/(protected)/community/[slug]/page.tsx` redirects signed-in visitors to `/main` unconditionally, discarding the room slug — so clicking "Builder Revolution" dumps you in Build Guild. Fix: carry the room (`/main?room=<slug>`) or give each room its own full view.

**CURRENT TASK (first good PR):** `/main` is too busy — a newcomer lands in a wall of stacked panels (channels, messages, members, guild-abilities, cards, work-orders) and the actual chat is a thin sliver in the middle. **Goal: a Discord-shaped 3-column view** — LEFT: room + channel list (+ DMs). CENTER: the selected channel's messages filling the screen + the composer at the bottom. RIGHT: members (optional, collapsible). Hide the Feed/Discover/Posts furniture and move the work-order/cards rail off the chat screen. A stranger should understand where they are in 5 seconds. No keys required — pure front-end.

**Access to work it:** just this repo.

---

## PROJ-USERTRACK — user tracking (the funnel)
**What:** instrument the funnel so we can see who arrives, stalls, verifies, and buys. Today there's zero instrumentation — breaks are invisible.
**Where it lives:** mostly the **main-site repo** (Netlify functions) + a `funnel_events` table in Supabase + a `/go/<slug>` redirect that counts every published link. Payments truth = Stripe (read).
**Build:** add `createdAt` to `commsunity.User`; create `funnel_events`; write server-side events (arrive → guest → auth-click → callback ok/fail → first message); one weekly "users per step" query.
**Access to work it:** Supabase + Netlify + Stripe (read) + the main-site repo.

---

*Deeper strategy/history for these projects is held by the maintainers off-repo. This file is the technical truth needed to build.*
