import 'server-only';
import { auth } from '@/auth';

export async function getServerUser() {
  const session = await auth();
  const user = session?.user;
  return [user];
}

// S447: the S446 revocation loop is now solved in src/auth.ts's jwt callback
// (Node-only liveness read) + enforcement in the (protected) layout, which sends
// a banned user to /removed via the cookie-clearing /api/session/kick route —
// NEVER a /login bounce, so there is no redirect loop. `user.status` and
// `user.role` now ride in the session for cheap authorization below.

// True when the signed-in user holds an elevated role. Use in route handlers
// that must be admin/staff-only (e.g. GET /api/bugs, admin ban actions).
export function isStaff(user?: { role?: string }): boolean {
  return user?.role === 'admin' || user?.role === 'staff';
}
