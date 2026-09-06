import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';

import { auth } from '@/auth';
import { isWebviewUA, logFunnel } from '@/lib/funnel';

import { UserAuthForm } from '../UserAuthForm';
import { SupabaseBridge } from '../SupabaseBridge';
import { InviteOnlyBanner } from './InviteOnlyBanner';

const instanceName = process.env.INSTANCE_NAME || 'Builder Revolution Chat';
const isHQ = process.env.INVITE_ONLY === 'true';

export const metadata = {
  title: isHQ ? 'Builder Revolution Chat — Join' : `${instanceName} — Join`,
};

export default async function Page({
  searchParams,
}: {
  searchParams?: { from?: string; error?: string };
}) {
  // S437 (Commander: "makes me sign in every single time"): an already-signed-in
  // user landing on /login (every main-site door routes through here) goes
  // straight to their destination instead of seeing the form again.
  const session = await auth();
  if (session?.user) {
    const from = searchParams?.from;
    // Only same-origin absolute paths. `startsWith('/')` alone also matches
    // `//evil.com` and `/\evil.com`, which browsers resolve as EXTERNAL URLs
    // (open-redirect / phishing pivot off our domain). Reject those (S446).
    const safe = !!from && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/\\');
    redirect(safe ? from! : '/feed');
  }

  // WO-gate-funnel-tracking (S487): the door renders = step 1. An OAuth attempt
  // that died lands back here with ?error= — that's the invisible-break signal
  // the S485 lobby bug hid for a month. Both awaited (fast insert), both
  // swallow failures inside logFunnel.
  const ua = headers().get('user-agent');
  const webview = isWebviewUA(ua);
  const userKey = cookies().get('fk')?.value ?? null;
  await logFunnel('gate_view', {
    userKey,
    props: { from: searchParams?.from ?? null, webview, ua: ua?.slice(0, 160) ?? null },
  });
  if (searchParams?.error) {
    await logFunnel('auth_error', { userKey, props: { code: searchParams.error, webview } });
  }

  return page(webview);
}

function page(webview = false) {
  return (
    <>
      {/* Logo / Brand */}
      <div className="mb-6 text-center">
        {isHQ ? (
          <div className="mb-1 text-4xl font-bold text-primary">
            Builder Revolution<span className="text-foreground/40 text-2xl ml-1">Chat</span>
          </div>
        ) : (
          <div className="mb-1 text-4xl font-bold text-primary">
            {instanceName}
          </div>
        )}
        <p className="text-[0.6rem] tracking-[0.2em] text-muted-foreground/40">
          {isHQ ? 'THE MAIN CHAT — BUILD GUILD · CASE BUILDER · BUILDER REVOLUTION' : 'BUILDER REVOLUTION CHAT'}
        </p>
      </div>

      {/* What is this */}
      <div className="mb-6 rounded-lg border border-primary/15 bg-card p-4 text-center">
        <p className="text-sm leading-relaxed text-card-foreground">
          {isHQ
            ? 'The main chat of the Builder Revolution. Rooms for builders, case fighters, and everyone in between — say what you\'re building, claim a work order, ship it, and post the evidence back to the room.'
            : 'The developer hall of the Builder Revolution. Say what you\'re building, claim a work order, ship it, and post the evidence back to the room.'}
        </p>
      </div>

      {/* Tools */}
      <div className="mb-6 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
        {isHQ ? (
          <>
            <span className="rounded-full border border-primary/20 px-2.5 py-1 text-primary">AI Case Analysis</span>
            <span className="rounded-full border border-emerald-400/20 px-2.5 py-1 text-emerald-400">Pattern Library</span>
            <span className="rounded-full border border-purple-400/20 px-2.5 py-1 text-purple-400">Video Rooms</span>
            <span className="rounded-full border border-orange-400/20 px-2.5 py-1 text-orange-400">Open Source</span>
          </>
        ) : (
          <>
            <span className="rounded-full border border-primary/20 px-2.5 py-1 text-primary">Rooms</span>
            <span className="rounded-full border border-purple-400/20 px-2.5 py-1 text-purple-400">Direct Messages</span>
            <span className="rounded-full border border-emerald-400/20 px-2.5 py-1 text-emerald-400">Video Rooms</span>
            <span className="rounded-full border border-foreground/20 px-2.5 py-1">Open Source</span>
          </>
        )}
      </div>

      {/* In-app browsers (FB/IG/TikTok/Discord) hard-block Google OAuth with
          disallowed_useragent — and shared invite links open in exactly these.
          Warn + steer to quick-entry instead of letting them hit a doomed button. */}
      {webview && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-center text-xs leading-relaxed text-card-foreground">
          You&apos;re inside an app&apos;s built-in browser, where Google sign-in is blocked.
          Just type a name below to jump in — or tap the ⋯ menu and choose{' '}
          <span className="font-semibold">Open in browser</span> to use Google/GitHub.
        </div>
      )}

      <InviteOnlyBanner />
      <SupabaseBridge />
      <UserAuthForm mode="login" />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        By joining you agree to our{' '}
        <a href="/terms" className="text-primary hover:underline" target="_blank">
          Terms
        </a>
      </p>
      {isHQ && (
        <p className="mt-3 text-center text-xs text-muted-foreground/60">
          <a
            href="https://github.com/overkillkulture/comms-unity"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/80 hover:text-primary hover:underline"
          >
            Fork it on GitHub
          </a>
          {' · '}
          Free and open source
        </p>
      )}
    </>
  );
}
