'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getPusherClient } from '@/lib/pusher/client';
import { CHANNELS, EVENTS } from '@/lib/pusher/server';
import { GetComment, GetPost } from '@/types/definitions';

/**
 * Subscribe to real-time updates for a specific post's comments.
 * When a new comment arrives via Pusher, it's injected into the
 * React Query cache so it appears instantly — no refresh needed.
 */
export function usePostRealtime(postId: number) {
  const qc = useQueryClient();

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(CHANNELS.post(postId));

    channel.bind(EVENTS.NEW_COMMENT, (newComment: GetComment) => {
      qc.setQueryData<GetComment[]>(['posts', postId, 'comments'], (old) => {
        if (!old) return [newComment];
        // Don't add duplicates (sender already has it via optimistic update)
        if (old.some((c) => c.id === newComment.id)) return old;
        return [...old, newComment];
      });
      // Also update the comment count on the post
      qc.setQueryData<GetPost>(['posts', postId], (oldPost) => {
        if (!oldPost) return oldPost;
        return {
          ...oldPost,
          _count: { ...oldPost._count, comments: oldPost._count.comments + 1 },
        };
      });
    });

    channel.bind(EVENTS.NEW_REPLY, (data: { parentId: number; reply: GetComment }) => {
      qc.setQueryData<GetComment[]>(['comments', data.parentId, 'replies'], (old) => {
        if (!old) return [data.reply];
        if (old.some((r) => r.id === data.reply.id)) return old;
        return [...old, data.reply];
      });
      // Bump the parent comment's "Show N replies" counter (nothing updated it
      // before, so it stayed frozen). Unconditional per event, like NEW_COMMENT.
      qc.setQueryData<GetComment[]>(['posts', postId, 'comments'], (old) =>
        old
          ? old.map((c) =>
              c.id === data.parentId
                ? { ...c, _count: { ...c._count, replies: c._count.replies + 1 } }
                : c,
            )
          : old);
    });

    channel.bind(EVENTS.POST_LIKED, (data: { postId: number; count: number }) => {
      qc.setQueryData<GetPost>(['posts', data.postId], (oldPost) => {
        if (!oldPost) return oldPost;
        return {
          ...oldPost,
          _count: { ...oldPost._count, postLikes: data.count },
        };
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(CHANNELS.post(postId));
    };
  }, [postId, qc]);
}

// S447: useFeedRealtime() removed — it was dead wiring (never mounted, never
// triggered server-side, wrong invalidate key). The feed uses a 5s poll. See the
// note in src/lib/pusher/server.ts to re-add a real-time feed later.
// (WO-chat-feed-realtime)
