'use client';

import { useState } from 'react';
import { WorkOrdersRail } from '@/components/WorkOrdersRail';
import { useSessionUserData } from '@/hooks/useSessionUserData';
import { MessagesClient } from '../messages/MessagesClient';

// The Slack model: one room where the team talks (center), work-order
// buttons + guild abilities on the side. No page-hopping between chat and
// the board. On phones the rail is a tab, not a hidden desktop-only sidebar.
export function MainViewClient({ userId }: { userId: string }) {
  const [user] = useSessionUserData();
  const [mobileTab, setMobileTab] = useState<'chat' | 'work'>('chat');

  const rail = (
    <WorkOrdersRail
      username={user?.username}
      name={user?.name}
      email={user?.email}
    />
  );

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-4xl font-bold">Build Guild</h1>

      {/* Mobile tab switch — the rail is unreachable on phones without this */}
      <div className="mb-3 flex gap-2 lg:hidden">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
            mobileTab === 'chat'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-white/5 text-gray-400'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setMobileTab('work')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
            mobileTab === 'work'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-white/5 text-gray-400'
          }`}
        >
          Work
        </button>
      </div>

      <div className="flex gap-4">
        <div className={`min-w-0 flex-1 ${mobileTab === 'chat' ? 'block' : 'hidden'} lg:block`}>
          <MessagesClient userId={userId} embedded />
        </div>
        {/* Desktop: side-by-side. Mobile: shown only when the Work tab is active */}
        <div className={`${mobileTab === 'work' ? 'block' : 'hidden'} w-full flex-shrink-0 lg:block lg:w-72`}>
          {rail}
        </div>
      </div>
    </div>
  );
}
