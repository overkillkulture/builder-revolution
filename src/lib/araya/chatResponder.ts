import prisma from '@/lib/prisma/prisma';

const ARAYA_CHAT_URL =
  process.env.ARAYA_CHAT_URL ||
  'https://conciousnessrevolution.io/.netlify/functions/araya-chat';
const ARAYA_USERNAME = 'araya';

// Automation-only channels are never a "town square" — mirror /api/channels so
// ARAYA welcomes people in the exact same room the UI pins as home. Keep this in
// sync with SYSTEM_CHANNELS in src/app/api/channels/route.ts.
const SYSTEM_CHANNELS = new Set(['alerts']);

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

/**
 * Resolve the ONE town-square channel = the busiest human CHANNEL (most messages,
 * tie-break oldest = lowest id), excluding automation-only SYSTEM_CHANNELS. This
 * mirrors the `isTownSquare` pin computed in src/app/api/channels/route.ts so
 * ARAYA welcomes people in the exact room the UI treats as home. `isTownSquare`
 * is a computed field, not a DB column, so it is recomputed here rather than read.
 */
async function resolveTownSquareId(): Promise<number | null> {
  const channels = await prisma.conversation.findMany({
    where: { type: 'CHANNEL' },
    select: { id: true, name: true, _count: { select: { messages: true } } },
  });
  const human = channels.filter(
    (c) => !SYSTEM_CHANNELS.has((c.name || '').toLowerCase()),
  );
  if (!human.length) return null;
  human.sort((a, b) => b._count.messages - a._count.messages || a.id - b.id);
  return human[0].id;
}

/**
 * Output-safety guard for ARAYA's endpoint reply BEFORE it is auto-posted to a
 * public room. Two reasons this is not optional: (1) the reply comes from an LLM
 * that is only *prompted* to behave, not guaranteed; (2) the newcomer's first
 * message is interpolated into that prompt, so a hostile first post could try to
 * steer the reply (prompt injection) — and whatever comes back is published as
 * ARAYA to real strangers. A reply is accepted only if it self-identifies as the
 * AI AND makes no money/outcome promise; otherwise we drop to the honest template.
 */
function isSafeWelcome(text: string): boolean {
  const t = text.toLowerCase();
  const selfLabels = /\baraya\b|\bai\b|house ai|assistant|\bbot\b/.test(t);
  const promises =
    /\bguarantee\b|\bpromise\b|get rich|passive income|double your|\bprofit\b|\breturns?\b|make (you )?\$|\$\s?\d|will (make|earn) you|risk-?free|financial freedom/.test(
      t,
    );
  return selfLabels && !promises;
}

/**
 * Craft ARAYA's welcome line. Tries her live chat endpoint for a specific,
 * non-canned reply; falls back to a personalized template if the endpoint is
 * slow/down. Either way the text self-identifies as the house AI (honesty law),
 * asks exactly ONE question, and points at one real thing (this room / builders).
 * Never makes money or outcome promises.
 */
async function composeWelcome(displayName: string, firstMessage: string): Promise<string> {
  const fallback =
    `Hey ${displayName} — ARAYA here, the house AI that keeps this room warm. ` +
    `Real builders read this channel, so you're not shouting into the void. ` +
    `What are you building or working toward right now? Drop a line and someone will pick it up.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const prompt =
      `A new person just posted their FIRST message in the community town-square chat. ` +
      `Their name is "${displayName}" and they wrote: "${firstMessage}". ` +
      `Write ONE short, warm, specific welcome (2 sentences max) as ARAYA, the house AI. ` +
      `Identify yourself as the house AI, greet them by name, ask exactly ONE question about ` +
      `what they're building or need, and invite them to reply here. No money or outcome promises, no emojis-only fluff.`;

    const response = await fetch(ARAYA_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, mode: 'chat', context: 'community-chat-welcome' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return fallback;
    const data = await response.json();
    const reply: string | undefined = data.response || data.message || data.reply;
    const cleaned = (reply || '').trim();
    // Guard against an empty/garbage/off-brand endpoint reply — the fallback is
    // always honest. Must be substantive AND pass the output-safety guard (self-
    // labels as AI, no money/outcome promise) before it can be posted publicly.
    return cleaned.length >= 20 && isSafeWelcome(cleaned) ? cleaned : fallback;
  } catch {
    return fallback;
  }
}

/**
 * FIRST-TIME-POSTER WELCOME (living loop, organ 1 of WO-araya-room-presence).
 *
 * When a user posts for the first time in the town-square CHANNEL, ARAYA replies
 * once with a warm, specific welcome. Fire-and-forget from the messages POST route
 * — must never block or throw into the human's send.
 *
 * 5-organ mapping:
 *   trigger   — a new message POSTed to a channel (the POST route calls this)
 *   sensor    — is this the sender's FIRST message in the town square?
 *   actor     — ARAYA posts one welcome as the seeded `araya` user
 *   gate      — town-square only; skip ARAYA's own posts; EXACTLY ONE welcome per
 *               user (race-safe via message id, see below); no floods
 *   writeback — TODO: log the welcomed user to leads (M3 Dispatcher 24h law). No
 *               leads table exists in the `commsunity` schema; deferred (see PR).
 *
 * Rate-limit / once-per-user proof: we count the sender's PRIOR messages in this
 * channel using `id < messageId`. Message ids are monotonic, so if the user fires
 * two messages at once, only the lowest-id one sees 0 priors — exactly one welcome
 * is ever produced, with no lock. A returning user always has priors → no welcome.
 * Loop-safe: ARAYA's welcome is written directly here (never through the POST
 * route) and she is skipped as a sender, so it cannot re-trigger.
 */
export async function maybeWelcomeFirstTimePoster({
  conversationId,
  senderId,
  messageId,
  content,
}: {
  conversationId: number;
  senderId: string;
  messageId: number;
  content: string;
}) {
  try {
    // Gate: welcomes happen only in a public CHANNEL (never DMs/groups/private rooms).
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true },
    });
    if (conversation?.type !== 'CHANNEL') return;

    // Gate: only the ONE town-square channel.
    const townSquareId = await resolveTownSquareId();
    if (townSquareId == null || townSquareId !== conversationId) return;

    const arayaUser = await prisma.user.findUnique({
      where: { username: ARAYA_USERNAME },
      select: { id: true },
    });
    if (!arayaUser) {
      console.error('[ARAYA] No araya user found in database');
      return;
    }
    if (senderId === arayaUser.id) return; // never welcome herself

    // Sensor + rate-limit: is this the sender's first message here? Race-safe.
    const priorCount = await prisma.message.count({
      where: { conversationId, senderId, id: { lt: messageId } },
    });
    if (priorCount > 0) return; // returning poster (or a later same-instant message)

    // Ensure ARAYA is a member so the room renders her sender join (idempotent).
    await prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId, userId: arayaUser.id } },
      create: { conversationId, userId: arayaUser.id, role: 'member' },
      update: {},
    });

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true, username: true },
    });
    const displayName = (sender?.name || sender?.username || 'friend').trim() || 'friend';

    const welcome = await composeWelcome(displayName, content);

    await prisma.message.create({
      data: { content: welcome, conversationId, senderId: arayaUser.id },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // TODO(writeback → leads): the WO's "log every welcome to leads" organ. The
    // commsunity schema has no leads table (leads live in main-platform Supabase),
    // so this is deferred rather than faked — see PR body for the design.
    console.log(
      `[ARAYA] Welcomed first-time poster ${displayName} in town square ${conversationId}`,
    );
  } catch (err) {
    console.error('[ARAYA] Welcome failed:', err);
  }
}
