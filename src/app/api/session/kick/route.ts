import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/session/kick — S447 moderation spine. The protected layout sends a
// banned user here. We CLEAR the Auth.js session cookie(s) and 302 them to the
// public /removed page. Clearing the cookie is what makes revocation loop-free:
// on the next request the edge middleware also sees a logged-out user, so it
// can't bounce them /login -> /main against a page that thinks they're banned.
// This route lives under /api so the middleware matcher never gates it.
export async function GET() {
  // Relative Location (not new URL(..., request.url)): behind Railway's proxy
  // request.url resolves to the internal host (localhost:8080), which would send
  // the browser to a dead origin. A relative redirect resolves against the
  // public origin the browser actually used.
  const res = new NextResponse(null, { status: 307, headers: { Location: '/removed' } });
  const store = await cookies();
  for (const c of store.getAll()) {
    // Auth.js v5 default: authjs.session-token / __Secure-authjs.session-token
    // (+ chunked .0/.1). Also cover the legacy next-auth.* name. Expire any of
    // them so the browser drops the credential immediately.
    if (c.name.includes('session-token')) {
      res.cookies.set(c.name, '', { expires: new Date(0), path: '/', maxAge: 0 });
    }
  }
  return res;
}
