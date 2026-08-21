import { getServerUser, isStaff } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { redirect } from 'next/navigation';
import { AdminUserRow } from './AdminUserRow';

export const metadata = { title: 'Admin · Moderation' };

// S447 moderation spine — the "tiny admin action" surface. Admin/staff only
// (double-gated: role here + role on the ban API). Lists members with a
// ban/unban toggle. Deliberately minimal; room-level roles wire off this later.
export default async function AdminPage() {
  const [user] = await getServerUser();
  if (!isStaff(user)) redirect('/main');

  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true, email: true, role: true, status: true },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    take: 500,
  });

  return (
    <div className="px-3 py-4 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold">Moderation</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {users.length} members · you are <span className="font-semibold">{user?.role}</span>. Banning
        revokes access on the member&apos;s next request.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <AdminUserRow key={u.id} user={u} isSelf={u.id === user?.id} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
