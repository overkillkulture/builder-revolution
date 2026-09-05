import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { NextResponse } from 'next/server';

const isInviteOnly = process.env.INVITE_ONLY === 'true';

export default {
  // allowDangerousEmailAccountLinking: the 206 migrated users + everyone who
  // used quick-entry already have a User row keyed by email but NO linked OAuth
  // Account. Without this, signing in with Google/GitHub for an existing email
  // throws `OAuthAccountNotLinked` — the real cause of the "sign-in error"
  // (MC-01/MC-02), NOT a redirect_uri_mismatch (the consoles are fine). Safe:
  // both Google and GitHub verify email ownership before issuing the identity,
  // so we link the incoming verified login to the existing same-email user.
  providers: [
    GitHub({ allowDangerousEmailAccountLinking: true }),
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  pages: {
    signIn: '/login',
    // Auth failures return to the door with ?error=... instead of stranding
    // the user on the bare /api/auth/error page (a dead end with no way back —
    // where every "google/github is broke" report ended up).
    error: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname, search } = nextUrl;
      const isLoggedIn = !!auth?.user;
      const isOnAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
      const isApiRoute = pathname.startsWith('/api/');
      const isStaticAsset = pathname.startsWith('/_next/');
      // /removed is the terminal page for a banned user (S447) — must stay
      // reachable when logged-out, or the ban flow can't land anywhere.
      // /lobby is the S477 guest verify-to-enter page — must stay reachable while
      // logged IN as a guest (that's who it's for) and NOT be an auth page, or the
      // edge would bounce a logged-in guest to /main and reopen the S446 loop.
      const isPublicRoute = pathname.startsWith('/meet') || pathname === '/removed' || pathname === '/lobby';

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
