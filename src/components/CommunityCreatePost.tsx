'use client';

import { useCallback, useState } from 'react';
import { apiUrl } from '@/lib/apiUrl';
import { cn } from '@/lib/cn';
import { CommunityBrandConfig } from '@/types/community';
import { GetPost } from '@/types/definitions';

export function CommunityCreatePost({
  slug,
  brand,
  defaultCategory,
  onCreated,
}: {
  slug: string;
  brand: CommunityBrandConfig;
  defaultCategory?: string;
  onCreated: (post: GetPost) => void;
}) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(defaultCategory ?? brand.categories[0]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('Couldn’t post — try again.');

  const submit = useCallback(async () => {
    if (!content.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch(apiUrl(`/api/communities/${slug}/posts`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, category }),
      });
      if (!res.ok) {
        // A 401 (expired session) used to read as the generic "try again", so the
        // user retried forever instead of re-signing-in (S446).
        setErrorMsg(res.status === 401 ? 'Please sign in again to post.' : 'Couldn’t post — try again.');
        setStatus('error');
        return;
      }
      const post = (await res.json()) as GetPost;
      onCreated(post);
      setContent('');
      setStatus('idle');
    } catch {
      setErrorMsg('Check your connection and try again.');
      setStatus('error');
    }
  }, [content, category, slug, onCreated]);

  return (
    <div className="mb-4 rounded-xl p-4" style={{ background: brand.panel, border: `1px solid ${brand.line}` }}>
      <div className="mb-3 flex flex-wrap gap-2">
        {brand.categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn('rounded-full px-3 py-1 text-xs font-medium transition-opacity', c !== category && 'opacity-50')}
            style={{
              background: c === category ? brand.accent : 'transparent',
              color: c === category ? brand.bg : brand.text,
              border: `1px solid ${brand.line}`,
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share what's true for you here…"
        rows={3}
        className="w-full resize-none rounded-lg bg-transparent p-3 text-sm outline-none"
        style={{ color: brand.text, border: `1px solid ${brand.line}` }}
      />
      <div className="mt-2 flex items-center justify-between">
        {status === 'error' && <p className="text-xs" style={{ color: brand.alert }}>{errorMsg}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={status === 'sending' || !content.trim()}
          className="ml-auto rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
          style={{ background: brand.accent, color: brand.bg }}
        >
          {status === 'sending' ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}
