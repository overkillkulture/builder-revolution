import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { NextResponse } from 'next/server';

// GET /api/bugs — list bug reports. Requires auth: this returns EVERY report
// (reporter identity, page paths, attachment URLs) and was fully public — any
// anonymous visitor could dump the whole bug DB (S446). Ops reads via the DB
// directly (see reference_main-chat-access-recipe), not this endpoint.
export async function GET() {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Sign in to view bug reports.' }, { status: 401 });
  const bugs = await prisma.bugReport.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: {
        select: { id: true, name: true, username: true },
      },
    },
  });
  return NextResponse.json(bugs);
}

// POST /api/bugs — submit a bug report (works for logged in AND anonymous)
export async function POST(request: Request) {
  const [user] = await getServerUser();
  const body = await request.json();
  const { title, description, page, priority, attachmentUrl } = body;

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Title and description required' }, { status: 400 });
  }

  // No dedicated column yet — fold the attachment URL into the description so it
  // persists and shows up in GET /api/bugs (MC-06). Avoids a live schema migration.
  const fullDescription = attachmentUrl
    ? `${description.trim()}\n\n📎 Attachment: ${attachmentUrl}`
    : description.trim();

  const bug = await prisma.bugReport.create({
    data: {
      title: title.trim(),
      description: fullDescription,
      page: page || 'unknown',
      priority: priority || 'MEDIUM',
      reporterId: user?.id || null,
    },
  });

  return NextResponse.json(bug);
}
