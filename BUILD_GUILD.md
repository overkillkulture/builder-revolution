# The Build Guild — start here

You're in because you (or your coding agent) can build. This doc is the room:
what's here, how to get files, and where the work is. Clone the repo and you have
everything — the repo **is** the file drop.

## The deal (read this first)

We're going to tell you the **vision of what we think we need**. Then we're going to
get out of your way. You'll probably build something better than our spec — because
you'll build what's *actually* needed once your hands are in it. That's the point.
Don't wait for permission. Ship it, PR it, tell us what you learned.

**Who this is for right now:** builders who have a **coding agent** (Claude Code, or
any coding agent) — or who code themselves. The whole system is designed for
agent-assisted building. If you have an agent, point it at a card and go.

**Repo access is early-only.** The first wave of builders gets push access to do the
heavy lifting. Once the platform can safely route outside contributions through
packs + PRs, we close direct repo access. So if you've got push rights: you're a
founding builder. Use it.

## Two lanes — pick yours

**Lane A — Build the platform (heavy lifters).**
Work the top of our to-do list. Repo access, real cards, XP + rank for shipping.
This repo (`comms-unity`, the cockpit/community app) and the site repo
(`overkor-tek/consciousness-revolution`) are where the heavy lifting lives.

**Lane B — Bring your own project.**
You've got your OWN thing you're building (a program, an album, an empire). You don't
need our backlog — you need our **work-order / to-do system** to map out what's left
in *your* build. Use the board to scope your own program. Same tools, your mission.
(This is Tiger's lane, the music lane — you're not taking on our work, you're using
our system on yours.)

## Get the files

```bash
# The cockpit / community platform (Next.js 14 + Prisma + Supabase)
git clone https://github.com/overkillkulture/comms-unity.git

# The live site (pulse.html, widgets, the 5-widget foundational window)
git clone https://github.com/overkor-tek/consciousness-revolution.git
```

Everything you need to build is in the clone. For **room-scoped shared files** (docs,
evidence, assets that live inside a Build Guild room rather than in git), this repo
now ships a room file API — see **`BLUEPRINTS/03_ROOM_FILE_SHARING.md`** and
`src/app/api/rooms/[roomId]/files/`. Upload needs `builder` role in the room;
downloads are signed, short-lived, and gated by role.

## Your first card (start here — no internal access needed)

**WO-one-click-video-room** — the video room front door, on our rail, one click, no
account. It works today (public Jitsi via `meet.jit.si`); your job is to make it
*shareable*.

1. `git clone https://github.com/overkillkulture/comms-unity.git && cd comms-unity && npm install`
2. Read **`AGENTS.md`** at the repo root — it's the contract (setup, the required
   check, the map). Your agent can read it and go.
3. Run it locally (SQLite, ~5 min — see `AGENTS.md`), open `http://localhost:3002/meet`,
   type a name → you're in a video call.
4. **Ship this:** add a **"Copy invite link"** button to the joined-state top bar of
   `src/app/meet/page.tsx` that copies the room URL (`/meet?room=<room>`) with a 2s
   "Copied!" confirm. Small, self-contained, no backend. (See a better first thing once
   your hands are in it? Build that and say why in the PR — that's the point.)
5. `npm run typecheck` must pass → open a PR against `main`.

## Where the rest of the work is

- **The contract:** `AGENTS.md` (agent-first) + `CONTRIBUTING.md` (the human read) in
  this repo. Read one before your first PR.
- **The one required check:** `npm run typecheck` (CI runs it automatically). Green =
  mergeable. Lint is informational — don't reformat files your task didn't touch.
- **More cards:** the "READY" set is newcomer-safe work, each scoped so a stranger +
  their agent can finish it without internal access. Ask ARAYA in the chat for the
  current READY list, or check the dev board's **Help Wanted** filter.

## Ask ARAYA

Stuck on where a thing lives, what a card means, or how the system fits together —
ask ARAYA in the chat. She's the concierge. You don't have to read the whole map to
start; you have to start.

---
*Build what you actually need. We'll follow you to it.*
