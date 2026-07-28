/**
 * POST /api/reports
 * - Files a content/crisis-safety report on a post (distinct from BugReport,
 *   which is app bugs). The "step zero" gate before Johnny's survivor space
 *   carries real trauma disclosures — this must reach a human, not just a
 *   delete button. Works for signed-in AND anonymous reporters: a survivor
 *   flagging something urgent shouldn't be blocked by a login wall.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma/prisma';
import { getServerUser } from '@/lib/getServerUser';

const reportSchema = z.object({
  postId: z.number().int(),
  reason: z.string().trim().min(1, 'Please describe why you are reporting this.').max(1000),
  isUrgent: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const [user] = await getServerUser();

  try {
    const body = reportSchema.parse(await request.json());

    const post = await prisma.post.findUnique({ where: { id: body.postId }, select: { id: true } });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const report = await prisma.report.create({
      data: {
        postId: body.postId,
        reporterId: user?.id,
        reason: body.reason,
        isUrgent: body.isUrgent,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: report.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 422 });
    }
    return NextResponse.json({ error: 'Error filing report.' }, { status: 500 });
  }
}
