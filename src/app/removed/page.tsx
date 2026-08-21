import Link from 'next/link';

export const metadata = {
  title: 'Access removed',
};

// S447 — the terminal page for a removed/banned user. Public (allowlisted in
// auth.config.ts) and static: it never reads the session and never redirects, so
// it cannot participate in a redirect loop. By the time a user lands here the
// /api/session/kick route has already cleared their session cookie.
export default function RemovedPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold sm:text-3xl">Your access has been removed</h1>
      <p className="max-w-md text-muted-foreground">
        An administrator has removed your access to this community. If you believe this was a
        mistake, please contact the community team.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground"
      >
        Return home
      </Link>
    </div>
  );
}
