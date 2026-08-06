# MECHANICS_LOG_COMMS_UNITY.md

**Project:** Comms-Unity / Case Builder HQ  
**Repo:** https://github.com/overkillkulture/comms-unity  
**Created:** 2026-08-05 by k3-b  
**Status:** Active development — daily driver push in progress

---

## 1. SYSTEM OVERVIEW

Two-service architecture on Railway:

| Service | URL | Purpose | Env |
|---------|-----|---------|-----|
| `devops` | comms-unity-production.up.railway.app | Open community | INVITE_ONLY=false |
| `casebuilderhq` | casebuilderhq-production.up.railway.app | Team/invite-only | INVITE_ONLY=true, ALLOWED_USERS |

Shared Supabase Postgres, schema `commsunity` (both services — isolation caveat).

---

## 2. WHAT'S WORKING (Verified 2026-08-05)

### Auth
- GitHub OAuth via NextAuth v5
- Google OAuth
- Quick Entry (type name, you're in)

### Social Core
- Feed with posts, likes, comments, hashtags, @mentions
- User profiles with skills/portfolio
- Notifications
- Discover/search users

### Messaging (Private Rooms + DMs)
- Create private rooms (owner/admin/member roles)
- Real-time messaging via polling (3s interval)
- DM conversations
- Room invite system (POST /api/rooms/:id/invite)

### Video (THE BIG SURPRISE)
- **Jitsi Meet embedded** via `VideoRoom.tsx` component
- Room-based video calls (each room gets unique Jitsi room: `CaseBuilderHQ_${roomId}`)
- Public /meet page for no-login video calls
- Video button in every conversation header
- Working as of 2026-08-05 — uses jitsi.riot.im

### HQ Tools Sidebar
- ARAYA chat link
- Case Crunch, Evidence Snap, Case Dashboard
- Pattern Library, Court Library, Filing Library
- Music store link

---

## 3. RECENT FIXES (S393+ / k3-b session)

| Date | Fix |
|------|-----|
| 2026-08-05 | Removed "Video" from "Coming Soon" pills — it's been working! |
| 2026-08-05 | Updated README to mark video as DONE |
| 2026-08-05 | Created this mechanics log |

---

## 4. KNOWN ISSUES (From WO-comms-unity-group-chat)

### Critical for Daily-Driver
- [ ] **ALLOWED_USERS list for HQ** — Commander has 5 names, needs to be set in Railway env
- [ ] **Separate DB schemas** — devops and casebuilderhq share one schema (users see same posts on both)
- [ ] **BOOTDOWN devops leg** — fails silently per FIX_CLIPBOARD line ~883 (node+Prisma in ~/comms-unity, empty stderr)

### SSL/Proxy (Documented, Won't Fix)
- hq.100xbuilder.io SSL never provisioned — use direct Railway URLs
- Netlify /hq proxy breaks Next.js SPA routing — DON'T re-attempt

### Pending Decisions
- [ ] **Video stack long-term** — Jitsi (now, working) vs LiveKit (planned for phone migration)
- [ ] **Rebrand** — "comms-unity" name belongs to a collaborator; need new name before public push

---

## 5. VIDEO ARCHITECTURE

```
VideoRoom.tsx (component)
  ├─ Loads Jitsi API script from jitsi.riot.im/external_api.js
  ├─ Creates room: CaseBuilderHQ_${roomId}
  ├─ Config: prejoin disabled, lobby disabled, custom toolbar
  └─ Used in:
     ├─ MessagesClient.tsx (conversation header)
     ├─ HQDashboard.tsx (hq-lobby button)
     ├─ MenuBar.tsx (hq-lobby button)
     ├─ MobileHeader.tsx (hq-lobby button)
     └─ /meet page (public video, no login required)
```

Jitsi domain: `jitsi.riot.im` (public instance)

---

## 6. FILE MAP (Key Components)

| File | Purpose |
|------|---------|
| `src/components/VideoRoom.tsx` | Jitsi embed + VideoRoomButton |
| `src/app/meet/page.tsx` | Public video room (/meet) |
| `src/app/(protected)/messages/MessagesClient.tsx` | DMs + rooms UI |
| `src/app/api/rooms/route.ts` | Room CRUD API |
| `src/app/api/rooms/[roomId]/invite/route.ts` | Room membership API |
| `src/components/MenuBar.tsx` | Sidebar with HQ Tools |
| `src/components/HQDashboard.tsx` | Dashboard with video button |

---

## 7. ENVIRONMENT VARIABLES

```bash
# Auth
GITHUB_ID=
GITHUB_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# DB
DATABASE_URL=postgresql://.../commsunity

# App
NEXTAUTH_URL=https://...-production.up.railway.app
NEXTAUTH_SECRET=

# HQ-only
INVITE_ONLY=true
ALLOWED_USERS=user1,user2,user3  # comma-separated GitHub usernames

# AI
ARAYA_CHAT_URL=https://conciousnessrevolution.io/.netlify/functions/araya-chat
```

---

## 8. HEARTBEAT (Needs Setup)

URLs to monitor:
- https://comms-unity-production.up.railway.app (expect 307 → /login)
- https://casebuilderhq-production.up.railway.app (expect 307 → /login)

Both returning 307 = healthy (redirecting unauth users to login).

---

## 9. DONE = Definition

Per WO-comms-unity-group-chat:
> Two non-Commander team members exchange messages in a room AND complete a video call together from the live URL (screenshot + both named), and the uptime heartbeat is beating.

**Progress:** Video works. Need team members with access + ALLOWED_USERS configured.

---

*3 → 7 → 13 → ∞*
