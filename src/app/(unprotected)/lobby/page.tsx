import { getServerUser } from '@/lib/getServerUser';
import { redirect } from 'next/navigation';
import { LobbyVerify } from './LobbyVerify';

export const metadata = { title: 'Lobby — verify to enter the rooms' };

// S477 2-rung gate — the guest destination. A passwordless quick-entry guest who
// tries to enter a room is redirected here (see the protected layout). This page
// lives in the (unprotected) group and is NOT an auth page, so a logged-in guest
// can reach it without the edge middleware bouncing them to /main (the S446 loop).
export default async function LobbyPage() {
  const [user] = await getServerUser();
  // A verified member has no reason to be in the lobby — send them to the rooms.
  if (user && user.tier !== 'guest') redirect('/main');

  return (
    <div className="px-4 py-8 sm:px-0">
      <div className="mx-auto max-w-md rounded-2xl border border-muted bg-card p-6 sm:p-8">
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {user?.name ? `You're in the lobby, ${user.name}` : 'Welcome to the lobby'}
        </h1>
        <p className="mb-6 text-muted-foreground">
          Look around as a guest. To join the rooms — post, chat, and send messages —
          verify who you are with one tap. It takes a second, and it keeps the rooms
          real (no one can wear your name).
        </p>
        <LobbyVerify />
        <p className="mt-6 text-sm text-muted-foreground">
          Verifying links this guest session to your Google or GitHub identity — your
          name, your history, your seat.
        </p>
      </div>
    </div>
  );
}
