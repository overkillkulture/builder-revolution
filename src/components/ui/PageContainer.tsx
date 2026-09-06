'use client';

import { usePathname } from 'next/navigation';
import React from 'react';
import { ResponsiveContainer } from './ResponsiveContainer';

// The protected layout's content wrapper. Every page keeps the centered
// 900px reading column EXCEPT /main: the Discord-shaped chat must fill the
// whole screen — the max-width cap was exactly the "pinched into a little
// tiny column in the middle" Commander complaint (WO-main-chat-discord-simplify).
export function PageContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/main') {
    return <div className="min-w-0 w-full flex-1">{children}</div>;
  }
  return <ResponsiveContainer className="pb-20 md:pb-4">{children}</ResponsiveContainer>;
}
