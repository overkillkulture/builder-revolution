'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/lib/apiUrl';
import { CommunityBrandConfig } from '@/types/community';
import { GetPost } from '@/types/definitions';

/**
 * CommunityComposer — the chat-style message bar docked at the BOTTOM of a room.
 *
 * Round 1 chat-UX fix #1 (+ #4 free):
 * - Logged IN  → single-line input + amber send button (Enter to send).
 * - Logged OUT → disabled "Sign in to send →" state that links to /login.
 *   This replaces the giant full-width yellow "Sign in to join the conversation"
 *   banner that used to eat the top of the room view.
 *
 * Fixed to the bottom, mobile-safe (respects iOS safe-area inset). On desktop the
 * left edge clears the 200px MenuBar sidebar; on mobile it spans full width (the
 * mobile bottom nav is hidden on room views — see MenuBar fix #2).
 */
export function CommunityComposer({
  slug,
  brand,
  category,
  canPost,
  onCreated,
}: {
  slug: string;
  brand: CommunityBrandConfig;
  /** Currently selected room/category filter, or undefined when "All" is active. */
  category?: string;
  canPost: boolean;
  onCreated: (post: GetPost) => void;
}) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(async () => {
    if (!content.trim() || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch(apiUrl(`/api/communities/${slug}/posts`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Post into the room the user is viewing; fall back to the room's first
        // category when the "All" filter is active.
        body: JSON.stringify({ content, category: category ?? brand.categories[0] }),
      });
      if (!res.ok) throw new Error('failed');
      const post = (await res.json()) as GetPost;
      onCreated(post);
      setContent('');
      setStatus('idle');
      if (taRef.current) taRef.current.style.height = 'auto';
    } catch {
      setStatus('error');
    }
  }, [content, category, slug, brand.categories, status, onCreated]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter sends, Shift+Enter makes a newline (standard chat behavior).
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  const autoGrow = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const barStyle: React.CSSProperties = {
    background: brand.panel,
    borderTop: `1px solid ${brand.line}`,
    paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
  };

  if (!canPost) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-20 md:left-[200px]" style={barStyle}>
        <div className="mx-auto flex max-w-[900px] items-center gap-3 px-3 pt-2.5">
          <Link
            href={`/login?from=/community/${slug}`}
            className="flex flex-1 items-center justify-between rounded-full px-4 py-2.5 text-sm font-semibold"
            style={{ background: brand.bg, color: brand.text, border: `1px solid ${brand.line}` }}
          >
            <span className="opacity-70">Sign in to send</span>
            <span style={{ color: brand.accent }}>→</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 md:left-[200px]" style={barStyle}>
      <div className="mx-auto flex max-w-[900px] items-end gap-2 px-3 pt-2.5">
        <textarea
          ref={taRef}
          value={content}
          onChange={autoGrow}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={`Message ${category ?? '#' + slug}…`}
          className="flex-1 resize-none rounded-[20px] px-4 py-2.5 text-sm outline-none"
          style={{
            background: brand.bg,
            color: brand.text,
            border: `1px solid ${brand.line}`,
            minHeight: 42,
            maxHeight: 120,
            lineHeight: 1.35,
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={status === 'sending' || !content.trim()}
          aria-label="Send message"
          className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
          style={{ background: brand.accent, color: brand.bg }}
        >
          {/* paper-plane / send arrow */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
          </svg>
        </button>
      </div>
      {status === 'error' && (
        <p className="mx-auto max-w-[900px] px-4 pt-1 text-xs" style={{ color: brand.alert }}>
          Couldn&apos;t send — try again.
        </p>
      )}
    </div>
  );
}
