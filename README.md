# COMMS-UNITY

**Communications + Unity + Community**

An open source social platform built for the Builder Revolution. This is a fort. Help us turn it into a castle.

**Live:** [comms-unity-production.up.railway.app](https://comms-unity-production.up.railway.app)

---

## What Is This

A full-stack community platform where builders connect, share work, and level up together. Think Instagram meets Discord meets a builder marketplace — but open source and owned by nobody.

We forked [Munia](https://github.com/leandronorcio/munia) (MIT license), ripped it apart, and rebuilt it for builders of all kinds — not just developers. Welders, lawyers, artists, systems thinkers, grandmothers who understand pattern theory. Everyone who builds something.

## What's Working

| Feature | Status |
|---------|--------|
| Social feed (posts, likes, comments, hashtags, @mentions) | Live |
| Direct messages (1-on-1 and group chat) | Live |
| User profiles with skills and portfolio links | Live |
| GitHub OAuth login | Live |
| Quick Entry login (type a name, you're in) | Live |
| Discover / search users | Live |
| Notifications | Live |
| Builder intake form (what do you build, why, skills, links) | Live |
| Bug reporter with screenshot capture | Live |
| Dark theme (green/purple) | Live |
| Terms of Service | Live |
| Public feed (browse without login) | Live |

## What Needs Building

This is where you come in. Fork it, build a feature, submit a PR.

| Feature | Difficulty | Impact |
|---------|-----------|--------|
| **Voice channels** (LiveKit — Xbox-style join/leave) | Medium | Huge |
| **Video calls** (Jitsi Meet — ✅ WORKING in rooms + /meet page) | Done | Huge |
| **Screen share** (Jitsi has this — verify UX) | Easy | High |
| **Image uploads** (Supabase Storage) | Easy | High |
| **Real-time chat** (WebSocket, replace polling) | Medium | High |
| **Mobile optimization** | Easy | High |
| **User search by skills** | Easy | Medium |
| **Builder marketplace** (list services, find people) | Medium | Huge |
| **ARAYA AI integration** (AI user that posts, moderates) | Medium | High |
| **Email notifications** | Easy | Medium |
| **Custom domains** | Easy | Medium |

## Tech Stack

- **Next.js 14** — React framework (App Router)
- **TypeScript** — type safety
- **Tailwind CSS** — styling
- **Prisma** — database ORM
- **PostgreSQL** (Supabase) — database
- **NextAuth.js 5** — authentication (GitHub OAuth + Credentials)
- **React Query** — client-side data fetching
- **chatscope** — chat UI components
- **Railway** — hosting

## Get It Running Locally

```bash
# Clone it
git clone https://github.com/overkillkulture/comms-unity.git
cd comms-unity

# Install
npm install

# Set up your database (SQLite for local dev)
# Edit prisma/schema.prisma — change provider to "sqlite"
# Create .env with: DATABASE_URL="file:./dev.db"

# Push schema and generate client
npx prisma db push
npx prisma generate

# Seed with starter content
node scripts/seed-community.mjs
node scripts/seed-messages.mjs

# Run it
npm run dev
# Open http://localhost:3002
```

## How to Contribute

1. **Fork this repo**
2. **Build something** — pick from the list above or build whatever you think is missing
3. **Submit a PR** — describe what you built and why
4. **Join the community** — [comms-unity-production.up.railway.app](https://comms-unity-production.up.railway.app)

No gatekeepers. No committees. If it makes the platform better, it gets merged.

### The Five Questions

When you join, we ask five questions. These aren't just profile fields — they're how we list you in the builder network:

1. **What do you build?**
2. **Why do you build it?**
3. **How long have you been building?**
4. **What do you know?** (skills — anything counts)
5. **Link to what you're building**

## The Vision

Get builders into a video communications platform where we can talk, share screens, teach each other, and optimize the platform itself while we're using it. Build the ship while sailing it.

Voice channels are next. LiveKit (open source WebRTC) is the play — Xbox-style voice rooms where you click in, talk, click out. Screen sharing for teaching. AI that listens and helps.

## Architecture

```
Browser → Next.js (Railway) → Prisma → PostgreSQL (Supabase)
                ↓
        NextAuth (GitHub OAuth + Quick Entry)
                ↓
        React Query (client caching)
                ↓
        chatscope (DM UI)
```

## License

MIT — do whatever you want with it.

## Built By

The Consciousness Revolution community. Started by [@overkillkulture](https://github.com/overkillkulture).

**The revolution doesn't need followers. It needs builders.**

3 → 7 → 13 → ∞
