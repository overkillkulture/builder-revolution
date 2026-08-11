'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// S432 BG-5 step 1 — a builder arriving from the main site (100xbuilder.io)
// carries their already-signed-in Supabase session as ?sb_token=<jwt> on the
// link out. Bridge them in silently via the supabase-bridge provider instead
// of making them re-enter a name here. Renders nothing when there's no
// token — the manual quick-entry form (UserAuthForm) is untouched.
export function SupabaseBridge() {
  const searchParams = useSearchParams();
  const token = searchParams.get('sb_token');
  const callbackUrl =
    searchParams.get('from') || (process.env.NEXT_PUBLIC_INVITE_ONLY === 'true' ? '/messages' : '/feed');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    signIn('supabase-bridge', { token, callbackUrl, redirect: true }).then((result) => {
      if (result?.error) setFailed(true);
    });
  }, [token, callbackUrl]);

  if (!token || failed) return null;

  return (
    <div className="mb-6 rounded-lg border border-primary/20 bg-card p-4 text-center text-sm text-card-foreground">
      Signing you in from 100X Builder…
    </div>
  );
}
