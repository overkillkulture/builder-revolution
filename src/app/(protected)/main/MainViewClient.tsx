'use client';

import { useState } from 'react';
import { WorkOrdersRail } from '@/components/WorkOrdersRail';
import { useSessionUserData } from '@/hooks/useSessionUserData';
import { MessagesClient } from '../messages/MessagesClient';

// The Slack model: one room where the team talks. On arrival it must READ AS A
// CHAT, not a project board (WO-chat-default-view — Commander: "looks like five
// Trello lanes smooshed together"). So the conversation is the ONLY thing shown
// by default and takes the full width; the work-order rail is an OPT-IN tab on
// every viewport (was a permanent desktop side column — the extra "lane"). No
// page-hopping: one click flips to Work Orders and back.
export function MainViewClient({ userId }: { userId: string }) {
  const [user] = useSessionUserData();
  const [tab, setTab] = useState<'chat' | 'work'>('chat');

  const rail = (
    <WorkOrdersRail
      username={user?.username}
      name={user?.name}
      email={user?.email}
    />
  );

  return (
    <div className="px-4 pt-3">
      {/* Compact tab bar (all viewports). Chat is the default so the first
          screen is a conversation, not a menu of lanes. Replaces the big
          "Build Guild" title + permanent desktop rail that read as a board. */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setTab('chat')}
          className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-colors ${
            tab === 'chat'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-white/5 text-gray-400 hover:text-gray-200'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setTab('work')}
          className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-colors ${
            tab === 'work'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-white/5 text-gray-400 hover:text-gray-200'
          }`}
        >
          Work Orders
        </button>
      </div>

      {/* Chat stays MOUNTED when the Work tab is open (just hidden) so its 3s
          poll keeps running and returning is instant — only visibility toggles. */}
      <div className={tab === 'chat' ? 'block' : 'hidden'}>
        <MessagesClient userId={userId} embedded />
      </div>
      <div className={tab === 'work' ? 'mx-auto block max-w-2xl' : 'hidden'}>
        {rail}
      </div>
    </div>
  );
}
