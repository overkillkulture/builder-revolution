# MAIN CHAT — OPTIMIZATION ROLLUP
## Wave 0 + Wave 1 (S446, 2026-08-19) · per blueprint 05_AGENT_ARMY_CHAT_OPTIMIZATION.md
## Method: live-verified against chat.100xbuilder.io (Playwright + DB census + curl), not code-reading alone.

---

## READINESS CENSUS (live DB, commsunity schema)
- **Users:** 224 total — 3 OAuth-linked (real), 14 guest (@community.local), ~207 migrated (email-keyed, no OAuth).
- **Rooms/posts:** build-guild=16 · case-builder=0 · builder-revolution=0 · artworks-land-lab=0 · we-expose-monsters=0.
- **Messenger (/main):** 23 CHANNEL + 41 DM + 2 ROOM + 1 GROUP conversations, 434 messages.
- **Open bugs:** 11.

## VIEW STATUS
| View | Route | Status | Grade | Next |
|------|-------|--------|-------|------|
| V1 Main | `/main` | ✅ loads, 0 console errors, full Slack messenger + Guild rail | B+ | curate legacy channels (#alerts/#Finance noise) — **Commander product call** |
| V2 Community | `/community/[slug]` | ✅ 3 rooms load, 0 errors, crash dead | B | seed/animate the 2 empty headline rooms |
| V3 Messages | `/messages` | ✅ present (DM system) | B | not deep-audited this wave |
| V5 Profile | `/[username]` | — | — | show platform rank (moat) — next wave |
| V6 Notifications | `/notifications` | — | — | next wave |
| X1/X2 Case/Movement crash | in-room nav | ✅ **DEAD** (normalizeBrand, S444) — live click-verified | — | — |

## WHAT SHIPPED THIS WAVE (all pushed to main → Railway, live-verified)
1. **Case/Movement crash** — verified dead: all 3 rooms load with 0 console errors (fix was S444 normalizeBrand; confirmed live).
2. **"Case Builder" mislabel** — the shared OG/Twitter card pointed at `og-case-builder-hq.png` with "Secure workspace for case builders" copy → showed "Case" when the link was shared (the fbclid bug). Replaced with a new on-brand `og-main-chat.png` + correct copy. **Live-verified in served meta tags.**
3. **Quick-entry impersonation** — typing any existing user's name logged you in AS them (incl. "Commander"). Now passwordless quick-entry is GUEST-ONLY: own `@community.local` namespace, can never resume a real/OAuth account or a reserved privileged name. Frictionless guest entry preserved (verified: logged in as fresh guest live).
4. **OAuth sign-in** — confirmed the S444 `allowDangerousEmailAccountLinking` fix is deployed (was the "Google sign-in error"). My quick-entry change also removes the email-squatting vector that made this linking risky.
5. **Desktop room switcher** — desktop sidebar had NO way to reach the 3 rooms (mobile-only before). Added a Rooms section. **Live-verified in screenshot.**
6. **Bug image attachments** — verified WORKING end-to-end live (upload → 200 + retrievable). The "broken" note was stale (pre-S444). Tiger's request already satisfied.
7. **Room-aware empty state** — the 2 empty headline rooms now show a per-room welcome/first-post card instead of "Nothing here yet."

## OPEN — needs Commander decision (not shipped, by design)
- **Channel curation on /main:** legacy channels (#alerts firehose, #Finance, #Direct "Test Ping", #Guardian) clutter the guild view. Deleting/renaming is a data + product decision.
- **Empty headline rooms:** Case Builder & Builder Revolution have 0 posts. Improved empty-state ships now; actual seed content should come from a real voice (not AI impersonating Commander — deliberately avoided).
- **Offbrand toolbar / floating pink bug button:** Commander flagged twice. Replacing Munia's MenuBar with the canonical CR dock is a real React port (own worker), not this wave.

*Receipts method: every "✅" above was observed live, not inferred from code.*
