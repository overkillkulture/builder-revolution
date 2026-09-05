import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import {
  maybeRespondAsArayaInChat,
  maybeWelcomeFirstTimePoster,
} from '@/lib/araya/chatResponder';
import { NextResponse } from 'next/server';

// Return the user's membership for a conversation, lazily creating it for public
// CHANNELs (the town square) so anyone can read/post. DMs, GROUPs and private
// ROOMs stay strictly gated — no auto-join. Returns null if access is denied.
async function ensureMemberOrGate(conversationId: number, userId: string) {
  const existing = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  // S447: a PENDING member (invited but not yet accepted) has no access — they
  // can neither read nor be messaged in the room until they accept. Treat pending
  // as "not a member" so the caller returns 403.
  if (existing) return existing.status === 'pending' ? null : existing;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true },
  });
  if (conversation?.type !== 'CHANNEL') return null;

  // Idempotent join (handles the race where two requests join at once).
  return prisma.conversationMember.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    create: { conversationId, userId, role: 'member' },
    update: {},
  });
}

// GET /api/conversations/:id/messages — get messages for a conversation
export async function GET(
  request: Request,
  { params }: { params: { conversationId: string } },
) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const conversationId = parseInt(params.conversationId);
  if (Number.isNaN(conversationId)) return NextResponse.json([], { status: 400 });

  // Verify membership — or lazily join a public CHANNEL (MC-26).
  const membership = await ensureMemberOrGate(conversationId, user.id);
  if (!membership) return NextResponse.json([], { status: 403 });

  const { searchParams } = new URL(request.url);
  // Clamp: NaN take -> Prisma 500; huge limit -> DoS (S446).
  const rawLimit = parseInt(searchParams.get('limit') || '50');
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
  const rawCursor = parseInt(searchParams.get('cursor') || '0');
  const cursor = Number.isFinite(rawCursor) ? rawCursor : 0;

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      sender: {
        select: { id: true, name: true, username: true, profilePhoto: true },
      },
    },
  });

  // Mark as read
  await prisma.conversationMember.update({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json(messages.reverse());
}

// POST /api/conversations/:id/messages — send a message
export async function POST(
  request: Request,
  { params }: { params: { conversationId: string } },
) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({}, { status: 401 });

  const conversationId = parseInt(params.conversationId);
  if (Number.isNaN(conversationId)) return NextResponse.json({}, { status: 400 });
  const body = await request.json();
  const { content } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
  }
  if (content.trim().length > 4000) {
    return NextResponse.json({ error: 'Message too long (max 4000 chars)' }, { status: 400 });
  }

  // Verify membership — or lazily join a public CHANNEL (MC-26).
  const membership = await ensureMemberOrGate(conversationId, user.id);
  if (!membership) return NextResponse.json({}, { status: 403 });

  const message = await prisma.message.create({
    data: {
      content: content.trim(),
      conversationId,
      senderId: user.id,
    },
    include: {
      sender: {
        select: { id: true, name: true, username: true, profilePhoto: true },
      },
    },
  });

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Mark as read for sender
  await prisma.conversationMember.update({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
    data: { lastReadAt: new Date() },
  });

  // If the message @mentions ARAYA, let her reply (fire-and-forget — never blocks
  // or fails the human's send). Poll-based clients pick up her reply within ~3s.
  maybeRespondAsArayaInChat({
    content: content.trim(),
    conversationId,
    senderId: user.id,
  }).catch(() => {});

  // If this is the sender's FIRST post in the town-square channel, ARAYA welcomes
  // them once (fire-and-forget; rate-limited to exactly one welcome per user).
  maybeWelcomeFirstTimePoster({
    conversationId,
    senderId: user.id,
    messageId: message.id,
    content: content.trim(),
  }).catch(() => {});

  return NextResponse.json(message);
}
