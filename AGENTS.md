# AGENTS.md — comms-unity

You are a coding agent working on **comms-unity**, an open-source builder/community
platform (Next.js 14 App Router + TypeScript + Prisma + PostgreSQL/Supabase). This file
is the contract: read it, then go. The repo **is** the file drop — everything you need
to build is in the clone.

## The loop (what "done" looks like)

1. Fork → clone → branch.
2. Make the change. Keep the diff surgical — touch only what the task needs.
3. **Pass the required check** (below). Green = mergeable.
4. Open a PR describing what you built and why. No committee, no gatekeepers.

## Setup (about 5 minutes)

```bash
npm install                     # runs `prisma generate` via postinstall
```

For a runnable local instance you also need a database. For quick local dev, use SQLite:

```bash
# In prisma/schema.prisma set datasource provider = "sqlite"
echo 'DATABASE_URL="file:./dev.db"' > .env
npx prisma db push
node scripts/seed-community.mjs   # optional starter content
npm run dev                       # http://localhost:3002
```

Note: the default `npm run build` runs `prisma db push` against `DATABASE_URL`, so it
needs a real database — **do not** run the full build just to check your code. Use the
checks below instead.

## The required check (this is what CI gates on)

```bash
npm run typecheck        # tsc --noEmit — MUST pass. This is the PR gate.
```

Typecheck is the one blocking check. Make sure it's green before you open the PR — CI
runs exactly this.

```bash
npm run lint             # next lint — informational only (repo has pre-existing
                         # prettier drift; CI does not block on it). Don't reformat
                         # files your task didn't touch.
```

## Rules

- **Match surrounding style.** The repo is not fully prettier-clean; do not run a
  repo-wide format — it buries your actual change in noise.
- **No new gates.** Don't add auth barriers or paywalls to core features.
- **Keep it simple.** If a grandmother can't figure out your UI, simplify it.
- **MIT license** — everything stays open.
- One task per PR. Small, reviewable diffs merge fast.

## Map (where things live)

| What | Where |
|------|-------|
| Pages / routes (App Router) | `src/app/**` |
| API routes | `src/app/api/**` |
| Shared React components | `src/components/**` |
| Video room (Jitsi embed) | `src/components/VideoRoom.tsx`, `src/app/meet/page.tsx` |
| DB schema | `prisma/schema.prisma` |
| Auth (NextAuth 5) | `src/auth.ts` |
| Room file sharing API | `src/app/api/rooms/[roomId]/files/**` + `BLUEPRINTS/03_ROOM_FILE_SHARING.md` |
| Design/architecture notes | `BLUEPRINTS/**` |
| Contributor contract / where to start | `CONTRIBUTING.md` |

## Your first card

A good newcomer-safe starter is the **video room**: `src/app/meet/page.tsx` and
`src/components/VideoRoom.tsx` embed a public Jitsi Meet room (`meet.jit.si`). Open
`/meet`, type a name, and two guests should be able to talk. For the broader backlog,
read `CONTRIBUTING.md` (§ "What We Need"), ask ARAYA in the chat for the current
**READY** list, or check the dev board's **Help Wanted** filter.

---
*Build what you actually need. We'll follow you to it. 3 → 7 → 13 → ∞*
