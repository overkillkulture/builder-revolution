'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '@/lib/apiUrl';
import { cn } from '@/lib/cn';
import { CommunityBrandConfig } from '@/types/community';
import { GetPost } from '@/types/definitions';
import { Post } from './Post';
import { CommunityCreatePost } from './CommunityCreatePost';
import { CommunityReportButton } from './CommunityReportButton';

const ALL = 'All';

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
    });
  }, [load]);

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
    setPosts((prev) => [post, ...prev]);
  }, []);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {[ALL, ...brand.categories].map((c) => (
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

      {canPost && (
        <CommunityCreatePost
          slug={slug}
          brand={brand}
          defaultCategory={category !== ALL ? category : undefined}
          onCreated={handleCreated}
        />
      )}

      {isLoading ? (
        <p className="text-sm opacity-60" style={{ color: brand.text }}>Loading…</p>
      ) : posts.length === 0 ? (
        <p className="rounded-xl p-6 text-center text-sm opacity-60" style={{ background: brand.panel, color: brand.text }}>
          Nothing here yet. Be the first to share.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <div key={post.id}>
              <Post id={post.id} commentsShown={commentsShown.has(post.id)} toggleComments={toggleComments} />
              <CommunityReportButton postId={post.id} brand={brand} />
            </div>
          ))}
        </div>
      )}

      {hasMore && !isLoading && posts.length > 0 && (
        <button
          type="button"
          onClick={loadMore}
          className="mx-auto mt-4 block rounded-full px-4 py-2 text-sm font-medium"
          style={{ background: brand.panel, color: brand.text, border: `1px solid ${brand.line}` }}
        >
          Load more
        </button>
      )}
    </div>
  );
}
