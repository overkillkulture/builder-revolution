import { getServerUser, isStaff } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { NextResponse } from 'next/server';

// POST /api/admin/users/:userId/ban — S447 moderation spine admin action.
// Body: { action: 'ban' | 'unban' }. Admin/staff only. Sets User.status, which
// the Node-only jwt callback reads on the target's next request to revoke access
// (loop-free — see src/auth.ts + the (protected) layout). Additive + reversible.
export async function POST(
  request: Request,
  { params }: { params: { userId: string } },
) {
  const [actor] = await getServerUser();
  if (!actor) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });

  const { userId } = params;
  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  if (action !== 'ban' && action !== 'unban') {
    return NextResponse.json({ error: "action must be 'ban' or 'unban'." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, name: true, username: true },
  });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // Guardrails: never ban yourself, and staff can't ban an admin (only an admin
  // can, and even then not another admin) — prevents a lockout / mod war.
  if (action === 'ban') {
    if (target.id === actor.id) {
      return NextResponse.json({ error: 'You cannot ban yourself.' }, { status: 400 });
    }
    if (target.role === 'admin') {
      return NextResponse.json({ error: 'Cannot ban an admin.' }, { status: 403 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: action === 'ban' ? 'banned' : 'active' },
    select: { id: true, name: true, username: true, status: true, role: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
