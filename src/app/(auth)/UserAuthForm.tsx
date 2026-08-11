'use client';

import Button from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useToast } from '@/hooks/useToast';
import { Github, Google, LogInSquare, Profile } from '@/svg_components';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

export function UserAuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState({
    quickEntry: false,
    github: false,
    google: false,
  });
  const areButtonsDisabled = loading.quickEntry || loading.github || loading.google;
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('from') || '/main';
  const { showToast } = useToast();

  const onNameChange = useCallback((text: string) => {
    setName(text);
  }, []);

  const submitQuickEntry = useCallback(async () => {
    if (!name.trim()) return;
    setLoading((prev) => ({ ...prev, quickEntry: true }));

    const result = await signIn('quick-entry', {
      name: name.trim(),
      callbackUrl,
      redirect: true,
    });

    setLoading((prev) => ({ ...prev, quickEntry: false }));
    if (result?.error) {
      showToast({ type: 'error', title: 'Something went wrong' });
    }
  }, [name, callbackUrl, showToast]);

  const signInWithProvider = useCallback(
    (provider: 'github' | 'google') => async () => {
      setLoading((prev) => ({ ...prev, [provider]: true }));
      const result = await signIn(provider, { callbackUrl });
      setLoading((prev) => ({ ...prev, [provider]: false }));
      if (result?.error) {
        showToast({ type: 'error', title: 'Something went wrong' });
      }
    },
    [callbackUrl, showToast],
  );

  return (
    <>
      {/* QUICK ENTRY — no gate, just a name */}
      <div className="mb-4">
        <TextInput
          value={name}
          onChange={onNameChange}
          label={process.env.NEXT_PUBLIC_INVITE_ONLY === 'true' ? "Your Email" : "Your Name"}
          Icon={Profile}
        />
      </div>
      <div className="mb-5">
        <Button
          onPress={submitQuickEntry}
          shape="pill"
          expand="full"
          Icon={LogInSquare}
          loading={loading.quickEntry}
          isDisabled={areButtonsDisabled || !name.trim()}>
          Jump In
        </Button>
      </div>

      {/* OAuth options */}
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center px-1">
          <span className="w-full border-t border-muted" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-muted-foreground">OR SIGN IN WITH</span>
        </div>
      </div>
      <div className="mb-4 flex gap-3">
        <Button
          onPress={signInWithProvider('github')}
          shape="pill"
          expand="full"
          mode="subtle"
          Icon={Github}
          loading={loading.github}
          isDisabled={areButtonsDisabled}>
          GitHub
        </Button>
        <Button
          onPress={signInWithProvider('google')}
          shape="pill"
          expand="full"
          mode="subtle"
          Icon={Google}
          loading={loading.google}
          isDisabled={areButtonsDisabled}>
          Google
        </Button>
      </div>
    </>
  );
}
