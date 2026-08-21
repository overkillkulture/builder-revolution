import Pusher from 'pusher';

let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher | null {
  if (!process.env.PUSHER_APP_ID) return null;

  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }

  return pusherInstance;
}

// Channel names
export const CHANNELS = {
  post: (postId: number) => `post-${postId}`,
  // S447: removed the `feed` channel + NEW_POST event — they were dead wiring
  // (never triggered server-side, the hook was never mounted, and its invalidate
  // key didn't match the feed query). The feed refreshes on a 5s poll. If a
  // real-time feed is wanted later, re-add these + trigger on post create + mount
  // useFeedRealtime with the correct key. (WO-chat-feed-realtime)
} as const;

// Event names
export const EVENTS = {
  NEW_COMMENT: 'new-comment',
  NEW_REPLY: 'new-reply',
  POST_LIKED: 'post-liked',
} as const;
