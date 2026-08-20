import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';

export const verifyAccessToComment = async (commentId: number) => {
  const [user] = await getServerUser();
  // Anonymous → user.id undefined → Prisma drops the userId filter → gate would
  // pass for logged-out callers (delete-any-comment). Reject explicitly (S446).
  if (!user?.id) return false;
  const count = await prisma.comment.count({
    where: {
      id: commentId,
      userId: user?.id,
    },
  });

  return count > 0;
};
