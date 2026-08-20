/**
 * GET /api/users
 * - Returns a list of users, it allows filtering by `gender`,
 * `relationshipStatus` and by followers/following.
 */
import { getServerUser } from '@/lib/getServerUser';
import { includeToUser } from '@/lib/prisma/includeToUser';
import prisma from '@/lib/prisma/prisma';
import { searchUser } from '@/lib/prisma/searchUser';
import { toGetUser } from '@/lib/prisma/toGetUser';
import { snakeCase, toUpper } from 'lodash';
import { NextResponse } from 'next/server';
import { FindUserResult, GetUser } from '@/types/definitions';

export async function GET(request: Request) {
  /**
   * The [user] will only be used to check whether the
   * user requesting has followed the Users or not.
   */
  const [user] = await getServerUser();
  const { searchParams } = new URL(request.url);

  // Clamp: NaN take/skip -> Prisma 500; huge limit -> table scan/DoS (S446).
  const rawLimit = parseInt(searchParams.get('limit') || '4', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 4;
  const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  const search = searchParams.get('search');
  const gender = toUpper(snakeCase(searchParams.get('gender') || undefined));
  const relationshipStatus = toUpper(snakeCase(searchParams.get('relationship-status') || undefined));
  const followersOf = searchParams.get('followers-of');
  const followingOf = searchParams.get('following-of');

  const res: FindUserResult[] | null = await prisma.user.findMany({
    where: {
      ...(search && searchUser(search)),
      ...(gender && { gender }),
      ...(relationshipStatus && {
        relationshipStatus,
      }),
      ...(followersOf && {
        following: {
          some: {
            followingId: followersOf,
          },
        },
      }),
      ...(followingOf && {
        followers: {
          some: {
            followerId: followingOf,
          },
        },
      }),
      id: {
        not: user?.id,
      },
      name: {
        not: null,
      },
      username: {
        not: null,
      },
    },
    include: includeToUser(user?.id),
    take: limit,
    skip: offset,
  });

  if (res === null) {
    return NextResponse.json(null);
  }

  const users = res.map((singleUser) => toGetUser(singleUser));
  return NextResponse.json<GetUser[] | null>(users);
}
