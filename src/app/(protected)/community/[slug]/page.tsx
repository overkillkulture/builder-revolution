import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma/prisma';
import { getServerUser } from '@/lib/getServerUser';
import { normalizeBrand } from '@/types/community';
import { WatchDoor } from '@/components/WatchDoor';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const community = await prisma.community.findUnique({ where: { slug: params.slug }, select: { name: true } });
  return { title: community ? `${community.name} | Main Chat` : 'Community' };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const community = await prisma.community.findUnique({
    where: { slug: params.slug },
    select: { name: true, brandConfig: true },
  });

  // Only 404 if the ROOM itself doesn't exist. A room with a missing/partial
  // brandConfig is still a real room — normalizeBrand fills in a safe theme
  // instead of letting the client crash (was the Case/Movement whole-site crash).
  if (!community) notFound();

  const [user] = await getServerUser();

  // S453 chat consolidation (WO-view-03-chat-redo): the /community/* page was a
  // SECOND, near-empty "Posts feed" chat surface — the "demented" room link a
  // shared URL used to open. The real conversation (all 425 migrated messages)
  // lives in /main. Signed-in members go straight to the real chat; the scattered
  // feed surface is retired per the S436 "it all goes to one place" order.
  if (user) redirect('/main');

  // Signed OUT (a shared "watch" link): render a clean, on-brand door instead of
  // the old giant nag bar stacked over test messages.
  const brand = normalizeBrand(community.brandConfig);
  return <WatchDoor name={community.name} slug={params.slug} brand={brand} />;
}
