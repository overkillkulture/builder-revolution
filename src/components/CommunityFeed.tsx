'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '@/lib/apiUrl';
import { cn } from '@/lib/cn';
import { CommunityBrandConfig } from '@/types/community';
import { GetPost } from '@/types/definitions';
import { Post } from './Post';
import { CommunityComposer } from './CommunityComposer';
import { CommunityReportButton } from './CommunityReportButton';

const ALL = 'All';

// Per-room orientation shown when a room has no posts yet, so a fresh room
// reads as "waiting for you" instead of "broken/dead" at grand opening.
const ROOM_INTROS: Record<string, { emoji: string; title: string; blurb: string; prompt: string }> = {
  'build-guild': {
    emoji: '🛠️',
    title: 'Welcome to the Build Guild',
    blurb: 'The developer hall of the Builder Revolution — say what you\'re building, claim a work order, ship it, and post the evidence back.',
    prompt: 'Introduce yourself and what you\'re building.',
  },
  'case-builder': {
    emoji: '⚖️',
    title: 'Welcome to Case Builder',
    blurb: 'The room for the legal and case-building crew — organize the facts, share the pattern, and help each other build the record.',
    prompt: 'Share what case or pattern you\'re working on.',
  },
  'builder-revolution': {
    emoji: '🚀',
    title: 'Welcome to the Builder Revolution',
    blurb: 'The catch-all room for everyone building toward sovereignty — the movement that turns survival into systems.',
    prompt: 'Say hello and what brought you here.',
  },
};
const DEFAULT_INTRO = {
  emoji: '💬',
  title: 'This room is just getting started',
  blurb: 'No posts here yet.',
  prompt: 'Be the first to share.',
};

export function CommunityFeed({
  slug,
  brand,
  canPost,
}: {
  slug: string;
  brand: CommunityBrandConfig;
  canPost: boolean;
}) {
  const [category, setCategory] = useState<string>(ALL);
  const [posts, setPosts] = useState<GetPost[]>([]);
  const [commentsShown, setCommentsShown] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  // Fix #3: newest-at-bottom + autoscroll. bottomRef marks the end of the list;
  // scrollTick is bumped only on initial load and on a NEW message (never on
  // "Load more", which prepends older history above the current view).
  const bottomRef = useRef<HTMLDivElement>(null);
  const [scrollTick, setScrollTick] = useState(0);

  const load = useCallback(
    async (cursor?: number) => {
      const params = new URLSearchParams({ limit: '10' });
      if (category !== ALL) params.set('category', category);
      if (cursor) params.set('cursor', cursor.toString());

      const res = await fetch(apiUrl(`/api/communities/${slug}/posts?${params.toString()}`));
      if (!res.ok) return [] as GetPost[];
      return (await res.json()) as GetPost[];
    },
    [slug, category],
  );

  useEffect(() => {
    setIsLoading(true);
    load().then((fetched) => {
      setPosts(fetched);
      setHasMore(fetched.length === 10);
      setIsLoading(false);
      setScrollTick((t) => t + 1); // jump to newest once the room loads
    });
  }, [load]);

  // Autoscroll to the newest message on initial load and whenever we post one.
  useEffect(() => {
    if (scrollTick === 0) return;
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: scrollTick === 1 ? 'auto' : 'smooth' });
  }, [scrollTick]);

  const loadMore = useCallback(async () => {
    const lastId = posts.at(-1)?.id;
    const more = await load(lastId);
    setPosts((prev) => [...prev, ...more]);
    setHasMore(more.length === 10);
  }, [load, posts]);

  const toggleComments = useCallback((postId: number) => {
    setCommentsShown((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  const handleCreated = useCallback((post: GetPost) => {
    // State stays newest-first; the reversed render puts this at the visual bottom.
    setPosts((prev) => [post, ...prev]);
    setScrollTick((t) => t + 1);
  }, []);

  return (
    // Bottom padding clears the fixed composer bar so the newest message is never
    // hidden behind it (fix #1). ~96px + iOS safe-area inset.
    <div style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="mb-4 flex flex-wrap gap-2">
        {[ALL, ...(Array.isArray(brand.categories) ? brand.categories : [])].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn('rounded-full px-3 py-1.5 text-sm font-medium transition-opacity', c !== category && 'opacity-60 hover:opacity-90')}
            style={{
              background: c === category ? brand.accent : brand.panel,
              color: c === category ? brand.bg : brand.text,
              border: `1px solid ${brand.line}`,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* "Load more" loads OLDER history — it belongs at the TOP now that newest is
          at the bottom (fix #3). */}
      {hasMore && !isLoading && posts.length > 0 && (
        <button
          type="button"
          onClick={loadMore}
          className="mx-auto mb-3 block rounded-full px-4 py-2 text-sm font-medium"
          style={{ background: brand.panel, color: brand.text, border: `1px solid ${brand.line}` }}
        >
          Load older messages
        </button>
      )}

      {isLoading ? (
        <p className="text-sm opacity-60" style={{ color: brand.text }}>Loading…</p>
      ) : posts.length === 0 ? (
        (() => {
          const intro = ROOM_INTROS[slug] ?? DEFAULT_INTRO;
          return (
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: brand.panel, color: brand.text, border: `1px solid ${brand.line}` }}
            >
              <div className="mb-3 text-4xl">{intro.emoji}</div>
              <h2 className="mb-2 text-lg font-bold">{intro.title}</h2>
              <p className="mx-auto mb-4 max-w-md text-sm opacity-80">{intro.blurb}</p>
              <p className="text-sm font-semibold" style={{ color: brand.accent }}>
                {canPost ? intro.prompt : 'Sign in above to be the first to post.'}
              </p>
            </div>
          );
        })()
      ) : (
        <div className="flex flex-col gap-3">
          {/* Newest at the BOTTOM: state is newest-first, so reverse for display. */}
          {posts.slice().reverse().map((post) => (
            <div key={post.id}>
              <Post id={post.id} commentsShown={commentsShown.has(post.id)} toggleComments={toggleComments} />
              <CommunityReportButton postId={post.id} brand={brand} />
            </div>
          ))}
        </div>
      )}

      {/* autoscroll target */}
      <div ref={bottomRef} />

      {/* Docked bottom composer — replaces the old top yellow "Sign in to join"
          banner and inline create-post card (fixes #1 + #4). */}
      <CommunityComposer
        slug={slug}
        brand={brand}
        category={category !== ALL ? category : undefined}
        canPost={canPost}
        onCreated={handleCreated}
      />
    </div>
  );
}
