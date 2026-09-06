'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Feather, LogOutCircle, NotificationBell, Profile } from '@/svg_components';
import { WorkOrdersRail } from '@/components/WorkOrdersRail';
import { useSessionUserData } from '@/hooks/useSessionUserData';
import { ROOMS, resolveRoom } from '@/lib/rooms';
import { MessagesClient } from '../messages/MessagesClient';

// The Discord shape (WO-main-chat-discord-simplify, Commander S467): thin
// server rail · channel column · chat fills EVERY remaining pixel. The
// work-orders board is no longer a permanent column — it's behind a toggle,
// Build Guild only, so a newcomer's first screen is just a chat room they
// already know how to use. Reference: Commander's own Discord server
// (~72px rail + ~240px channels + full-width chat, no extra rails).
export function MainViewClient({ userId, initialRoom }: { userId: string; initialRoom?: string }) {
  const [user] = useSessionUserData();
  const router = useRouter();
  const [room, setRoom] = useState(() => resolveRoom(initialRoom));
  const [showBoard, setShowBoard] = useState(false);

  const switchRoom = (slug: string) => {
    const next = resolveRoom(slug);
    setRoom(next);
    // Keep the URL shareable/back-button-friendly without a server round-trip.
    router.replace(`/main?room=${next.slug}`, { scroll: false });
  };

  return (
    <div className="flex h-[calc(100dvh-116px)] md:h-screen">
      {/* SERVER RAIL — desktop only; phones switch rooms via the MobileHeader pills */}
      <div className="hidden w-[68px] flex-shrink-0 flex-col items-center gap-2 border-r border-border/20 bg-black/20 py-3 md:flex">
        <Link href="/feed" title="Feed & profiles" className="mb-1">
          <Feather className="h-8 w-8 stroke-primary" />
        </Link>
        <div className="mb-1 h-px w-8 bg-border/40" />
        {ROOMS.map((r) => {
          const active = r.slug === room.slug;
          return (
            <button
              key={r.slug}
              type="button"
              title={r.label}
              onClick={() => switchRoom(r.slug)}
              className={`flex h-11 w-11 items-center justify-center text-sm font-bold transition-all ${
                active ? 'rounded-xl' : 'rounded-full opacity-60 hover:rounded-xl hover:opacity-100'
              }`}
              style={{
                background: active ? r.accent : r.accentSoft,
                color: active ? '#03110a' : r.accent,
                boxShadow: active ? `0 0 0 2px ${r.accentSoft}` : undefined,
              }}
            >
              {r.short}
            </button>
          );
        })}

        <div className="mt-auto flex flex-col items-center gap-1">
          {room.slug === 'build-guild' && (
            <button
              type="button"
              title={showBoard ? 'Hide the guild board' : 'Show the guild board (work orders)'}
              onClick={() => setShowBoard((v) => !v)}
              className={`mb-1 flex h-9 w-9 items-center justify-center rounded-lg text-[0.6rem] font-bold tracking-wide transition-colors ${
                showBoard
                  ? 'bg-emerald-500/25 text-emerald-300'
                  : 'bg-white/5 text-muted-foreground hover:bg-emerald-500/15 hover:text-emerald-400'
              }`}
            >
              WO
            </button>
          )}
          <Link
            href="/notifications"
            title="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <NotificationBell className="h-5 w-5 stroke-current" />
          </Link>
          <Link
            href={`/${user?.username || ''}`}
            title="My profile"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <Profile className="h-5 w-5 stroke-current" />
          </Link>
          <Link
            href="/api/auth/signout"
            title="Log out"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <LogOutCircle className="h-5 w-5 stroke-current" />
          </Link>
        </div>
      </div>

      {/* THE CHAT — channel column + messages, full remaining width.
          key={room.slug} remounts per room: clean fetch + auto-select of THAT
          room's General, no stale selection bleeding across servers. */}
      <div className="min-w-0 flex-1">
        <MessagesClient
          key={room.slug}
          userId={userId}
          embedded
          fillHeight
          communitySlug={room.slug}
          communityName={room.label}
          accent={room.accent}
        />
      </div>

      {/* GUILD BOARD — the old always-on right rail, now opt-in (desktop, Build Guild only) */}
      {showBoard && room.slug === 'build-guild' && (
        <div className="hidden w-72 flex-shrink-0 overflow-y-auto border-l border-border/20 p-2 lg:block">
          <WorkOrdersRail username={user?.username} name={user?.name} email={user?.email} />
        </div>
      )}
    </div>
  );
}
