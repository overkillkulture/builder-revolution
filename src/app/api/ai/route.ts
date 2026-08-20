import { getServerUser } from '@/lib/getServerUser';
import { NextResponse } from 'next/server';

/**
 * AI ENDPOINT — BYOK (Bring Your Own Key) Architecture
 *
 * Default: Routes to ARAYA (Consciousness Revolution AI)
 * Forks: Set AI_ENDPOINT env var to point to your own AI
 * BYOK: Users can pass their own API key in x-ai-key header
 *
 * POST /api/ai
 * Body: { message, context?, system?, conversationId? }
 * Returns: { reply, model }
 */

const DEFAULT_ENDPOINT = process.env.ARAYA_CHAT_URL || 'https://conciousnessrevolution.io/.netlify/functions/araya-chat';
const CUSTOM_ENDPOINT = process.env.AI_ENDPOINT; // Forks set this

export async function POST(request: Request) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { message, context, system, conversationId } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // Determine which endpoint to use.
  // SECURITY (S446): the endpoint is SERVER config only (AI_ENDPOINT env for
  // forks, else default ARAYA). A per-request `x-ai-endpoint` header was an SSRF
  // hole — any authenticated caller could make the server POST to an arbitrary
  // URL (cloud metadata, localhost/mesh, internal services) and read the reply.
  // BYOK stays supported via the `x-ai-key` header (the user's KEY, not URL).
  const byokKey = request.headers.get('x-ai-key');
  const endpoint = CUSTOM_ENDPOINT || DEFAULT_ENDPOINT;

  try {
    // Build the system prompt
    const systemPrompt = system || `You are ARAYA, an AI assistant in the Builder Revolution Chat. You help builders analyze cases, find patterns, draft documents, and organize evidence. You're direct, helpful, and never pretend to be a lawyer. When users share case data, help them organize it, find patterns, and figure out next steps.

Current user: ${user.name || 'Unknown'}
${context ? `\nContext:\n${context}` : ''}
${conversationId ? `\nRoom ID: ${conversationId}` : ''}`;

    // Call the AI endpoint
    const aiHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // If BYOK, pass the key
    if (byokKey) {
      aiHeaders['x-api-key'] = byokKey;
      aiHeaders['Authorization'] = `Bearer ${byokKey}`;
    }

    const aiRes = await fetch(endpoint, {
      method: 'POST',
      headers: aiHeaders,
      body: JSON.stringify({
        message: message.trim(),
        system: systemPrompt,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => 'Unknown error');
      return NextResponse.json({
        reply: `AI request failed (${aiRes.status}). ${endpoint === DEFAULT_ENDPOINT ? 'ARAYA may be temporarily unavailable.' : 'Check your AI endpoint configuration.'}`,
        error: true,
        model: 'error',
      });
    }

    const aiData = await aiRes.json();
    const reply = aiData.reply || aiData.response || aiData.content || aiData.text ||
                  (aiData.choices?.[0]?.message?.content) || 'No response from AI';

    return NextResponse.json({
      reply,
      model: aiData.model || 'araya',
    });
  } catch (err) {
    return NextResponse.json({
      reply: 'AI connection failed. The endpoint may be down or misconfigured.',
      error: true,
      model: 'error',
    });
  }
}

// GET /api/ai — show AI configuration (no secrets)
export async function GET() {
  const hasCustomEndpoint = !!CUSTOM_ENDPOINT;
  const hasAraya = !!DEFAULT_ENDPOINT;

  return NextResponse.json({
    provider: hasCustomEndpoint ? 'custom' : 'araya',
    endpoint: hasCustomEndpoint ? '(custom endpoint configured)' : 'ARAYA — Consciousness Revolution AI',
    byok: true, // BYOK is always available
    features: [
      'Chat in any room with @araya or /ai',
      'Bring Your Own Key (BYOK) — use your own API',
      'Case analysis and pattern recognition',
      'Document drafting assistance',
      'Evidence organization',
    ],
    setup_fork: {
      description: 'To use your own AI in a fork:',
      steps: [
        'Set AI_ENDPOINT env var to your AI API URL',
        'Or let users set their own key in Settings',
        'API must accept POST with { message, system, max_tokens }',
        'API must return { reply } or { response } or { content }',
      ],
    },
  });
}
