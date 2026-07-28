-- S383b: multi-tenant communities (Johnny + Rachel, one codebase for both)
-- Purely additive: one new table, one new join table, nullable columns only.
-- Nothing existing is altered or dropped. Safe to run against live production.
BEGIN;

CREATE TABLE commsunity."Community" (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    "brandConfig" JSONB,
    "ownerUserId" TEXT REFERENCES commsunity."User"(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE commsunity."Post" ADD COLUMN "communityId" INTEGER REFERENCES commsunity."Community"(id) ON DELETE SET NULL;
ALTER TABLE commsunity."Post" ADD COLUMN "category" TEXT;

ALTER TABLE commsunity."Conversation" ADD COLUMN "communityId" INTEGER REFERENCES commsunity."Community"(id) ON DELETE SET NULL;

-- Real safety-report path (the "step zero" gate for Johnny's survivor space):
-- distinct from BugReport (that's app bugs, this is content/crisis flags).
CREATE TABLE commsunity."Report" (
    id SERIAL PRIMARY KEY,
    "postId" INTEGER REFERENCES commsunity."Post"(id) ON DELETE CASCADE,
    "commentId" INTEGER REFERENCES commsunity."Comment"(id) ON DELETE CASCADE,
    "reporterId" TEXT REFERENCES commsunity."User"(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

COMMIT;
