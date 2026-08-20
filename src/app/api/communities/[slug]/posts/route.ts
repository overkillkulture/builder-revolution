/**
 * GET /api/communities/:slug/posts?category=X&cursor=&limit=&sort-direction=
 * - Lists posts scoped to one community, optionally filtered to one of its
 *   categories. Mirrors /api/posts/hashtag/:hashtag (same cursor pagination).
 *
 * POST /api/communities/:slug/posts
 * - Creates a text post scoped to this community + category. Auth required.
 *   Text-only for v1 — no visual media upload (survivor-space posts are
 *   testimony-first; file upload can be added later without breaking this).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma/prisma';
import { selectPost } from '@/lib/prisma/selectPost';
import { toGetPost } from '@/lib/prisma/toGetPost';
import { GetPost } from '@/types/definitions';
import { getServerUser } from '@/lib/getServerUser';
import { usePostsSorter } from '@/hooks/usePostsSorter';
import { convertMentionUsernamesToIds } from '@/lib/convertMentionUsernamesToIds';
import { mentionsActivityLogger } from '@/lib/mentionsActivityLogger';

const createSchema = z.object({
  content: z.string().trim().min(1, 'Post cannot be empty.').max(5000),
  category: z.string().trim().min(1).optional(),
});

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const [user] = await getServerUser();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const { filters, limitAndOrderBy } = usePostsSorter(request.url);

  const community = await prisma.community.findUnique({ where: { slug: params.slug }, select: { id: true } });
  if (!community) {
    return NextResponse.json({ error: 'Community not found' }, { status: 404 });
  }

  const res = await prisma.post.findMany({
    where: {
      communityId: community.id,
      ...(category && { category }),
      ...filters,
    },
    ...limitAndOrderBy,
    select: selectPost(user?.id),
  });

  const posts = await Promise.all(res.map(toGetPost));
  return NextResponse.json<GetPost[]>(posts);
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const community = await prisma.community.findUnique({ where: { slug: params.slug }, select: { id: true } });
  if (!community) {
    return NextResponse.json({ error: 'Community not found' }, { status: 404 });
  }

  try {
    const body = createSchema.parse(await request.json());

    // Resolve @username mentions to ids so the mention link renders AND the
    // mentioned user gets a notification — same as the main feed (serverWritePost).
    // Without this, tagging someone in a community room did nothing (S446).
    const { str, usersMentioned } = await convertMentionUsernamesToIds({ str: body.content });

    const res = await prisma.post.create({
      data: {
        content: str,
        category: body.category,
        communityId: community.id,
        userId: user.id,
      },
      select: selectPost(user.id),
    });

    await mentionsActivityLogger({
      usersMentioned,
      activity: {
        type: 'POST_MENTION',
        sourceUserId: user.id,
        sourceId: res.id,
      },
      isUpdate: false,
    });

    return NextResponse.json<GetPost>(await toGetPost(res));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 422 });
    }
    return NextResponse.json({ error: 'Error creating post.' }, { status: 500 });
  }
}
