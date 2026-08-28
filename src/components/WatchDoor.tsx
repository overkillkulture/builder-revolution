import Link from 'next/link';
import { CommunityBrandConfig } from '@/types/community';

// The clean, on-brand read-only "watch" door for a shared room link when the
// visitor is signed OUT (WO-view-03-chat-redo, S453). Replaces the old giant
// yellow "Sign in to join" nag bar stacked over an empty test-message feed —
// the "demented" first impression a shared link used to give. Signed-IN members
// never see this: the room page redirects them into the real /main chat.
const ROOM_INTROS: Record<string, { emoji: string; blurb: string }> = {
  'build-guild': {
    emoji: '🛠️',
    blurb: 'The developer hall of the Builder Revolution — builders say what they’re making, claim a work order, ship it, and post the evidence back.',
  },
  'case-builder': {
    emoji: '⚖️',
    blurb: 'The room for the legal and case-building crew — organize the facts, share the pattern, and help each other build the record.',
  },
  'builder-revolution': {
    emoji: '🚀',
    blurb: 'Build something. Sell it. Meet the people building next to you. Level up. Joining is free — nobody is turned away.',
  },
};

// The Builder Revolution circuit-sprout mark — same geometry as the business
// card and /builder-revolution landing page (100X_DEPLOYMENT #br-mark symbol),
// so the card → landing → chat handoff stays one brand instead of a 🚀 emoji.
function BrMark({ stroke, dot }: { stroke: string; dot: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-12 w-12" role="img" aria-label="Builder Revolution mark">
      <g stroke={stroke} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 88 L50 40" />
        <path d="M50 62 L34 62 L34 40" />
        <path d="M50 62 L66 62 L66 40" />
        <path d="M22 66 L22 78 L38 90" />
        <path d="M78 66 L78 78 L62 90" />
        <circle cx="50" cy="30" r="7" />
        <circle cx="34" cy="31" r="5" />
        <circle cx="66" cy="31" r="5" />
      </g>
      <circle cx="50" cy="30" r="2.4" fill={dot} />
    </svg>
  );
}
const DEFAULT_INTRO = {
  emoji: '💬',
  blurb: 'A room inside Main Chat — sign in to read the conversation and join in.',
};

export function WatchDoor({
  name,
  slug,
  brand,
}: {
  name: string;
  slug: string;
  brand: CommunityBrandConfig;
}) {
  const intro = ROOM_INTROS[slug] ?? DEFAULT_INTRO;

  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-16"
      style={{ background: brand.bg, color: brand.text }}
    >
      <div className="w-full max-w-md text-center">
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl shadow-lg"
          style={{ background: `${brand.accent}22`, border: `1px solid ${brand.accent}55` }}
        >
          {slug === 'builder-revolution' ? <BrMark stroke={brand.accent} dot={brand.accent2} /> : intro.emoji}
        </div>

        <p className="mb-1 text-sm font-semibold uppercase tracking-widest" style={{ color: brand.accent }}>
          Main Chat
        </p>
        <h1 className="mb-4 text-3xl font-bold sm:text-4xl">{name}</h1>
        <p className="mb-8 text-base leading-relaxed opacity-80">{intro.blurb}</p>

        <Link
          href={`/login?from=/community/${slug}`}
          className="inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-base font-bold transition-transform hover:scale-[1.02]"
          style={{ background: brand.accent, color: brand.bg }}
        >
          Sign in to join the conversation
        </Link>

        <p className="mt-4 text-sm opacity-60">
          <Link href="/feed" className="underline underline-offset-4 hover:opacity-100">
            Look around first
          </Link>
        </p>
      </div>
    </div>
  );
}
