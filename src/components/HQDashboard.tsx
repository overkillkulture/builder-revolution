'use client';

import { VideoRoomButton } from './VideoRoom';

/**
 * HQ Dashboard — The first thing builders see inside Builder Revolution Chat.
 * Action cards for pattern recognition tools, learning, and collaboration.
 */

const actionCards = [
  {
    title: 'Pattern Library',
    description: 'Browse documented patterns across family court cases. See what repeats.',
    href: 'https://conciousnessrevolution.io/guardian/patterns-library.html',
    icon: '🔍',
    color: 'emerald',
  },
  {
    title: 'Learn Pattern Recognition',
    description: 'How to spot institutional patterns, build timelines, and connect evidence across cases.',
    href: 'https://conciousnessrevolution.io/guardian/patterns-library.html',
    icon: '🧠',
    color: 'purple',
  },
  {
    title: "Commander's Case Builder",
    description: 'See a live case built with these tools. 500+ docs, timeline, evidence map.',
    href: 'https://conciousnessrevolution.io/case.html',
    icon: '⚖️',
    color: 'primary',
  },
  {
    title: 'Fork & Improve',
    description: 'This is open source. Clone the repo, run your own instance, make it better.',
    href: 'https://github.com/overkillkulture/comms-unity',
    icon: '🔧',
    color: 'orange',
  },
];

const colorMap: Record<string, { border: string; bg: string; text: string; iconBg: string }> = {
  emerald: {
    border: 'border-emerald-500/20',
    bg: 'hover:bg-emerald-500/5',
    text: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
  },
  purple: {
    border: 'border-purple-500/20',
    bg: 'hover:bg-purple-500/5',
    text: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
  },
  primary: {
    border: 'border-primary/20',
    bg: 'hover:bg-primary/5',
    text: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  orange: {
    border: 'border-orange-500/20',
    bg: 'hover:bg-orange-500/5',
    text: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
  },
};

const quickTools = [
  { label: 'Case Crunch', href: 'https://conciousnessrevolution.io/guardian/case-crunch.html', icon: '⚡' },
  { label: 'Evidence Snap', href: 'https://conciousnessrevolution.io/guardian/evidence-snap.html', icon: '📸' },
  { label: 'Court Library', href: 'https://conciousnessrevolution.io/guardian/family-court-library.html', icon: '📚' },
  { label: 'Filing Cabinet', href: 'https://conciousnessrevolution.io/doc-vault.html', icon: '📁' },
];

export function HQDashboard() {
  return (
    <div className="mb-6 space-y-4">
      {/* Welcome banner */}
      <div className="rounded-xl border border-primary/10 bg-gradient-to-br from-card to-primary/[0.03] px-5 py-4">
        <h2 className="mb-1 text-lg font-bold text-foreground">
          Builder Revolution Chat
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Build pattern recognition systems. Upload evidence, find what repeats across cases, coordinate strategy, and file with the court — together.
        </p>
      </div>

      {/* Action cards grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actionCards.map((card) => {
          const colors = colorMap[card.color];
          return (
            <a
              key={card.title}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex gap-3 rounded-xl border ${colors.border} bg-card p-4 transition-all ${colors.bg}`}
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${colors.iconBg} text-lg`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <h3 className={`text-sm font-semibold ${colors.text} group-hover:brightness-125`}>
                  {card.title}
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground/70">
                  {card.description}
                </p>
              </div>
            </a>
          );
        })}
      </div>

      {/* Video + Quick tools row */}
      <div className="flex flex-wrap items-center gap-2">
        <VideoRoomButton
          roomId="hq-lobby"
          label="Video Room"
          className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
        />
        {quickTools.map((tool) => (
          <a
            key={tool.label}
            href={tool.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border/30 bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            <span>{tool.icon}</span>
            <span>{tool.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
