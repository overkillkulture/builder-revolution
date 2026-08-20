import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { NextResponse } from 'next/server';

// GET /api/rooms — list rooms the current user belongs to
export async function GET() {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const rooms = await prisma.conversation.findMany({
    where: {
      type: 'ROOM',
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

  const result = rooms.map((room) => {
    const myMembership = room.members.find((m) => m.userId === user.id);
    const lastMessage = room.messages[0] || null;
    const hasUnread = lastMessage && myMembership
      ? lastMessage.createdAt > myMembership.lastReadAt
      : false;

    return {
      id: room.id,
      name: room.name || 'Unnamed Room',
      description: room.description,
      type: room.type,
      members: room.members.map((m) => ({
        ...m.user,
        role: m.role,
      })),
      memberCount: room.members.length,
      myRole: myMembership?.role || 'member',
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            senderName: lastMessage.sender.name,
            createdAt: lastMessage.createdAt,
          }
        : null,
      hasUnread,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  });

  return NextResponse.json(result);
}

// POST /api/rooms — create a new private room
export async function POST(request: Request) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({}, { status: 401 });

  const body = await request.json();
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
  }

  // Dedupe + keep only real users (client-supplied ids were trusted verbatim, so
  // a duplicate or non-existent id caused an unhandled 500). Cap at 50 (S446).
  const rawIds: unknown = body.memberIds;
  const memberIds = Array.isArray(rawIds) ? rawIds.filter((x): x is string => typeof x === 'string') : [];
  const uniqueIds = Array.from(new Set([user.id, ...memberIds])).slice(0, 50);
  const realUsers = await prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true } });

  try {
    const room = await prisma.conversation.create({
      data: {
        name: name.trim().slice(0, 100),
        description: typeof description === 'string' ? description.trim().slice(0, 500) || null : null,
        type: 'ROOM',
        createdById: user.id,
        members: {
          create: realUsers.map((u) => ({
            userId: u.id,
            role: u.id === user.id ? 'owner' : 'member',
          })),
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
      },
    });

    return NextResponse.json({
      id: room.id,
      name: room.name,
      description: room.description,
      members: room.members.map((m) => ({
        ...m.user,
        role: m.role,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: 'Could not create room' }, { status: 500 });
  }
}
