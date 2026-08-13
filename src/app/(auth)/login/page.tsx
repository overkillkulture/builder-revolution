import { redirect } from 'next/navigation';

import { auth } from '@/auth';

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
  searchParams?: { from?: string };
}) {
  // S437 (Commander: "makes me sign in every single time"): an already-signed-in
  // user landing on /login (every main-site door routes through here) goes
  // straight to their destination instead of seeing the form again.
  const session = await auth();
  if (session?.user) {
    const from = searchParams?.from;
    redirect(from && from.startsWith('/') ? from : '/feed');
  }
  return page();
}

function page() {
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
