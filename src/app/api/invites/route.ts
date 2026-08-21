import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { NextResponse } from 'next/server';

// GET /api/invites — S447 membership consent. Lists the current user's PENDING
// invites (groups/rooms they were added to but haven't accepted). The invitee
// accepts/declines each via POST /api/conversations/:id/respond.
export async function GET() {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const pending = await prisma.conversationMember.findMany({
    where: { userId: user.id, status: 'pending' },
    include: {
      conversation: {
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          createdById: true,
          members: {
            where: { status: 'active' },
            select: {
              user: { select: { id: true, name: true, username: true, profilePhoto: true } },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const result = pending.map((m) => ({
    conversationId: m.conversationId,
    type: m.conversation.type,
    name: m.conversation.name || 'Unnamed',
    description: m.conversation.description,
    invitedAt: m.joinedAt,
    // who's already in it (active members) so the invitee knows what they're joining
    members: m.conversation.members.map((am) => am.user),
  }));

  return NextResponse.json(result);
}
