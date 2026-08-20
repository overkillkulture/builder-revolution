/**
 * DELETE /api/posts/:postId
 * - Allows an authenticated user to delete a post.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { deleteObject } from '@/lib/s3/deleteObject';
import { verifyAccessToPost } from './verifyAccessToPost';

export async function DELETE(request: Request, { params }: { params: { postId: string } }) {
  const postId = parseInt(params.postId, 10);
  // NOTE: verifyAccessToPost is async — it MUST be awaited. Without await,
  // `!Promise` is always false, so the ownership check was dead and ANY caller
  // (even unauthenticated) could delete ANY post + its media. (S446 security fix)
  if (!(await verifyAccessToPost(postId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Delete the `post` and the associated `visualMedia` from the database
  const res = await prisma.post.delete({
    select: {
      id: true,
      visualMedia: true,
    },
    where: {
      id: postId,
    },
  });

  // Delete the associated `visualMedia` files from the S3 bucket
  const filenames = res.visualMedia.map((m) => m.fileName);
  await Promise.all(filenames.map(deleteObject));

  return NextResponse.json({ id: res.id });
}
