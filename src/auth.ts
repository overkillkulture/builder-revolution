import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import authConfig from '@/auth.config';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/prisma/prisma';

// S432 BG-5 step 1 (identity bridge) — the main site (100xbuilder.io) issues
// Supabase Auth sessions; this app has its own separate login. A builder
// arriving here from the main site carries their Supabase access token, and
// this endpoint is the SAME verification every main-site Netlify function
// already does (dm-api.mjs, push-api.mjs: GET /auth/v1/user). Public/anon
// key only — safe to ship, it can only ask "whose token is this?", not act
// as that user.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lgibygzcbvrrykfaxvbg.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_MZ5nb_Ha-F1_iZWj54a8pw_yGw9eXeV';

declare module 'next-auth' {
  interface Session {
    // S447: role + status ride in the session so route handlers can authorize
    // without an extra query, and the protected layout can revoke banned users.
    // (JWT itself extends Record<string, unknown>, so token.role/status need no
    // augmentation — only a cast on read in the session callback below.)
    // S477: `tier` = the 2-rung trust ladder. 'guest' = passwordless quick-entry
    // (synthetic @community.local email, no linked OAuth account) — can watch.
    // 'verified' = OAuth / supabase-bridge / any real email — can enter the rooms.
    user: { id: string; name?: string; role: string; status: string; tier: string };
  }
}

// S477 2-rung gate: a "guest" is a passwordless quick-entry principal — it lives
// in the synthetic @community.local namespace AND has no linked OAuth Account.
// Anyone with a real email (the 206 migrated users, OAuth logins, supabase-bridge)
// is "verified". A guest who later links Google/GitHub gains an Account row and is
// re-evaluated as verified on their next request. Missing user => treat as guest.
function isGuestUser(u?: { email: string | null; accounts: { id: string }[] } | null): boolean {
  if (!u) return true;
  return (u.email || '').endsWith('@community.local') && u.accounts.length === 0;
}

// Privileged/system identities that may NEVER be entered via passwordless
// quick-entry (they must use real OAuth login).
const RESERVED = new Set([
  'commander', 'admin', 'administrator', 'araya', 'root', 'owner', 'staff',
  'moderator', 'mod', 'system', 'support', 'official', 'superadmin', 'sysadmin',
  'team', 'help',
]);
// Common Cyrillic/Greek homoglyphs -> ASCII, so "Cοmmander" (Greek omicron) or
// "аdmin" (Cyrillic a) can't slip a privileged DISPLAY name past the check.
const CONFUSABLES: Record<string, string> = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', к: 'k', м: 'm',
  т: 't', н: 'h', в: 'b', і: 'i', ѕ: 's', ԁ: 'd', ο: 'o', α: 'a', ρ: 'p',
  ε: 'e', ι: 'i', ν: 'v', τ: 't', κ: 'k', υ: 'u', η: 'n',
};
function foldName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (Admín -> admin)
    .split('')
    .map((ch) => CONFUSABLES[ch] ?? ch)
    .join('');
}
// True if the display name impersonates a reserved identity — as a whole word
// ("Commander X"), a homoglyph ("Cοmmander"), or the whole cleaned string.
function looksReserved(displayName: string): boolean {
  const folded = foldName(displayName);
  const tokens = folded.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.some((t) => RESERVED.has(t)) || RESERVED.has(folded.replace(/[^a-z0-9]/g, ''));
}

export const {
  auth,
  handlers: { GET, POST },
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    // Quick-entry login: just type a name and you're in
    Credentials({
      id: 'quick-entry',
      name: 'Quick Entry',
      credentials: {
        name: { label: 'Your Name', type: 'text', placeholder: 'Enter any name to join' },
      },
      async authorize(credentials) {
        const name = credentials?.name as string;
        if (!name || name.trim().length < 1) return null;

        const input = name.trim();
        const isEmail = input.includes('@') && input.includes('.');
        // Quick-entry is PASSWORDLESS, so it lives in its own synthetic
        // @community.local namespace and may never mint or resume a real-email
        // identity. This is the fix for the account-takeover hole: typing an
        // existing user's name used to log you in AS them (incl. "Commander").
        const guestUsername = (isEmail ? input.split('@')[0] : input)
          .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'guest';
        const guestEmail = `${guestUsername}@community.local`;

        // RESERVED — a privileged identity can't be entered passwordlessly, via
        // the slug OR the raw DISPLAY name (incl. homoglyphs / "Commander X").
        if (RESERVED.has(guestUsername) || looksReserved(input)) return null;

        // INVITE-ONLY: check input against allowlist before creating user
        if (process.env.INVITE_ONLY === 'true') {
          const allowList = (process.env.ALLOWED_USERS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
          if (allowList.length > 0) {
            const realEmail = isEmail ? input.toLowerCase() : '';
            if (!allowList.includes(realEmail) && !allowList.includes(guestUsername) && !allowList.includes(input.toLowerCase())) {
              return null;
            }
          }
        }

        // Block impersonating a REAL account (OAuth-linked, or any
        // non-@community.local verified email) that matches this name.
        const clash = await prisma.user.findFirst({
          where: { OR: [{ email: guestEmail }, { username: guestUsername }] },
          include: { accounts: { select: { id: true }, take: 1 } },
        });
        const clashIsReal = !!clash && !((clash.email || '').endsWith('@community.local') && clash.accounts.length === 0);
        if (clashIsReal) return null;

        // Guest sessions are EPHEMERAL: never RESUME an existing guest by name —
        // name-only resume let anyone type your name and read your DMs (S446).
        // Always mint a fresh, uniquely-named guest. Want your account back later?
        // Sign in with Google/GitHub (those persist and are protected above).
        const uname = clash ? `${guestUsername}-${Math.random().toString(36).slice(2, 6)}` : guestUsername;
        const user = await prisma.user.create({
          data: { username: uname, name: isEmail ? guestUsername : input, email: `${uname}@community.local` },
        });

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
    // S432 BG-5 step 1 — silent sign-in for a builder who's already signed in
    // on the main site. Identity comes ONLY from Supabase's verified answer,
    // never from a client-claimed email (mirrors the main site's own rule).
    Credentials({
      id: 'supabase-bridge',
      name: 'Supabase Bridge',
      credentials: {
        token: { label: 'Supabase token', type: 'text' },
      },
      async authorize(credentials) {
        const token = credentials?.token as string;
        if (!token) return null;

        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
        });
        if (!res.ok) return null;
        const sbUser = await res.json();
        const email = (sbUser?.email || '').toLowerCase();
        if (!email) return null;

        let user = await prisma.user.findFirst({ where: { email } });
        if (!user) {
          const localPart = email.split('@')[0].replace(/[^a-z0-9-]/g, '') || 'builder';
          const fullName = sbUser?.user_metadata?.full_name || sbUser?.user_metadata?.display_name || localPart;
          // username is @unique. A quick-entry guest may already hold `localPart`
          // (or two real users share a local-part), which would throw and BREAK
          // the silent main-site->chat bridge for that victim. Suffix on collision.
          let username = localPart;
          const taken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
          if (taken) username = `${localPart}-${Math.random().toString(36).slice(2, 6)}`;
          user = await prisma.user.create({
            data: { username, name: fullName, email },
          });
        }

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    // S437 (Commander: "makes me sign in every single time"): sessions live 90
    // days and refresh daily — the front door stays open once you're through it.
    maxAge: 60 * 60 * 24 * 90,
    updateAge: 60 * 60 * 24,
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }): Promise<boolean> {
      // INVITE-ONLY MODE: only whitelisted users can sign in
      if (process.env.INVITE_ONLY === 'true') {
        const allowList = (process.env.ALLOWED_USERS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        // If no allowlist configured, let everyone in (fail-open for setup)
        if (allowList.length === 0) return true;
        const email = (user.email || '').toLowerCase();
        const name = (user.name || '').toLowerCase().replace(/\s+/g, '-');
        // Check email, username-style name, or GitHub username
        const githubUsername = (account?.providerAccountId || '').toLowerCase();
        if (allowList.includes(email) || allowList.includes(name) || allowList.includes(githubUsername)) {
          return true;
        }
        return false;
      }
      return true;
    },
    // S447 moderation spine — the loop-free half of session revocation.
    // This jwt callback runs on every auth() call, but ONLY in the Node runtime
    // (auth.ts). The edge middleware uses auth.config.ts, which has NO jwt
    // callback and never touches Prisma — that split is deliberate: the S446
    // attempt looped because the edge trusted the JWT while a per-request page
    // DB-check disagreed. Here the enforcement lands in ONE place (the protected
    // layout -> /removed), never a /login bounce, so there is no loop.
    async jwt({ token, user }) {
      // Sign-in: stamp role/status from the freshly-authorized user.
      if (user?.id) {
        const u = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, status: true, email: true, accounts: { select: { id: true }, take: 1 } },
        });
        token.role = u?.role ?? 'user';
        token.status = u?.status ?? 'active';
        token.tier = isGuestUser(u) ? 'guest' : 'verified';
        return token;
      }
      // Every subsequent request: cheap indexed PK read so a ban takes effect
      // immediately (and a promoted role refreshes without a re-login). A single
      // sub-ms lookup per authenticated request — fine at launch scale; the
      // tokenVersion optimization is the SPAWN in WO-chat-moderation-spine.
      if (token.sub) {
        try {
          const u = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, status: true, email: true, accounts: { select: { id: true }, take: 1 } },
          });
          // Deleted user => treat as removed (revoke), not as active.
          token.status = u ? u.status : 'banned';
          token.role = u?.role ?? token.role ?? 'user';
          // Refresh tier every request so a guest->verified upgrade (they linked
          // OAuth) takes effect, and pre-S477 sessions get backfilled. Deleted
          // user keeps prior tier (it no longer matters — status=banned wins).
          token.tier = u ? (isGuestUser(u) ? 'guest' : 'verified') : (token.tier ?? 'guest');
        } catch {
          // DB blip: keep the prior token. Fail OPEN for availability — banning
          // is rare, a transient DB error must not log the whole community out.
        }
      }
      return token;
    },
    session({ token, ...rest }) {
      return {
        user: {
          id: token.sub!,
          name: token.name ?? undefined,
          role: (token.role as string | undefined) ?? 'user',
          status: (token.status as string | undefined) ?? 'active',
          // Default 'verified' (fail-open) so a token that predates tier-stamping
          // never wrongly loses room access for a request; the jwt callback above
          // runs first on every request and stamps the real value from the DB.
          tier: (token.tier as string | undefined) ?? 'verified',
        },
        expires: rest.session.expires,
      };
    },
  },
});
