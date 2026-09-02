'use client';

import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { Github, Google } from '@/svg_components';
import { signIn } from 'next-auth/react';
import { useCallback, useState } from 'react';

// The one-tap verify step. Mirrors the OAuth half of UserAuthForm, but lands the
// user back in the rooms (/main) once they've linked a real identity. Linking an
// OAuth Account is exactly what flips their tier guest -> verified on the next
// request (see isGuestUser in src/auth.ts).
export function LobbyVerify() {
  const [loading, setLoading] = useState({ github: false, google: false });
  const disabled = loading.github || loading.google;
  const { showToast } = useToast();

  const verifyWith = useCallback(
    (provider: 'github' | 'google') => async () => {
      setLoading((prev) => ({ ...prev, [provider]: true }));
      const result = await signIn(provider, { callbackUrl: '/main' });
      setLoading((prev) => ({ ...prev, [provider]: false }));
      if (result?.error) {
        showToast({ type: 'error', title: 'Something went wrong' });
      }
    },
    [showToast],
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
