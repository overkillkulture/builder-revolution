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
| V1 Main | `/main` | ✅ loads, 0 console errors; **channel list CURATED** 8→3 (#General/#Lobby/#Builders) | A- | — |
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

## DONE — channel curation (S446 follow-up)
- **/main channel list CURATED 8→3.** API `/api/channels` now hides SYSTEM_CHANNELS (the #alerts bug-bot/email firehose) + shows only ACTIVE channels (≥3 msgs OR active in 14d). Live-verified: {#General, #Lobby, #Builders}, 0 console errors.
- **OPSEC cleanup:** removed 7 empty (0-msg) conversations from the DB — 5 case-name channels (`preble-v-preble`, `eden-pierce`, `san-diego-mothers`, `andrea-ebbing`, `dina-sarkisova`) that were latent in the DB + 2 test rooms. Backed up to `~/.secrets/deleted-channels-backup-S446.json` (kept OUT of git — those names must never hit GitHub). Reversible.

## DONE — loop 3 (S446, engagement + profiles + bug triage)
- **Bug #2 FIXED (profile/banner image upload):** helper passed the file extension ('png') as the Supabase Content-Type → 415 invalid_mime_type → blank 500 on every profile/banner upload. Now sends the MIME type + surfaces the real error. **Live-verified: 200.** (Post images were unaffected — savePostFiles already correct.)
- **Bug #1 VERIFIED working (like + comment):** reproduced live — like 200 + count updates; comment composer + POST 200 end-to-end. Was a pre-fix-era report. Resolved.
- **2 empty rooms SEEDED:** ARAYA welcome posts in Case Builder + Builder Revolution (host voice, not impersonating Commander). Live-verified rendering.
- **Bug board triaged + made honest:** 11 bugs → 9 RESOLVED (with per-bug resolution notes) / 2 OPEN (#5 canonical toolbar port, #3 subjective "whole view"). Nothing silently left OPEN-but-fixed.

## DONE — loop 4 (S446, mobile arrival + first impression)
- **Mobile /main messenger FIXED (was 1-word-per-line squish):** the embedded Slack messenger crammed sidebar+chat into 390px. Enabled chatscope `responsive` + added a `ConversationHeader.Back` + a state-driven `cs-view-list/chat` CSS toggle → proper mobile list↔chat: land in #General full-width, Back → full-width channel list w/ previews, tap channel → chat. **Live-verified end-to-end on 390px, 0 console errors.** Desktop untouched.
- **Build Guild first impression FIXED:** newcomers were greeted by stale "the app is broken" bug posts (bugs now fixed). Removed 3 pure-test posts (backed up to `~/.secrets`), posted an ARAYA **ship-update** at top ("wave of fixes, all live…") — turns "broken" into "responsive team shipping." Live-verified.
- **Mobile arrival swept:** logged-out room view (clear "Sign in to join" CTA), login, post-login /main — all clean.

## DONE — loop 5 (S446, DM + ARAYA + routing)
- **ARAYA-in-chat VERIFIED working (the differentiator):** DM'd ARAYA "what is the Build Guild?" → she replied in ~13s WITH the development-edge honesty ("…still in-progress with some UI tweaks needed"). Users can DM ARAYA and get intelligent, honest answers. Live-verified.
- **DM flow VERIFIED:** profile → Message → creates/opens a DM; send + receive works.
- **Fixed: "Message <user>" mis-routing** — the button created the DM but navigated to /messages with no target, so auto-select-General won (click "Message ARAYA" → landed in #General). Now passes `?c=<id>` and the messenger opens that conversation. Deploying.

## OPEN — needs Commander decision (not shipped, by design)
- **Empty headline rooms:** seeded with a welcome; real ongoing content is organic (people posting). Improved empty-state ships now; actual seed content should come from a real voice (not AI impersonating Commander — deliberately avoided).
- **Offbrand toolbar / floating pink bug button:** Commander flagged twice. Replacing Munia's MenuBar with the canonical CR dock is a real React port (own worker), not this wave.

*Receipts method: every "✅" above was observed live, not inferred from code.*
