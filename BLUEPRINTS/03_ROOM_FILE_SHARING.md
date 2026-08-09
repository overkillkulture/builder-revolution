# BLUEPRINT 03 — Per-Room File Sharing (Case Builder)

**Status:** BUILT (S425) — model + API + role gate shipped and typecheck-clean. Two deploy
steps remain before it's live: (1) `prisma migrate` against the real DB, (2) create the
PRIVATE `room-files` bucket in Supabase Storage. Code:
`prisma/schema.prisma` (`RoomFile`), `src/lib/s3/roomFilesStorage.ts`,
`src/lib/isValidRoomFileType.ts`, `src/lib/rooms/roomRoles.ts`,
`src/app/api/rooms/[roomId]/files/{route.ts,[fileId]/route.ts}`. The sketch below is the
original spec — the shipped code follows it (roles stored lowercase, minRole capped, etc.).
**Author:** C1 Mechanic (S326) · Built C1 (S425)
**Target repo:** `comms-unity` (Munia fork, Next.js 14 App Router + Prisma + Supabase)
**Depends on:** the Owner/Admin/Builder/Member/Guest role model a sibling agent is defining (Blueprint 02 / room roles).

---

## 1. WHAT EXISTS TODAY (verified in code)

### Storage — Supabase Storage (mislabeled "s3")
The `src/lib/s3/` folder does NOT use AWS S3. It was ported to **Supabase Storage**.

| File | What it does |
|------|--------------|
| `src/lib/s3/s3Client.ts` | Creates a Supabase client with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Bucket const: `STORAGE_BUCKET = 'hq-posts'`. |
| `src/lib/s3/uploadObject.ts` | `uploadObject(buffer, fileName, contentType)` → `supabase.storage.from(bucket).upload(...)` with `upsert:false`. |
| `src/lib/s3/deleteObject.ts` | `deleteObject(fileName)` → `.remove([fileName])`. |
| `src/lib/s3/fileNameToUrl.ts` | Builds a **PUBLIC** URL: `${SUPABASE_URL}/storage/v1/object/public/hq-posts/${fileName}`. |
| `src/lib/s3/savePostFiles.ts` | Takes `(Blob\|string)[]`, uploads Blobs, names them `${Date.now()}-${uuid()}.${ext}`, returns `{type, fileName}[]`. |

**Critical fact:** `hq-posts` is a **public** bucket. Anyone with the filename URL can read the file, no auth. Fine for social post photos — **NOT acceptable for case evidence.** See Storage Decision (§4).

### Upload flow that already works (the pattern to copy)
`src/app/api/posts/POST.ts` → `serverWritePost.ts`:
1. `request.formData()` (multipart)
2. Zod validate, `isValidFileType()` (currently allows only `jpg/jpeg/png/mp4/mov/avi` — `src/lib/isValidFileType.ts`)
3. `savePostFiles(files)` → Supabase upload
4. Prisma writes `VisualMedia` rows (stores `fileName` only, not the file)

### Rooms already exist
Rooms are `Conversation` rows with `type = 'ROOM'`. Membership + roles live in `ConversationMember`:
- `ConversationMember.role` — string, currently seeded with `owner` / `admin` / `member`.
- Gating precedent: `src/app/api/rooms/[roomId]/invite/route.ts` checks `['owner','admin'].includes(membership.role)` before allowing invites, and `owner`-only for removals.
- Membership lookup: `prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } })`.

### What does NOT exist
- **No `File` model.** `VisualMedia` is hard-scoped to a `postId` (required FK) and to `PHOTO`/`VIDEO` types only. It cannot hold a room-scoped PDF/doc.
- No room-scoped storage, no document type, no per-file permission level.
- "Filing Library" (git `e640016`) is just a **menu link** to a static `family-court-library.html` (public court forms). It is NOT a data model or upload feature — do not confuse it with this.

---

## 2. THE FILE-AREA DATA MODEL (Prisma scaffold sketch — DO NOT MIGRATE YET)

Net-new `RoomFile` model. Scoped to the room (`conversationId`), the uploader, and a per-file access level. This is a sketch — dev finalizes names + indexes before `prisma migrate`.

```prisma
// SCAFFOLD SKETCH — not a migration. Room-scoped shared file.
model RoomFile {
  id             Int          @id @default(autoincrement())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  conversationId Int          // THE room scope — every query filters on this
  uploader       User         @relation(fields: [uploaderId], references: [id], onDelete: SetNull)
  uploaderId     String?

  // Storage pointer (mirror the VisualMedia pattern: DB stores the key, not the bytes)
  storageKey     String       // e.g. "room-123/1720000000-uuid.pdf" — path inside the bucket
  fileName       String       // original display name, e.g. "Motion_to_Dismiss.pdf"
  mimeType       String       // "application/pdf", "image/png", ...
  sizeBytes      Int

  // Case Builder categorization (drives filtering in the UI)
  category       String       @default("DOCUMENT") // DOCUMENT | EVIDENCE | ASSET | OTHER

  // Per-file permission GATE — the minimum room role required to VIEW/DOWNLOAD.
  // Ties to the sibling role model. Uploader + Owner/Admin always see it.
  minRole        String       @default("MEMBER")   // OWNER | ADMIN | BUILDER | MEMBER | GUEST

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([conversationId])
  @@index([conversationId, category])
  @@schema("commsunity")
}
```

Back-relations to add (sketch):
```prisma
// on model Conversation:
roomFiles   RoomFile[]
// on model User:
uploadedFiles RoomFile[]
```

**Model in 3 lines:**
1. `RoomFile` = one shared file pinned to a room (`conversationId`), pointing at a storage key — never the bytes in the DB.
2. It carries `uploaderId`, `category` (DOCUMENT/EVIDENCE/ASSET/OTHER), and `minRole` (the minimum room role allowed to see/download it).
3. Every read/write query is filtered by `conversationId` first, then the caller's `ConversationMember.role` is checked against `minRole`.

---

## 3. THE FLOW (upload / list / download / delete)

New route group: `src/app/api/rooms/[roomId]/files/` (mirrors the existing `invite/route.ts` gating pattern).

### Shared gate helper (build this first — sketch)
```ts
// src/lib/rooms/getRoomMembership.ts  (SKETCH)
// Returns the caller's ConversationMember row or null. Reuse everywhere.
export async function getRoomMembership(conversationId: number, userId: string) {
  return prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
}
// src/lib/rooms/roleRank.ts (SKETCH) — numeric rank so minRole compares cleanly
export const ROLE_RANK = { GUEST: 0, MEMBER: 1, BUILDER: 2, ADMIN: 3, OWNER: 4 };
export const canSee = (myRole: string, minRole: string) =>
  (ROLE_RANK[myRole?.toUpperCase()] ?? -1) >= (ROLE_RANK[minRole] ?? 99);
```

### Upload — `POST /api/rooms/:roomId/files`
1. `getServerUser()` → 401 if none.
2. `getRoomMembership(roomId, user.id)` → **403 if not a member** (non-members can never touch a room's files).
3. Role check: caller role must be ≥ BUILDER to upload (Guest/Member = read-only by default; dev confirms with role model).
4. `request.formData()`, pull the `file` Blob + `category` + `minRole`.
5. Validate: extend `isValidFileType` to a **new allowlist for documents** (`pdf, docx, doc, txt, jpg, png, ...`) — the current one blocks PDFs. Enforce a size cap (e.g. 25MB) from `file.size`.
6. Upload to a **room-namespaced key**: `room-${roomId}/${Date.now()}-${uuid()}.${ext}` via a new `uploadObject` variant that targets the **private files bucket** (§4).
7. `prisma.roomFile.create({ data: { conversationId: roomId, uploaderId: user.id, storageKey, fileName, mimeType, sizeBytes, category, minRole } })`.
8. Return the created row (never the raw public URL).

### List — `GET /api/rooms/:roomId/files`
1. Auth + membership gate (403 if not a member).
2. `prisma.roomFile.findMany({ where: { conversationId: roomId }, orderBy: { createdAt: 'desc' } })`.
3. **Filter in app code** by `canSee(myRole, file.minRole)` (or push into the `where` with an `IN` list of allowed `minRole`s). Uploader always sees their own.
4. Return metadata only (id, fileName, category, mimeType, sizeBytes, uploader, createdAt). No URLs yet — URLs are minted per-download.

### Download — `GET /api/rooms/:roomId/files/:fileId`
1. Auth + membership + `canSee` check on that specific row → 403 otherwise.
2. Mint a **short-lived signed URL** from Supabase: `supabase.storage.from(FILES_BUCKET).createSignedUrl(storageKey, 60)`.
3. Redirect (302) to the signed URL, or return `{ url }`. **Never** hand out a permanent public URL.

### Delete — `DELETE /api/rooms/:roomId/files/:fileId`
1. Auth + membership.
2. Allowed if caller is the **uploader** OR role ≥ ADMIN (owner/admin can moderate any room file).
3. `deleteObject(storageKey)` (from the files bucket) then `prisma.roomFile.delete(...)`. Do storage-first, then DB (mirror `serverWritePost` delete ordering) so you don't orphan a DB row pointing at live bytes.

---

## 4. STORAGE DECISION

**Decision: NET-NEW private bucket, reuse the Supabase plumbing — do NOT reuse the `hq-posts` public bucket.**

Reasoning (this is the load-bearing call):
- `hq-posts` is **public** (`fileNameToUrl` → `/object/public/...`). Case documents and evidence are sensitive/PII. Putting them in a public bucket = anyone with the URL reads them = **automatic FAIL** on the permission gate. Do not do it.
- Create a **private** bucket, e.g. `room-files`. Serve every download via `createSignedUrl` (short TTL) after the role gate passes. This keeps the permission check authoritative on the server.
- **Reuse the existing wiring:** `s3Client.ts` (Supabase client + service role key) and the `uploadObject`/`deleteObject` shape. Add a bucket param or a second `FILES_BUCKET = 'room-files'` const rather than hardcoding `hq-posts`. Railway/Netlify env already carries `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — no new provider, no UploadThing, no AWS.
- Keep the DB-stores-the-key pattern from `VisualMedia` (store `storageKey`, never bytes).

**Reuse verdict:** The Munia media pipeline is **extended, not replaced** — same Supabase Storage backend and upload/delete helpers — but it is a **net-new model and route group**. `VisualMedia` (post-scoped, public, image/video only) is the wrong container; `RoomFile` (room-scoped, private, any doc type) is new. Roughly: ~70% reuse of storage plumbing, 100% net-new data model + API + permission layer.

---

## 5. FOR DEVELOPERS — BUILD THESE NEXT (checklist)

1. **`RoomFile` Prisma model** — finalize the §2 sketch, add back-relations on `Conversation` + `User`, run `prisma migrate dev` (multiSchema — keep `@@schema("commsunity")`).
2. **Private `room-files` bucket + storage helpers** — create the bucket in Supabase; parameterize `uploadObject`/`deleteObject` to accept a bucket; add `createSignedSrc` helper (`createSignedUrl`, 60s). Do NOT touch `hq-posts`.
3. **Document file-type allowlist + size cap** — new `isValidRoomFileType()` (add `pdf/docx/doc/txt/xlsx/csv`), enforce max bytes. Current `isValidFileType` blocks PDFs — do not reuse it as-is.
4. **Route group `src/app/api/rooms/[roomId]/files/`** — `route.ts` (POST upload + GET list) and `[fileId]/route.ts` (GET signed-download + DELETE), each gated with `getRoomMembership` + `canSee` (copy the `invite/route.ts` 403 pattern).
5. **Role gate helpers** — `getRoomMembership.ts` + `roleRank.ts` (`ROLE_RANK` / `canSee`), aligned with the sibling Owner/Admin/Builder/Member/Guest model. Enforce: Guest = read gated files only, Member = read, Builder+ = upload, Admin/Owner + uploader = delete.

### FOR REVIEWERS (do not skip)
- **Action→Reaction:** every upload/delete must produce a receipt (return the row / success) AND ideally an `Activity` log entry so the room sees "X added a file." A silent upload = FAIL.
- **The public-bucket trap:** confirm no download path ever returns an `/object/public/` URL for room files.
- **Scope leak:** confirm every query filters on `conversationId` AND re-checks membership server-side — never trust a `roomId` from the client without the membership lookup.
