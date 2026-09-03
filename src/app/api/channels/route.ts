import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { NextResponse } from 'next/server';

// GET /api/channels — public team channels (type=CHANNEL). Unlike /api/rooms and
// /api/conversations, this is NOT membership-filtered: channels are the public
// town square, discoverable by everyone. Membership is created lazily when a user
// opens or posts to a channel (see the messages route auto-join). This is what
// makes the real team room visible (MC-26) — previously populated channels had 0
// members so nobody could see them.
//
// S446 grand-opening CURATION: the town square accreted noise (automation
// firehoses + abandoned 1-message experiments) so /main read as "a broken
// chat." Two filters keep it intentional:
//  - SYSTEM_CHANNELS: automation-only channels (e.g. the #alerts bug-bot/email
//    firehose) are hidden from the human town square (they still exist + receive).
//  - ACTIVE only: a channel shows if it has real traction (>= MIN_MESSAGES) OR
//    recent activity (<= ACTIVE_DAYS). Sparse/abandoned channels drop off until
//    they're used again. Tune the constants; don't hardcode a channel allowlist.
//
// S482 TOWN-SQUARE PIN (WO-chat-default-view, kills the empty-arrival death
// spiral): exactly ONE channel — the busiest human channel (most messages;
// tie-break oldest = lowest id) — is flagged `isTownSquare` and is ALWAYS
// returned, bypassing the ACTIVE filter. Before this, when the main room went
// quiet the ACTIVE filter HID it, so a newcomer's auto-select found nothing and
// landed on the "pick a channel" empty state (the "five Trello lanes" bug) →
// bounced → room stayed empty. The pin is self-identifying: no hardcoded name or
// env, it self-corrects to whatever the real main room is by traffic.
const SYSTEM_CHANNELS = new Set(['alerts']);
const MIN_MESSAGES = 3;
const ACTIVE_DAYS = 14;

export async function GET() {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json([], { status: 401 });

  // Fetch ALL human channels (including empty ones) so the town square can be
  // pinned even at 0 messages; the ACTIVE filter below still curates the rest.
  const channels = (
    await prisma.conversation.findMany({
      where: { type: 'CHANNEL' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { name: true } } },
        },
        _count: { select: { members: true, messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  ).filter((ch) => !SYSTEM_CHANNELS.has((ch.name || '').toLowerCase()));

  // The pinned town square = busiest human channel (most messages, then oldest).
  const townSquare = channels.length
    ? [...channels].sort(
        (a, b) => b._count.messages - a._count.messages || a.id - b.id,
      )[0]
    : null;

  const activeCutoff = Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000;

  const result = channels
    .filter((ch) => {
      if (townSquare && ch.id === townSquare.id) return true; // always show the home room
      if (ch._count.messages === 0) return false; // (was the where: messages some {})
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
        isTownSquare: townSquare ? ch.id === townSquare.id : false,
        lastMessage: last
          ? { content: last.content, senderName: last.sender.name, createdAt: last.createdAt }
          : null,
      };
    });

  // Home room first so it reads as the place to land.
  result.sort((a, b) => Number(b.isTownSquare) - Number(a.isTownSquare));

  return NextResponse.json(result);
}
