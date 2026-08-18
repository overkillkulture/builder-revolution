import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { NextResponse } from 'next/server';

// GET /api/channels — public team channels (type=CHANNEL) that have messages.
// Unlike /api/rooms and /api/conversations, this is NOT membership-filtered:
// channels are the public town square, discoverable by everyone. Membership is
// created lazily when a user opens or posts to a channel (see the messages
// route auto-join). This is what makes the real team room visible (MC-26) —
// previously the populated channels had 0 members so nobody could see them.
export async function GET() {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const channels = await prisma.conversation.findMany({
    where: { type: 'CHANNEL', messages: { some: {} } },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: { name: true } } },
      },
      _count: { select: { members: true, messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const result = channels.map((ch) => {
    const last = ch.messages[0] || null;
    return {
      id: ch.id,
      name: ch.name || 'channel',
      description: ch.description,
      type: ch.type,
      memberCount: ch._count.members,
      messageCount: ch._count.messages,
      lastMessage: last
        ? { content: last.content, senderName: last.sender.name, createdAt: last.createdAt }
        : null,
    };
  });

  return NextResponse.json(result);
}
