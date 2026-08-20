import 'server-only';
import { auth } from '@/auth';
import prisma from '@/lib/prisma/prisma';

export async function getServerUser() {
  const session = await auth();
  const sessionUser = session?.user;
  if (!sessionUser?.id) return [undefined];

  // Revocation (S446): the JWT lives up to 90 days and carries only the user id.
  // Without re-checking, a DELETED user keeps full access until the token expires
  // (their id keeps authoring content, and stale sessions 500 on writes). Confirm
  // the row still exists so a delete takes effect on the next request. One indexed
  // PK lookup; cheap relative to the queries every protected route already runs.
  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true },
  });
  if (!dbUser) return [undefined];

  return [sessionUser];
}
