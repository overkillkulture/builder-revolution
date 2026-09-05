'use client';

import { useSearchParams } from 'next/navigation';

export function InviteOnlyBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  if (!error) return null;

  if (error === 'InviteOnly') {
    return (
      <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
        <p className="text-sm font-semibold text-red-400">Access by Invitation Only</p>
        <p className="mt-1 text-xs text-red-300/70">
          This workspace is private. Contact the administrator for an invite.
        </p>
      </div>
    );
  }

  // Any other auth error (pages.error routes failures here) — say something
  // human instead of stranding the user with no explanation.
  return (
    <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
      <p className="text-sm font-semibold text-red-400">That sign-in didn&apos;t go through</p>
      <p className="mt-1 text-xs text-red-300/70">
        Try the Google or GitHub button again. If it keeps failing, use the name box to
        enter as a guest and report it with the bug button.
      </p>
    </div>
  );
}
