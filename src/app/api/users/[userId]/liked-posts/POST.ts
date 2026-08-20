/**
 * POST /api/users/:userId/liked-posts
 * - Allows an authenticated user to add a post to
 * their liked posts.
 *
 * JSON body: {
 *  postId: string
 * }
 */

import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getPusher, CHANNELS, EVENTS } from '@/lib/pusher/server';

export async function POST(request: Request, { params }: { params: { userId: string } }) {
  const [user] = await getServerUser();
  if (!user || params.userId !== user.id) return NextResponse.json({}, { status: 401 });
  const userId = user.id;

  const { postId } = await request.json();
  if (typeof postId !== 'number' || !Number.isInteger(postId)) {
    return NextResponse.json({ error: 'Invalid postId' }, { status: 400 });
  }

  // Check first if the post is already liked
  const isLiked = await prisma.postLike.count({
    where: {
      userId,
      postId,
    },
  });

  if (isLiked) {
    // Post is already liked, return 409 Conflict
    return NextResponse.json({}, { status: 409 });
  }

  try {
    // Like the post
    const res = await prisma.postLike.create({
      data: {
        userId,
        postId,
      },
    });

    // Record a 'POST_LIKE' activity
    const postOwner = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        userId: true,
      },
    });
    if (postOwner) {
      await prisma.activity.create({
        data: {
          type: 'POST_LIKE',
          sourceId: res.id,
          sourceUserId: userId,
          targetId: postId,
          targetUserId: postOwner?.userId,
        },
      });
    }

    // Broadcast like count update via Pusher
    const pusher = getPusher();
    if (pusher) {
      const likeCount = await prisma.postLike.count({ where: { postId } });
      pusher.trigger(CHANNELS.post(postId), EVENTS.POST_LIKED, { postId, count: likeCount }).catch(() => {});
    }

    return NextResponse.json({});
  } catch (e) {
    // Concurrent double-like raced past the count check and hit the
    // unique(userId,postId) constraint. The like already exists -> 409 (the
    // client treats 409 as success), not a 500 that rolls the like back (S446).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({}, { status: 409 });
    }
    return NextResponse.json({ error: 'Could not like post' }, { status: 500 });
  }
}
