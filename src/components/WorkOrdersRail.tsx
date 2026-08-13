'use client';

import { useEffect, useMemo, useState } from 'react';
import { VideoRoomButton } from '@/components/VideoRoom';

interface BoardCard {
  id: string;
  title: string;
  list: string;
  status: 'open' | 'claimed' | 'done';
  owner: string;
  audience: 'public' | 'team' | 'inside';
}

interface BoardColumn {
  key: string;
  count: number;
  cards: BoardCard[];
}

interface BuilderIdentity {
  username?: string | null;
  name?: string | null;
  email?: string | null;
}

const BOARD_FEED_URL = 'https://100xbuilder.io/.netlify/functions/board-feed?group=list';
const BOARD_HOME_URL = 'https://100xbuilder.io/dev-board.html';

// The real builder tools this room houses. Every URL verified 200 (S436).
const ABILITIES: { emoji: string; label: string; href: string }[] = [
  { emoji: '🚀', label: 'Dev Pack', href: 'https://100xbuilder.io/dev-pack-guide.html' },
  { emoji: '📋', label: 'Claim Work', href: 'https://100xbuilder.io/dev-board.html' },
  { emoji: '⚡', label: 'ARAYA', href: 'https://100xbuilder.io/araya-chat.html' },
];

// Lanes builders care about first; everything else follows, alphabetically.
const LANE_PRIORITY = ['buildguild', 'PUBLIC'];

const STATUS_DOT: Record<BoardCard['status'], string> = {
  open: '#00e696',
  claimed: '#f5a623',
  done: 'rgba(255,255,255,0.25)',
};

// Build lowercased identity tokens (username / name / email local-part).
// Short tokens are dropped to avoid false matches on owner strings.
function buildTokens(identity: BuilderIdentity): string[] {
  const raw: string[] = [];
  if (identity.username) raw.push(identity.username);
  if (identity.name) raw.push(identity.name);
  if (identity.email) raw.push(identity.email.split('@')[0]);
  return Array.from(
    new Set(
      raw
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length >= 3),
    ),
  );
}

// Best-effort, case-insensitive owner match. Full identity bridge is BG-5.
function ownerMatches(owner: string, tokens: string[]): boolean {
  const o = (owner || '').trim().toLowerCase();
  if (!o || tokens.length === 0) return false;
  return tokens.some((t) => o === t || o.includes(t) || t.includes(o));
}

function CardLink({ card }: { card: BoardCard }) {
  return (
    <a
      href={BOARD_HOME_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={card.title}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '6px 14px 6px 20px',
        fontSize: '0.78rem',
        color: '#c8dcd4',
        textDecoration: 'none',
        lineHeight: 1.3,
      }}
    >
      <span
        style={{
          marginTop: '5px',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: STATUS_DOT[card.status],
          flexShrink: 0,
        }}
      />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {card.title}
      </span>
    </a>
  );
}

const SECTION_LABEL: React.CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid rgba(0,230,150,0.1)',
  fontSize: '0.65rem',
  letterSpacing: '1.5px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#8ca59b',
};

export function WorkOrdersRail(identity: BuilderIdentity = {}) {
  const [columns, setColumns] = useState<BoardColumn[] | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(LANE_PRIORITY));

  useEffect(() => {
    let cancelled = false;
    fetch(BOARD_FEED_URL)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return;
        const cols: BoardColumn[] = (data.columns || []).map((c: BoardColumn) => ({
          ...c,
          cards: c.cards.filter((card) => card.audience !== 'inside' && card.status !== 'done'),
        })).filter((c: BoardColumn) => c.cards.length > 0);
        cols.sort((a, b) => {
          const ai = LANE_PRIORITY.indexOf(a.key);
          const bi = LANE_PRIORITY.indexOf(b.key);
          if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          return a.key.localeCompare(b.key);
        });
        setColumns(cols);
      })
      .catch(() => !cancelled && setError(true));
    return () => { cancelled = true; };
  }, []);

  const tokens = useMemo(() => buildTokens(identity), [identity.username, identity.name, identity.email]);

  const yourCards = useMemo(() => {
    if (!columns || tokens.length === 0) return [];
    const seen = new Set<string>();
    const mine: BoardCard[] = [];
    for (const col of columns) {
      for (const card of col.cards) {
        if (ownerMatches(card.owner, tokens) && !seen.has(card.id)) {
          seen.add(card.id);
          mine.push(card);
        }
      }
    }
    return mine;
  }, [columns, tokens]);

  const toggleLane = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div
      style={{
        background: '#0e161c',
        border: '1px solid rgba(0, 230, 150, 0.15)',
        borderRadius: '12px',
        overflowY: 'auto',
        height: 'calc(100vh - 160px)',
      }}
    >
      {/* ── GUILD ABILITIES: house the tools, not just the work orders ── */}
      <div style={SECTION_LABEL}>Guild Abilities</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px 14px' }}>
        {ABILITIES.map((a) => (
          <a
            key={a.label}
            href={a.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 6px',
              borderRadius: '8px',
              background: 'rgba(0,230,150,0.08)',
              border: '1px solid rgba(0,230,150,0.18)',
              color: '#8fe9c4',
              fontSize: '0.72rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>{a.emoji}</span>
            <span>{a.label}</span>
          </a>
        ))}
        <VideoRoomButton
          roomId="build-guild"
          label="Video Room"
          className="flex items-center justify-center gap-1.5 rounded-lg"
        />
      </div>

      {/* ── YOUR CARDS: personalized (BG-31) ── */}
      <div style={{ ...SECTION_LABEL, borderTop: '1px solid rgba(0,230,150,0.1)' }}>Your Cards</div>
      {yourCards.length > 0 ? (
        <div style={{ paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {yourCards.slice(0, 12).map((card) => (
            <CardLink key={`mine-${card.id}`} card={card} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#8ca59b', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          No cards claimed yet — grab one below.
        </div>
      )}

      {/* ── WORK ORDERS: the live board ── */}
      <div style={SECTION_LABEL}>Work Orders</div>

      {error && (
        <div style={{ padding: '14px', fontSize: '0.8rem', color: '#8ca59b' }}>
          Couldn&apos;t load the board right now.
        </div>
      )}

      {!error && !columns && (
        <div style={{ padding: '14px', fontSize: '0.8rem', color: '#8ca59b' }}>Loading…</div>
      )}

      {columns && columns.length === 0 && (
        <div style={{ padding: '14px', fontSize: '0.8rem', color: '#8ca59b' }}>Nothing open right now.</div>
      )}

      {columns?.map((col) => (
        <div key={col.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => toggleLane(col.key)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#dceae6',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <span>{col.key}</span>
            <span style={{ color: '#6a8a7a', fontSize: '0.72rem' }}>
              {col.cards.length}{expanded.has(col.key) ? ' ▾' : ' ▸'}
            </span>
          </button>

          {expanded.has(col.key) && (
            <div style={{ paddingBottom: '4px' }}>
              {col.cards.slice(0, 12).map((card) => (
                <CardLink key={card.id} card={card} />
              ))}
              {col.cards.length > 12 && (
                <a
                  href={BOARD_HOME_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', padding: '4px 14px 8px 20px', fontSize: '0.72rem', color: '#00e696', opacity: 0.8, textDecoration: 'none' }}
                >
                  +{col.cards.length - 12} more →
                </a>
              )}
            </div>
          )}
        </div>
      ))}

      <a
        href={BOARD_HOME_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          padding: '10px 14px',
          fontSize: '0.75rem',
          color: '#00e696',
          textDecoration: 'none',
          borderTop: '1px solid rgba(0,230,150,0.1)',
        }}
      >
        Open full board →
      </a>
    </div>
  );
}
