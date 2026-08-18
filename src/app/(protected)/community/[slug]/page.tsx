import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma/prisma';
import { getServerUser } from '@/lib/getServerUser';
import { CommunityFeed } from '@/components/CommunityFeed';
import { normalizeBrand } from '@/types/community';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const community = await prisma.community.findUnique({ where: { slug: params.slug }, select: { name: true } });
  return { title: community ? `${community.name} | Builder Revolution Chat` : 'Community' };
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
  const brand = normalizeBrand(community.brandConfig);

  return (
    <div className="min-h-screen px-2 pb-20 pt-3 sm:px-4 sm:pt-4" style={{ background: brand.bg, color: brand.text }}>
      <div className="mb-4">
        <h1 className="text-2xl font-bold sm:text-4xl">{community.name}</h1>
      </div>
      <CommunityFeed slug={params.slug} brand={brand} canPost={!!user} />
    </div>
  );
}
