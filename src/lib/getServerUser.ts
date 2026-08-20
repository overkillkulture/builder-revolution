import 'server-only';
import { auth } from '@/auth';

export async function getServerUser() {
  const session = await auth();
  const user = session?.user;
  return [user];
}

// NOTE (S446): a per-request DB liveness check WAS added here to revoke deleted
// users' sessions, but it conflicts with the edge middleware — the middleware
// redirects a valid-JWT-but-deleted user /login -> /main while the page sends
// /main -> /login, causing a redirect loop + a 401 flood. Reverted to keep auth
// robust for launch. Proper revocation needs a loop-free approach (invalidate
// the session/cookie on delete, or make the middleware + /login liveness-aware
// together) — tracked as a follow-up, not a per-request check here.
