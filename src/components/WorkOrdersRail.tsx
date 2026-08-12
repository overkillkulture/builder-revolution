'use client';

import { useEffect, useState } from 'react';

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

const BOARD_FEED_URL = 'https://100xbuilder.io/.netlify/functions/board-feed?group=list';
const BOARD_HOME_URL = 'https://100xbuilder.io/dev-board.html';

// Lanes builders care about first; everything else follows, alphabetically.
const LANE_PRIORITY = ['buildguild', 'PUBLIC'];

const STATUS_DOT: Record<BoardCard['status'], string> = {
  open: '#00e696',
  claimed: '#f5a623',
  done: 'rgba(255,255,255,0.25)',
};

export function WorkOrdersRail() {
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
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(0,230,150,0.1)',
          fontSize: '0.65rem',
          letterSpacing: '1.5px',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: '#8ca59b',
        }}
      >
        Work Orders
      </div>

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
                <a
                  key={card.id}
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
