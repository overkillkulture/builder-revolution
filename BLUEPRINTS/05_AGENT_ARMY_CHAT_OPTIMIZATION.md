# 05 — AGENT ARMY: MAIN CHAT OPTIMIZATION
## S446 (2026-08-19) · Commander order (bug #8, verbatim): "catalog every click, every view, save it, look at the screenshot of the view and optimize it toward optimized existing software… there's probably only five different views for the build guild and this is not software development, this is just a broken chat."
## SCOPE: BLUEPRINT ONLY — the plan we grade first, execute second. Nothing is deployed by this doc.
## TARGET: Main Chat = the Munia fork. Repo `C:/Users/dwrek/comms-unity` → Railway `devops` → `https://chat.100xbuilder.io`. See [[reference_main-chat-access-recipe]] for all 5 handles.

---

## 0. THE MISSION, IN ONE LINE
Turn a **broken chat** into an **agile software-development workspace** by cataloging every view, screenshotting each against a best-in-class reference (Slack / Discord / Linear), reverse-engineering the gap, and fixing it — one view at a time, receipts at every step. This is not a rebuild. It is a **combing wave** ([[wave]] doctrine) over a fixed, small surface (~6 views).

## 1. THE SURFACE — every view, enumerated (from `src/app/(protected)`)
The Commander said "probably only five." Live count is **6 canonical views + 2 crash entry points**. This is the whole battlefield — it does not grow.

| # | View | Route | What it is | Reference to beat |
|---|------|-------|-----------|-------------------|
| V1 | **Main / Slack view** | `/main` | channel list + message pane (the "just like Discord" view) | Slack workspace |
| V2 | **Room / Community** | `/community/[slug]` (e.g. `build-guild`) | a room's feed + members + tabs | Discord server channel |
| V3 | **Messages / DM** | `/messages` | the ONE canonical DM system | Slack DMs |
| V4 | **Feed / Discover** | `/feed`, `/discover` | social timeline | — (de-emphasize for a dev workspace) |
| V5 | **Profile** | `/[username]` | user card + tabs (posts/follows) | Discord profile / rank card |
| V6 | **Notifications** | `/notifications` | activity list | Linear inbox |
| ⚠ X1 | **Case button** | in-room nav | **CRASHES whole site** (client-side exception) — bug #9 | must not exist / must not crash |
| ⚠ X2 | **Movement button** | in-room nav | **CRASHES whole page** — bug #9 | same |

**Known truths already on file (don't re-discover — fix):**
- V2 Build Guild shows the label/thumbnail **"Case Builder"** instead of Build Guild (bug #8, #9).
- Bottom bar is Munia's **own MenuBar**, not the canonical CR dock — Commander calls it "some offbrand toolbar at the bottom with a floating pink bug." ([[feedback_toolbars-on-everywhere]])
- **Quick-entry impersonation hole**: any name logs in as anyone (`src/auth.ts`) — carried since FOUNDATION 00_FIRE.
- Bug-image attachments silently drop (`/api/upload-bug-attachment`).

## 2. THE ARMY — org chart (roles, not headcount)
Each cell is an agent spawn ([[trinity]]/[[seven]]/[[wave]] agents). The army runs as a **pipeline**, not a mob: catalog → reference → diff → fix → verify. One Foreman owns the loop; nothing merges without the Judge.

```
                 M5 FOREMAN (owns the wave loop, reports to Commander)
                          │
   ┌──────────┬──────────┼───────────┬────────────┬───────────┐
  C5 SIGNAL  C8 DESIGNER C1 MECHANIC C9 ADVERSARY C7 CHARACTER C4 GUARDIAN
  (Scout)    (Eye)       (Hands)     (Red team)   (Judge)      (Shield)
```

| Agent | Role in this wave | Concrete job |
|-------|-------------------|--------------|
| **C5 Signal — Scout** | CATALOG + REFERENCE | For each Vn: Playwright-drive it, screenshot every state, list every click/button, save to `AUDIT/Vn/`. Then fetch a best-in-class reference screenshot (Slack/Discord/Linear) of the same view. |
| **C8 Designer — Eye** | DIFF | Put our shot next to the reference. Name the deltas in words: spacing, hierarchy, what's missing, what's noise. Output a ranked gap list per view. |
| **C1 Mechanic — Hands** | FIX | Take the top gap for one view, implement in `comms-unity` (React/Next/Tailwind), land on `main`. One view per worker, capped 2–3 concurrent (wave rule). |
| **C9 Adversary — Red team** | STRESS | Click everything a stranger would. Reproduce the crash buttons (X1/X2). Try to break each fixed view before it ships. |
| **C7 Character — Judge** | GRADE | Nothing merges without a pass. Re-run the 4D grade (Surface/Control/Telemetry/Agency) per view; regression check the whole set. |
| **C4 Guardian — Shield** | SECURE | Owns the carried fires: quick-entry impersonation, public buckets, SSRF in AI route. A view isn't "done" if it ships an auth hole. |

## 3. THE LOOP — one view, start to finish (repeat 6×)
This is the unit of work. The army runs it per view, in a `pipeline()` so V2 can be in FIX while V3 is still in CATALOG.

```
1. CATALOG  (C5) → screenshot every state + list every click → AUDIT/Vn/catalog.md
2. REFERENCE(C5) → fetch best-in-class screenshot of the same view → AUDIT/Vn/reference.png
3. DIFF     (C8) → side-by-side, ranked gap list        → AUDIT/Vn/gaps.md
4. FIX      (C1) → implement top gaps on `main`         → commit + push
5. STRESS   (C9) → try to break it, reproduce crashes    → AUDIT/Vn/adversary.md
6. GRADE    (C7) → 4D + regression, pass/revise          → AUDIT/Vn/grade.md
7. VERIFY   (—)  → Railway builds ~2–4min; curl live, confirm change → mark DONE
```
**Exit test per view (all must be true):** renders on live · no crash on any click · label matches room · no offbrand/duplicate chrome regression · Judge ≥8/10 · no new auth hole. Miss any → back to step 4.

## 4. EXECUTION ORDER — fires before polish
The wave does NOT start at "make it pretty." It starts at "make it not crash," because a crashing view can't be optimized.

- **WAVE 0 — STOP THE CRASH (P0, before anything):** kill/guard the Case & Movement buttons (X1/X2, bug #9). Fix the V2 "Case Builder" mislabel → "Build Guild." These are the Commander's live complaints; they gate everything.
- **WAVE 1 — THE DEV WORKSPACE VIEWS (V1, V2, V3):** the three views a developer actually lives in. Optimize toward Slack/Discord. This is where "agile software development" gets earned.
- **WAVE 2 — SUPPORT VIEWS (V5, V6):** profile (show platform rank — the Discord-can't-do-this moat) + notifications.
- **WAVE 3 — DE-EMPHASIZE (V4):** feed/discover is social-network residue; decide keep-minimal vs hide for the dev workspace. Judge call, not a build.
- **CROSS-CUT — THE ONE TOOLBAR:** replace Munia's MenuBar with the canonical CR dock, OR formally bless MenuBar as the chat's dock in the registry. This is a **real React port**, not copy-paste ([[reference_main-chat-access-recipe]] §"PUT OUR TOOLBAR ON IT") — scope it as its own worker, don't smuggle it into a view fix.

## 5. WHERE IT WRITES — the catalog is the deliverable
Everything the army sees becomes a file, so the next session is never blind (the whole point of bug #8: "save it").
```
comms-unity/BLUEPRINTS/AUDIT/
  V1_main/        catalog.md · reference.png · gaps.md · adversary.md · grade.md
  V2_community/   …
  V3_messages/    …
  V4_feed/  V5_profile/  V6_notifications/
  _ROLLUP.md      ← one table: view · gaps-found · gaps-fixed · grade · status
```
**Wiring law (HALT LAW compliance):** Main Chat and each of its 6 views must be a **ROW in the object registry** ([[project_object-spine]]) — `num·name·kind·parent·pics·how·dna·uses·grade·last·next`. The `pics` column points at the AUDIT screenshots; `grade` is the Judge's score; `next` is the top open gap. If a view isn't a row, this wave didn't happen. No orphan views.

## 6. THE MOAT — why optimize a fork instead of using Slack/Discord
Every fix must push toward the one thing Discord/Slack **can't** do: the platform flows INTO the chat. Rank/XP shows on your name (V5), profession packs and widgets run in-room (V2), tasks completed in the room promote Member→Builder ([[FOUNDATION_INDEX]] build-order step 3). A view "optimized" to look like Slack but that throws away the rank/task integration has failed. Beat Discord on parity, then win on the moat.

## 7. GUARDRAILS (so the army doesn't sprawl)
1. **6 views, fixed.** No new view, no new chat surface may be born (chat-gate law, [[CHAT_GATE_BLUEPRINT]]). A "new screen" = a state of an existing view or it doesn't ship.
2. **One `main`, land isolated fixes straight on it** (feature branches carry unmerged work). Push → Railway auto-builds.
3. **2–3 FIX workers max concurrent** (wave rule) — the bottleneck is review, not typing.
4. **Nothing silent** ([[feedback_gauges-nothing-fails-silently]]): every merge writes a grade row; every dropped gap is logged in `_ROLLUP.md`, never quietly skipped.
5. **Verify live, always** ([[feedback_sandcastle-law]]): a fix isn't done until curled on `chat.100xbuilder.io`.
6. **Guardian holds a veto** on any view that ships an auth/security regression.

## 8. GRADING RUBRIC (score the whole wave 1–10 each, target ≥8)
1. **Completeness** — are all 6 views cataloged with screenshots saved?
2. **Reference honesty** — is each gap measured against a real best-in-class shot, not a vibe?
3. **Crash-kill** — do X1/X2 and the mislabel die in Wave 0?
4. **Dev-workspace fit** — do V1–V3 feel like a place developers would work, not "a broken chat"?
5. **Moat** — does rank/task/pack integration show up, beating Discord where it counts?
6. **No-orphan wiring** — is every view a registry row with pics+grade+next?
7. **Toolbar clarity** — is there exactly ONE dock, named in the registry (ported or blessed)?
8. **Reproducibility** — could a stranger run the next wave from `_ROLLUP.md` alone?

---
*6 views. One loop, run six times. Catalog → reference → diff → fix → grade → verify. The army's output is a folder of receipts and a chat that stops being broken. — S446*
