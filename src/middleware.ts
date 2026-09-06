import authConfig from '@/auth.config';
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

// WO-gate-funnel-tracking (S487): `fk` = one anonymous visitor cookie so the
// funnel can count DISTINCT people across gate_view -> enter -> first message
// (raw event counts can't tell 10 people from 1 person refreshing 10 times).
// Set here (edge, no DB); read by the server-side logFunnel call sites. The
// auth `authorized` callback still runs first — its redirects win, and the
// cookie just gets set on the next non-redirect request.
export default auth((req) => {
  const res = NextResponse.next();
  if (!req.cookies.get('fk')) {
    res.cookies.set('fk', crypto.randomUUID(), {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }
  return res;
});

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!api|_next/static|_next/image|.png|.jpg|.jpeg|favicon.ico).*)'],
};
