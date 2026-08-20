# CASE BUILDER — FOUNDATION INDEX (S326, 2026-07-07)

One door into the bones. The team walked Case Builder (comms-unity, a Munia fork → casebuilderhq-production.up.railway.app). **The skeleton is correct; the organs aren't built; and three things are on fire.** Developers: read this page, then the four blueprints, then build in the order below.

---

## 🔥 ON FIRE — fix BEFORE onboarding a single builder (see 04_ADVERSARIAL_WALK.md)
1. **Production database is DEAD.** Every Prisma query 500s (posts, users, bugs). Login/register write to the DB → **nobody can log in right now.** The live server is unusable. → Fix `DATABASE_URL` + `prisma db push` on Railway. [COMMANDER/OPS]
2. **Passwordless "Quick Entry" login = account takeover.** `src/auth.ts` logs you in as ANY existing user by typing their display name. On a legal-case app this is catastrophic. → Remove the quick-entry credentials provider; require real auth (OAuth/password). [DEV — do first]
3. **Live GitHub PAT leaked** in `.git/config` remote URL (push access, working tree). → Rotate the token + switch remote to SSH. [COMMANDER]

**Survival rating today: 2/10. Verdict: REVISE. Do not seed the core team until 1–3 are cleared.**

---

## THE VERDICT: correct spine, no organs
Case Builder is Munia (a social network) with private rooms bolted on. A "room" is a `Conversation(type='ROOM')`; every business feature can hang off `ConversationMember`. Nobody needs to re-architect — just add organs to a correct skeleton. It **cannot run a business today**: no door in, no room-scoped content, roles are free-text strings, no files, no billing, and the AI ignores the room it's in.

## THE BLUEPRINTS
- **01_USER_FLOW_AND_PERMISSIONS.md** — the walked flow + the permission spine. Two axes: platform tier (Guest→Member→Staff→Owner) and room role (Guest→Member→**Builder**→Admin→Owner). Builder is the proving-ladder rung, earned by completing tasks.
- **02_AI_CONCIERGE_AND_COCKPITS.md** — the in-room AI (already BYOK provider-swappable) returns action-link cards from a server-owned whitelist + an escalate path to the human team. Per-job-title cockpits (Commander/Builder/Legal/Member/Guest), one shell, role-filtered panels — **fully greenfield** (the "HQ" is just a Jitsi page today).
- **03_ROOM_FILE_SHARING.md** — per-room files: new `RoomFile` model, **private** `room-files` bucket + signed URLs (today's uploads go to a PUBLIC bucket — case evidence would be world-readable), role-gated. ~70% reuses Munia's Supabase upload plumbing.
- **04_ADVERSARIAL_WALK.md** — real status codes + the fire list above + SSRF in the AI route (`x-ai-endpoint` header → server fetches any URL) + public-by-design data (`/api/posts` no-auth, public `/meet`).
- **05_AGENT_ARMY_CHAT_OPTIMIZATION.md** (S446) — the wave that turns "a broken chat" into a dev workspace: 6 views enumerated, an agent org chart (Scout/Eye/Hands/Red-team/Judge/Shield), a per-view loop (catalog→reference→diff→fix→grade→verify), and a fires-first execution order (kill the Case/Movement crash + the Build-Guild mislabel before any polish). Commander bug #8.

## THE BUILD ORDER (consensus across all four blueprints)
0. **Clear the 3 fires** (DB, quick-entry, PAT).
1. **Permission spine** — `RoomRole`/`MemberStatus` + `User.platformTier` enums + one `src/lib/permissions.ts` (`requireRoomRole`). Everything gates off this.
2. **The door** — `RoomInvite` model + invite links + request-to-join/approve. Fixes the #1 dead-end (today you can only be added by exact username — which is why "get the core team in" has no mechanism yet).
3. **Task board** — `Task` scoped to room; complete → auto-promote Member→Builder. The board and the ladder are the same feature.
4. **Room-scoped comms + room-aware AI** — add `conversationId` to `Post`; feed the room's members/messages/tasks into the AI prompt (it's handed the room id but never reads it).
5. **Files** — the `RoomFile` model + private bucket (03).
6. **Cockpits** — the role-filtered `/rooms/[roomId]` shell (02).
7. **Receipts + billing** — `AuditEvent` on every privileged action (closes the silent-failure gap: invites currently notify no one and leave no record) + `Subscription` + Stripe, Owner-gated. Makes the $97/mo real.

## SECURITY GATES before public builders (from the walk)
- Kill quick-entry impersonation · rate-limit + SSRF-guard the AI route (allowlist outbound) · make `/api/posts` auth-gated or explicitly public per-room · add a `/meet` lobby · move files to a private bucket · audit-row every privileged action.

## 4D + Action-Reaction grade (rooms-as-businesses): NOT done
D1 Surface C · D2 Control D · D3 Telemetry F (no audit trail) · D4 Agency C · **AR FAIL** (invites add members with no notification/receipt/audit). The build order above is what turns these green.
