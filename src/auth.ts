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
    user: { id: string; name: string };
  }
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

        // Resume an existing GUEST account only. A real account (OAuth-linked,
        // or any non-@community.local verified email) may never be entered by
        // typing its name — those must sign in for real.
        const existing = await prisma.user.findFirst({
          where: { OR: [{ email: guestEmail }, { username: guestUsername }] },
          include: { accounts: { select: { id: true }, take: 1 } },
        });
        if (existing) {
          const isGuest = (existing.email || '').endsWith('@community.local') && existing.accounts.length === 0;
          if (!isGuest) return null;
          return { id: existing.id, name: existing.name, email: existing.email };
        }

        const user = await prisma.user.create({
          data: { username: guestUsername, name: isEmail ? guestUsername : input, email: guestEmail },
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
    session({ token, user, ...rest }) {
      return {
        user: {
          id: token.sub!,
        },
        expires: rest.session.expires,
      };
    },
  },
});
