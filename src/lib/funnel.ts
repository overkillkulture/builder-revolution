import prisma from '@/lib/prisma/prisma';

// WO-gate-funnel-tracking (S487): server-side funnel writes. The funnel exists
// because the gate once blocked 25/29 arrivals for a month and nobody could
// see it (S485). Rules: server-side only, fire-and-forget — instrumentation
// must NEVER break or slow the thing it measures.
//
// Steps (a user's path through the gate):
//   1 gate_view      — rendered the /login door (signed out)
//   2 guest_enter    — quick-entry created a guest and they're in
//   6 auth_error     — an OAuth attempt bounced back to /login?error=
//   7 auth_complete  — a sign-in finished (props.provider says which door)
//   8 first_message  — the user's first message ever = the funnel's finish line
export const FUNNEL_STEP: Record<string, number> = {
  gate_view: 1,
  guest_enter: 2,
  auth_error: 6,
  auth_complete: 7,
  first_message: 8,
};

// In-app browsers (Facebook/Instagram/TikTok/Discord/Line webviews) hard-fail
// Google OAuth with disallowed_useragent — and invite links get shared through
// exactly these apps. Detect so the door can steer people to quick-entry.
export function isWebviewUA(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|Bytedance|Discord/i.test(ua);
}

export async function logFunnel(
  event: keyof typeof FUNNEL_STEP | string,
  opts: {
    userKey?: string | null;
    userId?: string | null;
    props?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await prisma.funnelEvent.create({
      data: {
        event,
        step: FUNNEL_STEP[event] ?? null,
        userKey: opts.userKey ?? null,
        userId: opts.userId ?? null,
        props: (opts.props as object) ?? undefined,
      },
    });
  } catch {
    // Swallow everything: a missing table (pre-migration), a DB blip, bad
    // props — none of it may break login, posting, or page render.
  }
}
