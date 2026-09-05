# Working on a project here — the contributor flow

This repo is **Main Chat** (chat.100xbuilder.io), the community app for 100X Builder. This is how you pick up a project and ship a change. If you're an AI pairing with a contributor, read this + `docs/PROJECTS.md` — together they're the full technical DNA.

## The flow (land → pick → work → ship)
```
1. In Build Guild (the chat) you'll see three project cards on the board:
      PROJ-CHATGATE   — the login (Google / GitHub / guest sign-in)
      PROJ-CHATROOM   — the rooms + the screen you land on
      PROJ-USERTRACK  — user tracking (who arrives / stalls / buys)  [lives in the main-site repo]
2. Pick one. Its wiring is in docs/PROJECTS.md (right here in the code you cloned).
3. Get the access your task needs (table below). Front-end work needs nothing but this repo.
4. Branch → change → open a PR. A maintainer reviews. Auth / money / DB changes get a human yes first.
5. Merge → auto-deploys (Railway rebuilds chat.100xbuilder.io in ~2 min).
```

## Access — least privilege, ask only for what your task touches
| Your task | Needs | How to get it |
|---|---|---|
| Chat layout / rooms / any front-end (most of the app) | **just this repo** | you're already in it — clone and go |
| Login/gate backend (PROJ-CHATGATE) | + Railway (logs, env) | ask a maintainer for a Railway invite |
| Anything touching the database | + Supabase (Developer role) | ask a maintainer for a Supabase invite |
| User tracking (PROJ-USERTRACK) | main-site repo + Netlify + Stripe(read) | separate onboarding — ask a maintainer |

**You never receive a password.** Access is always an invite to your own login (your own 2FA, revocable). Secrets live in the host's env vars — never in this repo, never in chat. If a task looks like it needs a secret, it doesn't; ask.

## Run it locally
```
npm install
cp .env.example .env.local     # ask a maintainer for any dev values you need
npm run dev                    # http://localhost:3000
```
Next.js 14 (App Router) + Prisma + NextAuth. Auth: `src/auth.ts`, `src/auth.config.ts`. Rooms/UI: `src/app/(protected)/`.

## Rules (short)
1. Branch + PR always — no direct push to `main`.
2. No secrets in code (the deploy scans for them).
3. Auth (`src/auth*`), money, or DB-schema changes need a maintainer's approval.
4. Verify in the running app before calling it done; say what you saw in the PR.
