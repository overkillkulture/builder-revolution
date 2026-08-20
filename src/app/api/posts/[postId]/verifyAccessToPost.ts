import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';

export const verifyAccessToPost = async (postId: number) => {
  const [user] = await getServerUser();
  // Anonymous → user.id is undefined. Prisma DROPS undefined where-fields, so
  // `userId: undefined` would degrade the count to "does this post exist" and
  // pass the gate — letting logged-out callers delete any post (S446). Reject.
  if (!user?.id) return false;
  const count = await prisma.post.count({
    where: {
      id: postId,
      userId: user?.id,
    },
  });

  return count > 0;
};
