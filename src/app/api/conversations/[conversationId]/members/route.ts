import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { NextResponse } from 'next/server';

// GET /api/conversations/:id/members — the roster for the Members column of the
// 3-column chat (WO-view-03-chat-redo Phase 2). Uniform across CHANNEL / ROOM /
// DM since all three are Conversations with ConversationMember rows.
//
// Access mirrors the messages route: a public CHANNEL (the town square) is
// readable by anyone signed in; a private ROOM / GROUP / DM requires the caller
// to already be an ACTIVE member (pending invitees and non-members get 403) —
// so this never leaks a private room's roster.
//
// "active" here is a REAL signal (ConversationMember.lastReadAt within
// ACTIVE_WINDOW), not a faked presence dot — honest gauge, per doctrine.
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const ROLE_RANK: Record<string, number> = { owner: 0, admin: 1, moderator: 2, member: 3 };

export async function GET(
  _request: Request,
  { params }: { params: { conversationId: string } },
) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const conversationId = parseInt(params.conversationId, 10);
  if (Number.isNaN(conversationId)) return NextResponse.json([], { status: 400 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true },
  });
  if (!conversation) return NextResponse.json([], { status: 404 });

  // Gate everything except public channels to actual active members.
  if (conversation.type !== 'CHANNEL') {
    const me = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      select: { status: true },
    });
    if (!me || me.status === 'pending') return NextResponse.json([], { status: 403 });
  }

  const members = await prisma.conversationMember.findMany({
    where: { conversationId, status: 'active' },
    take: 200,
    include: {
      user: { select: { id: true, name: true, username: true, profilePhoto: true } },
    },
  });

  const now = Date.now();
  const result = members
    .map((m) => ({
      id: m.user.id,
      name: m.user.name || m.user.username || 'Builder',
      username: m.user.username || '',
      profilePhoto: m.user.profilePhoto,
      role: m.role,
      active: now - new Date(m.lastReadAt).getTime() <= ACTIVE_WINDOW_MS,
    }))
    // active first, then by role rank, then by name — the Discord roster order.
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      const ra = ROLE_RANK[a.role] ?? 3;
      const rb = ROLE_RANK[b.role] ?? 3;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });

  return NextResponse.json(result);
}
