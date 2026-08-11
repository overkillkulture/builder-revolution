import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { NextResponse } from 'next/server';

const isInviteOnly = process.env.INVITE_ONLY === 'true';

export default {
  providers: [GitHub, Google],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname, search } = nextUrl;
      const isLoggedIn = !!auth?.user;
      const isOnAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
      const isApiRoute = pathname.startsWith('/api/');
      const isStaticAsset = pathname.startsWith('/_next/');
      const isPublicRoute = pathname.startsWith('/meet');

      if (isInviteOnly) {
        // INVITE-ONLY MODE — everything is locked except login page, /meet, and API/assets
        if (isApiRoute || isStaticAsset || pathname === '/terms' || isPublicRoute) return true;
        if (isOnAuthPage) {
          if (isLoggedIn) return NextResponse.redirect(new URL('/main', nextUrl));
          return true;
        }
        // Not logged in → go to login (one click, no feed browsing)
        if (!isLoggedIn) {
          return NextResponse.redirect(new URL('/login', nextUrl));
        }
        // Logged in → let them through
        return true;
      }

      // OPEN COMMUNITY — let people browse without logging in
      const protectedPages = ['/setup', '/edit-profile', '/messages', '/notifications', '/main'];
      const isProtectedPage = protectedPages.some((page) => pathname.startsWith(page));

      if (isOnAuthPage) {
        if (isLoggedIn) return NextResponse.redirect(new URL('/main', nextUrl));
      } else if (isProtectedPage) {
        if (!isLoggedIn) {
          const from = encodeURIComponent(pathname + search);
          return NextResponse.redirect(new URL(`/login?from=${from}`, nextUrl));
        }
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
