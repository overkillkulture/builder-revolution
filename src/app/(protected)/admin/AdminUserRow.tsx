'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// S447 — one member row with a ban/unban toggle. Client component so the button
// can hit POST /api/admin/users/:id/ban and refresh. The server route is the
// real authority; this is just the trigger.
export function AdminUserRow({
  user,
  isSelf,
}: {
  user: { id: string; name: string | null; username: string | null; email: string | null; role: string; status: string };
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const banned = user.status === 'banned';

  async function toggle() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: banned ? 'unban' : 'ban' }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b?.error || `Failed (${res.status})`);
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2">
        {user.name || user.username || 'Unnamed'}
        {user.username ? <span className="text-muted-foreground"> @{user.username}</span> : null}
      </td>
      <td className="px-3 py-2 text-muted-foreground">{user.email}</td>
      <td className="px-3 py-2">{user.role}</td>
      <td className="px-3 py-2">
        <span className={banned ? 'font-semibold text-red-600' : 'text-green-600'}>{user.status}</span>
      </td>
      <td className="px-3 py-2 text-right">
        {isSelf || user.role === 'admin' ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
              banned ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {busy ? '…' : banned ? 'Unban' : 'Ban'}
          </button>
        )}
        {error ? <div className="text-xs text-red-600">{error}</div> : null}
      </td>
    </tr>
  );
}
