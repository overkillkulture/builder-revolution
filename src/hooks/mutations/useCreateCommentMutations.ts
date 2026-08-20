import { apiUrl } from '@/lib/apiUrl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GetComment, GetPost } from '@/types/definitions';
import { useErrorNotifier } from '../useErrorNotifier';
import { useToast } from '../useToast';

// When Pusher is configured, its NEW_COMMENT/NEW_REPLY broadcast bumps the
// counters for everyone (incl. the sender). When it's NOT configured the events
// never fire, so the counters froze (S446) — in that case we bump optimistically
// here. Gating on this constant avoids double-counting when Pusher IS on.
const PUSHER_ON = !!process.env.NEXT_PUBLIC_PUSHER_KEY;

export function useCreateCommentMutations() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { notifyError } = useErrorNotifier();

  const createCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      const res = await fetch(apiUrl(`/api/posts/${postId}/comments`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
        }),
      });

      if (!res.ok) throw new Error(res.statusText);
      return (await res.json()) as GetComment;
    },
    onSuccess: (createdComment) => {
      qc.setQueryData<GetComment[]>(['posts', createdComment.postId, 'comments'], (oldComments) => {
        if (!oldComments) return oldComments;
        // dedup vs a racing Pusher NEW_COMMENT add
        if (oldComments.some((c) => c.id === createdComment.id)) return oldComments;
        return [...oldComments, createdComment];
      });
      // Keep the post's comment counter in sync (only Pusher bumped it before, so
      // it froze without Pusher). Skip when Pusher is on to avoid double-counting.
      if (!PUSHER_ON) {
        qc.setQueryData<GetPost>(['posts', createdComment.postId], (p) =>
          p ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } } : p);
      }
      showToast({
        title: 'Success',
        message: 'Your comment has been created.',
        type: 'success',
      });
    },
    onError: (err) => {
      notifyError(err);
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: async ({ parentId, content }: { parentId: number; content: string }) => {
      const res = await fetch(apiUrl(`/api/comments/${parentId}/replies`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
        }),
      });

      if (!res.ok) throw new Error(res.statusText);
      return (await res.json()) as GetComment;
    },
    onSuccess: (createdReply) => {
      qc.setQueryData<GetComment[]>(['comments', createdReply.parentId, 'replies'], (oldReplies) => {
        if (!oldReplies) return oldReplies;
        if (oldReplies.some((r) => r.id === createdReply.id)) return oldReplies;
        return [...oldReplies, createdReply];
      });
      // Bump the parent comment's "Show N replies" counter (nothing updated it
      // before, so it never appeared/incremented). Skip when Pusher is on.
      if (!PUSHER_ON) {
        qc.setQueryData<GetComment[]>(['posts', createdReply.postId, 'comments'], (old) =>
          old
            ? old.map((c) =>
                c.id === createdReply.parentId
                  ? { ...c, _count: { ...c._count, replies: c._count.replies + 1 } }
                  : c,
              )
            : old);
      }
      showToast({
        title: 'Success',
        message: 'Your reply has been created.',
        type: 'success',
      });
    },
    onError: (err) => {
      notifyError(err);
    },
  });

  return {
    createCommentMutation,
    createReplyMutation,
  };
}
