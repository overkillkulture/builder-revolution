'use client';

import { WorkOrdersRail } from '@/components/WorkOrdersRail';
import { MessagesClient } from '../messages/MessagesClient';

// The Slack model: one room where the team talks (center), work-order
// buttons on the side. No page-hopping between chat and the board.
export function MainViewClient({ userId }: { userId: string }) {
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-4xl font-bold">Main</h1>
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <MessagesClient userId={userId} embedded />
        </div>
        <div className="hidden w-72 flex-shrink-0 lg:block">
          <WorkOrdersRail />
        </div>
      </div>
    </div>
  );
}
