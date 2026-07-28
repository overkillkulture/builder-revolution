/**
 * GET /api/communities/:slug
 * - Returns a community's public info (name + brand theme) for the
 *   /community/:slug page header. No auth required — same visibility
 *   as the community's public feed.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const community = await prisma.community.findUnique({
    where: { slug: params.slug },
    select: { id: true, slug: true, name: true, brandConfig: true },
  });

  if (!community) {
    return NextResponse.json({ error: 'Community not found' }, { status: 404 });
  }

  return NextResponse.json(community);
}
