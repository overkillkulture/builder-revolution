import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { NextResponse } from 'next/server';

// GET /api/channels — public team channels (type=CHANNEL) that have messages.
// Unlike /api/rooms and /api/conversations, this is NOT membership-filtered:
// channels are the public town square, discoverable by everyone. Membership is
// created lazily when a user opens or posts to a channel (see the messages
// route auto-join). This is what makes the real team room visible (MC-26) —
// previously the populated channels had 0 members so nobody could see them.
//
// S446 grand-opening CURATION: the town square accreted noise (automation
// firehoses + abandoned 1-message experiments) so /main read as "a broken
// chat." Two filters now keep it intentional:
//  - SYSTEM_CHANNELS: automation-only channels (e.g. the #alerts bug-bot/email
//    firehose) are hidden from the human town square (they still exist + receive).
//  - ACTIVE only: a channel shows if it has real traction (>= MIN_MESSAGES) OR
//    recent activity (<= ACTIVE_DAYS). Sparse/abandoned channels drop off until
//    they're used again. Tune the constants; don't hardcode a channel allowlist.
const SYSTEM_CHANNELS = new Set(['alerts']);
const MIN_MESSAGES = 3;
const ACTIVE_DAYS = 14;

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

  const activeCutoff = Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000;

  const result = channels
    .filter((ch) => !SYSTEM_CHANNELS.has((ch.name || '').toLowerCase()))
    .filter((ch) => {
      const last = ch.messages[0];
      const recent = last ? new Date(last.createdAt).getTime() >= activeCutoff : false;
      return ch._count.messages >= MIN_MESSAGES || recent;
    })
    .map((ch) => {
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
