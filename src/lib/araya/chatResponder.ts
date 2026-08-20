import prisma from '@/lib/prisma/prisma';

const ARAYA_CHAT_URL =
  process.env.ARAYA_CHAT_URL ||
  'https://conciousnessrevolution.io/.netlify/functions/araya-chat';
const ARAYA_USERNAME = 'araya';

/**
 * Chat-room counterpart to maybeRespondAsAraya (which handles the social feed).
 * When a room/DM message mentions ARAYA, call her chat endpoint and post the reply
 * as the seeded `araya` user. Runs fire-and-forget from the messages POST route —
 * it must never block or throw into the human's send.
 *
 * Loop-safe: ARAYA's own reply is written here via prisma.message.create, NOT through
 * the POST route, so it never re-enters this trigger. The @araya mention-gate is the
 * primary guard; we also skip if the human sender IS araya, belt-and-suspenders.
 */
export async function maybeRespondAsArayaInChat({
  content,
  conversationId,
  senderId,
}: {
  content: string;
  conversationId: number;
  senderId: string;
}) {
  const mentionsAraya =
    content.toLowerCase().includes('@araya') ||
    content.toLowerCase().includes('araya,') ||
    content.toLowerCase().includes('araya?') ||
    content.toLowerCase().includes('araya!') ||
    content.toLowerCase().startsWith('araya');

  if (!mentionsAraya) return;

  const arayaUser = await prisma.user.findUnique({
    where: { username: ARAYA_USERNAME },
  });
  if (!arayaUser) {
    console.error('[ARAYA] No araya user found in database');
    return;
  }
  if (senderId === arayaUser.id) return; // never answer herself

  try {
    // Make sure ARAYA is a member of this conversation so the room renders her
    // sender join and read-side stays correct (idempotent).
    await prisma.conversationMember.upsert({
      where: {
        conversationId_userId: { conversationId, userId: arayaUser.id },
      },
      create: { conversationId, userId: arayaUser.id, role: 'member' },
      update: {},
    });

    const response = await fetch(ARAYA_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        mode: 'chat',
        context: 'community-platform-chat',
      }),
    });

    if (!response.ok) {
      console.error('[ARAYA] Chat API returned', response.status);
      return;
    }

    const data = await response.json();
    const arayaReply =
      data.response || data.message || data.reply || 'I hear you. Let me think on that.';

    await prisma.message.create({
      data: {
        content: arayaReply,
        conversationId,
        senderId: arayaUser.id,
      },
    });

    // Surface the conversation (mirrors the human send path).
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    console.log(`[ARAYA] Responded in conversation ${conversationId}`);
  } catch (err) {
    console.error('[ARAYA] Failed to respond in chat:', err);
  }
}
