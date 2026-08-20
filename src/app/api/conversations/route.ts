import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { NextResponse } from 'next/server';

// GET /api/conversations — list all conversations for the current user
export async function GET() {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: {
      members: {
        some: { userId: user.id },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, username: true, profilePhoto: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: {
            select: { id: true, name: true, username: true },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Shape the response
  const result = conversations.map((conv) => {
    const otherMembers = conv.members.filter((m) => m.userId !== user.id);
    const myMembership = conv.members.find((m) => m.userId === user.id);
    const lastMessage = conv.messages[0] || null;
    const hasUnread = lastMessage && myMembership
      ? lastMessage.createdAt > myMembership.lastReadAt
      : false;

    return {
      id: conv.id,
      name: conv.name || otherMembers.map((m) => m.user.name).join(', '),
      type: conv.type,
      members: conv.members.map((m) => m.user),
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            senderName: lastMessage.sender.name,
            createdAt: lastMessage.createdAt,
          }
        : null,
      hasUnread,
      updatedAt: conv.updatedAt,
    };
  });

  return NextResponse.json(result);
}

// POST /api/conversations — start a new conversation (DM or group)
export async function POST(request: Request) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({}, { status: 401 });

  const body = await request.json();
  const { targetUserId, name } = body;
  // Whitelist type: it was written verbatim from the client, so a caller could
  // pass 'CHANNEL' (the auto-join public town square) to mint broadcast channels,
  // or any junk string (the column has no enum). Only DM/GROUP here (S446).
  const type: 'DM' | 'GROUP' = body.type === 'GROUP' ? 'GROUP' : 'DM';

  try {
    if (type === 'DM') {
      if (!targetUserId || typeof targetUserId !== 'string') {
        return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
      }
      if (targetUserId === user.id) {
        return NextResponse.json({ error: 'Cannot start a DM with yourself' }, { status: 400 });
      }
      const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
      if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      // Reuse an existing DM between these two users.
      const existing = await prisma.conversation.findFirst({
        where: {
          type: 'DM',
          AND: [
            { members: { some: { userId: user.id } } },
            { members: { some: { userId: targetUserId } } },
          ],
        },
      });
      if (existing) return NextResponse.json({ id: existing.id });

      const conversation = await prisma.conversation.create({
        data: { type: 'DM', members: { create: [{ userId: user.id }, { userId: targetUserId }] } },
      });
      return NextResponse.json({ id: conversation.id });
    }

    // GROUP — dedupe + keep only real users (client-supplied ids were trusted,
    // so a bad/duplicate id caused an unhandled 500). Cap at 50.
    const rawIds: unknown = body.memberIds;
    const memberIds = Array.isArray(rawIds) ? rawIds.filter((x): x is string => typeof x === 'string') : [];
    const uniqueIds = Array.from(new Set([user.id, ...memberIds])).slice(0, 50);
    const realUsers = await prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true } });
    const conversation = await prisma.conversation.create({
      data: {
        name: typeof name === 'string' ? name.slice(0, 100) : null,
        type: 'GROUP',
        members: { create: realUsers.map((u) => ({ userId: u.id })) },
      },
    });
    return NextResponse.json({ id: conversation.id });
  } catch (e) {
    return NextResponse.json({ error: 'Could not create conversation' }, { status: 500 });
  }
}
