import { getServerUser } from '@/lib/getServerUser';
import { redirect } from 'next/navigation';
import { MessagesClient } from './MessagesClient';

export const metadata = {
  title: 'Builder Revolution Chat | Messages',
};

export default async function Page() {
  const [user] = await getServerUser();
  if (!user) redirect('/login?from=/messages');

  return <MessagesClient userId={user.id} />;
}
