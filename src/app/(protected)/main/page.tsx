import { getServerUser } from '@/lib/getServerUser';
import { redirect } from 'next/navigation';
import { MainViewClient } from './MainViewClient';

export const metadata = {
  title: 'Builder Revolution Chat | Main',
};

export default async function Page() {
  const [user] = await getServerUser();
  if (!user) redirect('/login?from=/main');

  return <MainViewClient userId={user.id} />;
}
