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

## Where the work is

- **First cards (the "READY" set):** newcomer-safe work orders, each scoped so a
  stranger + their agent can complete it without internal access. Ask for the current
  READY list, or check the dev board's **Help Wanted** filter.
- **The contract:** read `CONTRIBUTING.md` in this repo before your first PR. In pack
  repos, `AGENTS.md` + `harness.html` are self-contained — your agent can read them
  and go.
- **The one required check:** Widget Contract Lint (in pack repos). Green = mergeable.

## Ask ARAYA

Stuck on where a thing lives, what a card means, or how the system fits together —
ask ARAYA in the chat. She's the concierge. You don't have to read the whole map to
start; you have to start.

---
*Build what you actually need. We'll follow you to it.*
