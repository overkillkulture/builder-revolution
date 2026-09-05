'use client';

import Button from '@/components/ui/Button';
import { Github, Google } from '@/svg_components';
import { signIn, signOut } from 'next-auth/react';
import { useCallback, useState } from 'react';

// The one-tap verify step. Mirrors the OAuth half of UserAuthForm, but lands the
// user back in the rooms (/main) once they carry a real identity. The guest
// session must NOT ride into the OAuth flow: with a session active, Auth.js
// LINKS the incoming Google/GitHub identity to the current user — which either
// errors for every returning member ("account is already associated with
// another user", the /api/auth/error dead end) or welds a real identity onto
// the ephemeral guest row instead of resuming their real account. Guests are
// disposable by design (they can't post, they have no history), so we drop the
// guest first and run a clean sessionless sign-in — auth.config.ts
// allowDangerousEmailAccountLinking then resumes-or-creates the right user by
// verified email, and their tier comes back 'verified'.
export function LobbyVerify() {
  const [loading, setLoading] = useState({ github: false, google: false });
  const disabled = loading.github || loading.google;

  const verifyWith = useCallback(
    (provider: 'github' | 'google') => async () => {
      setLoading((prev) => ({ ...prev, [provider]: true }));
      await signOut({ redirect: false });
      await signIn(provider, { callbackUrl: '/main' });
    },
    [],
  );

  return (
    <div className="flex flex-col gap-3">
      <Button
        onPress={verifyWith('google')}
        shape="pill"
        expand="full"
        Icon={Google}
        loading={loading.google}
        isDisabled={disabled}>
        Verify with Google
      </Button>
      <Button
        onPress={verifyWith('github')}
        shape="pill"
        expand="full"
        mode="subtle"
        Icon={Github}
        loading={loading.github}
        isDisabled={disabled}>
        Verify with GitHub
      </Button>
    </div>
  );
}
