'use client';

import Link from 'next/link';
import { Feather } from '@/svg_components';
import { LogoText } from './LogoText';

const isHQ = process.env.NEXT_PUBLIC_INVITE_ONLY === 'true';
// The persistent way home — a member is never stuck in chat (WO-guild-door-roundtrip).
const COCKPIT_URL = 'https://100xbuilder.io/my/pulse.html';

// The three rooms of Main Chat — the "servers" a member switches between.
const ROOMS = [
  { slug: 'build-guild', label: 'Guild', color: 'bg-primary/15 text-primary hover:bg-primary/25' },
  { slug: 'case-builder', label: 'Case', color: 'bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25' },
  {
    slug: 'builder-revolution',
    label: 'Movement',
    color: 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25',
  },
];

// The ONE top context strip. Shown on every breakpoint now that the desktop
// sidebar (old MenuBar) is retired in favour of the CrDock bottom dock: header
// = context + home, dock = the 5 abilities (HUD_MERGE law — no second ability bar).
export function MobileHeader() {
  return (
    <div className="sticky top-0 z-[3] flex items-center justify-between gap-2 border-b border-border/50 bg-background/80 px-4 py-2 backdrop-blur-md">
      <Link href="/feed" className="flex flex-shrink-0 items-center gap-2" aria-label="Home">
        <Feather className="h-8 w-8 stroke-primary" />
        <LogoText className="text-xl" />
      </Link>
      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
        {/* ← My Cockpit — persistent one-click return to the main-site cockpit */}
        <a
          href={COCKPIT_URL}
          className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
          title="Back to your cockpit">
          <span aria-hidden>←</span> Cockpit
        </a>
        {/* Room switcher — real navigation between the three rooms */}
        {ROOMS.map((room) => (
          <Link
            key={room.slug}
            href={`/community/${room.slug}`}
            className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${room.color}`}>
            {room.label}
          </Link>
        ))}
        {/* Legacy Case-Builder HQ toolkit — only on the HQ instance, not the shared Main Chat */}
        {isHQ && (
          <a
            href="https://conciousnessrevolution.io/case.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 rounded-lg bg-secondary px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-secondary-accent">
            Case
          </a>
        )}
      </div>
    </div>
  );
}
