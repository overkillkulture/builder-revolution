/**
 * POST /api/users/:userId/liked-comments
 * - Allows an authenticated user to add a comment to
 * their liked comments.
 *
 * JSON body: {
 *  commentId: string
 * }
 */

import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: { userId: string } }) {
  const [user] = await getServerUser();
  if (!user || params.userId !== user.id) return NextResponse.json({}, { status: 401 });
  const userId = user.id;

  const { commentId } = await request.json();
  if (typeof commentId !== 'number' || !Number.isInteger(commentId)) {
    return NextResponse.json({ error: 'Invalid commentId' }, { status: 400 });
  }

  // Check first if the comment is already liked
  const isLiked = await prisma.commentLike.count({
    where: {
      userId,
      commentId,
    },
  });

  // Comment is already liked, return 409 Conflict
  if (isLiked) {
    return NextResponse.json({}, { status: 409 });
  }

  try {
    // Like the comment
    const res = await prisma.commentLike.create({
      data: {
        userId,
        commentId,
      },
    });

    // Record a 'REPLY_LIKE' or a 'COMMENT_LIKE' activity
    const comment = await prisma.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        parentId: true,
        userId: true,
      },
    });
    if (comment) {
      const type = comment?.parentId ? 'REPLY_LIKE' : 'COMMENT_LIKE';
      await prisma.activity.create({
        data: {
          type,
          sourceId: res.id,
          sourceUserId: userId,
          targetId: commentId,
          targetUserId: comment?.userId,
        },
      });
    }

    return NextResponse.json({});
  } catch (e) {
    // Concurrent double-like raced the unique(userId,commentId) constraint ->
    // already liked -> 409 (client treats as success), not a 500 (S446).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({}, { status: 409 });
    }
    return NextResponse.json({ error: 'Could not like comment' }, { status: 500 });
  }
}
