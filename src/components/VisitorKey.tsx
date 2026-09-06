'use client';

import { useEffect } from 'react';

// WO-gate-funnel-tracking: `fk` = one anonymous visitor key so the funnel can
// count DISTINCT people at gate_view (before they have a userId). Set client-
// side in the root layout — the middleware-based version took prod down for
// 8 minutes (next-auth's wrapped-callback middleware crashes this version;
// see the S487 hotfix), so the cookie is set here where nothing can 500.
// Server-side logFunnel call sites read it via cookies().
export function VisitorKey() {
  useEffect(() => {
    if (!document.cookie.split('; ').some((c) => c.startsWith('fk='))) {
      document.cookie = `fk=${crypto.randomUUID()}; path=/; max-age=31536000; samesite=lax`;
    }
  }, []);
  return null;
}
