'use client';

import { useCallback, useState } from 'react';
import { apiUrl } from '@/lib/apiUrl';
import { CommunityBrandConfig } from '@/types/community';

export function CommunityReportButton({ postId, brand }: { postId: number; brand: CommunityBrandConfig }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = useCallback(async () => {
    if (!reason.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch(apiUrl('/api/reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reason, isUrgent }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }, [postId, reason, isUrgent]);

  if (status === 'sent') {
    return <p className="mt-2 text-xs" style={{ color: brand.accent2 }}>Report sent. Thank you for keeping this space safe.</p>;
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-2 text-xs underline opacity-60 hover:opacity-100"
        style={{ color: brand.text }}
      >
        Report
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg p-3" style={{ background: brand.bg, border: `1px solid ${brand.line}` }}>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="What's wrong with this post? (goes to a real human, not just deleted)"
        rows={2}
        className="w-full resize-none rounded-md bg-transparent p-2 text-sm outline-none"
        style={{ color: brand.text, border: `1px solid ${brand.line}` }}
      />
      <label className="mt-2 flex items-center gap-2 text-xs" style={{ color: brand.text }}>
        <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} />
        This is urgent — someone may be in danger
      </label>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={status === 'sending' || !reason.trim()}
          className="rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50"
          style={{ background: brand.alert, color: '#fff' }}
        >
          {status === 'sending' ? 'Sending…' : 'Send report'}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-md px-3 py-1 text-xs opacity-60 hover:opacity-100"
          style={{ color: brand.text }}
        >
          Cancel
        </button>
      </div>
      {status === 'error' && <p className="mt-1 text-xs" style={{ color: brand.alert }}>Couldn&apos;t send — try again.</p>}
    </div>
  );
}
