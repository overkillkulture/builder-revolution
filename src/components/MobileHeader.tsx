'use client';

import Link from 'next/link';
import { Feather } from '@/svg_components';
import { LogoText } from './LogoText';

const isHQ = process.env.NEXT_PUBLIC_INVITE_ONLY === 'true';

// The three rooms of Main Chat — the "servers" a member switches between.
const ROOMS = [
  { slug: 'build-guild', label: 'Guild', color: 'bg-primary/15 text-primary hover:bg-primary/25' },
  { slug: 'case-builder', label: 'Case', color: 'bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25' },
  { slug: 'builder-revolution', label: 'Movement', color: 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' },
];

export function MobileHeader() {
  return (
    <div className="sticky top-0 z-[3] flex items-center justify-between border-b border-border/50 bg-background/80 px-4 py-2 backdrop-blur-md md:hidden">
      <Link href="/feed" className="flex items-center gap-2" aria-label="Home">
        <Feather className="h-8 w-8 stroke-primary" />
        <LogoText className="text-xl" />
      </Link>
      <div className="flex items-center gap-1.5">
        {/* Room switcher — real navigation between the three rooms */}
        {ROOMS.map((room) => (
          <Link
            key={room.slug}
            href={`/community/${room.slug}`}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${room.color}`}
          >
            {room.label}
          </Link>
        ))}
        {/* Roundtrip home — one visible click back to the cockpit (mirrors the desktop MenuBar link) */}
        <a
          href="https://100xbuilder.io/my/pulse.html"
          className="rounded-lg bg-primary-accent/20 px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-primary-accent/30 hover:text-foreground"
        >
          ← Cockpit
        </a>
        {/* Legacy Case-Builder HQ toolkit — only on the HQ instance, not the shared Main Chat */}
        {isHQ && (
          <a
            href="https://conciousnessrevolution.io/case.html"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-secondary px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-secondary-accent"
          >
            Case
          </a>
        )}
      </div>
    </div>
  );
}
