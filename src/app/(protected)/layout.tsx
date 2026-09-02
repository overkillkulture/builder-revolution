import { MenuBar } from '@/components/MenuBar';
import { MobileHeader } from '@/components/MobileHeader';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useCheckIfRequiredFieldsArePopulated } from '@/hooks/useCheckIfRequiredFieldsArePopulated';
import { getServerUser } from '@/lib/getServerUser';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function Layout({ children }: { children: React.ReactNode }) {
  // S447 moderation spine — the loop-free enforcement point. `status` rides in
  // the session (stamped by the Node-only jwt callback), so this is a zero-query
  // check. A banned user is sent to /api/session/kick, which CLEARS the session
  // cookie and lands them on the public /removed page — never /login, so the
  // edge middleware (which still trusts the raw JWT) can't bounce them into a
  // loop. Once the cookie is cleared, every later page + API request is
  // logged-out too, so access is genuinely revoked. The child page renders with
  // a valid user object (no crash); this redirect wins the response.
  const [user] = await getServerUser();
  if (user?.status === 'banned') redirect('/api/session/kick');

  // S477 2-rung gate — passwordless quick-entry guests can watch, but must verify
  // (Google/GitHub, one click) to enter the rooms. Same loop-free pattern as the
  // ban check above: send them to the PUBLIC /lobby (an unprotected, non-auth
  // page), NEVER /login — so the edge middleware can't bounce them back here.
  // Flag-gated (GUEST_GATE_ENABLED, default OFF) so this ships dark and we flip it
  // on only after verifying live — no unleashing an auth change on the community.
  if (process.env.GUEST_GATE_ENABLED === 'true' && user?.tier === 'guest') redirect('/lobby');

  // This runs only once on the initial load of this layout
  // e.g. when the user signs in/up or on hard reload
  await useCheckIfRequiredFieldsArePopulated();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileHeader />
      <MenuBar />

      <ResponsiveContainer className="pb-20 md:pb-4">{children}</ResponsiveContainer>
      {/* Single bug reporter is the global public/bug-button.js (routes to GitHub consciousness-bugs +
          inbox + #bugs). BugReporter.tsx removed S436 — it was a 2nd floating button writing only /api/bugs. */}
    </div>
  );
}
