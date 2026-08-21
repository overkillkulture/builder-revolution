import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { NextResponse } from 'next/server';

// POST /api/conversations/:id/respond — S447 membership consent. The invitee
// accepts or declines a PENDING invite to a group/room. Accept flips their
// membership to active (they can now read/post); decline removes it entirely.
// This is the consent step: nobody is a member of a group/room they didn't accept.
export async function POST(
  request: Request,
  { params }: { params: { conversationId: string } },
) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({}, { status: 401 });

  const conversationId = parseInt(params.conversationId);
  if (Number.isNaN(conversationId)) return NextResponse.json({ error: 'Invalid conversation' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: "action must be 'accept' or 'decline'." }, { status: 400 });
  }

  // Must be an actual pending invite for this user.
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  });
  if (!membership || membership.status !== 'pending') {
    return NextResponse.json({ error: 'No pending invite for this conversation.' }, { status: 404 });
  }

  if (action === 'decline') {
    // deleteMany = idempotent (a double-tap decline is a no-op, not a P2025 500).
    await prisma.conversationMember.deleteMany({
      where: { conversationId, userId: user.id, status: 'pending' },
    });
    return NextResponse.json({ ok: true, status: 'declined' });
  }

  // accept — join for real; start their read cursor now so they don't get a
  // giant unread backlog from before they joined.
  const now = new Date();
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    data: { status: 'active', joinedAt: now, lastReadAt: now },
  });
  return NextResponse.json({ ok: true, status: 'active' });
}
