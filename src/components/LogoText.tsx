import { cn } from '@/lib/cn';
import React from 'react';

// NEXT_PUBLIC_* so the name survives into client components; server-only vars as fallback.
const instanceName = process.env.NEXT_PUBLIC_INSTANCE_NAME || process.env.INSTANCE_NAME || 'Builder Revolution Chat';
const isHQ = process.env.NEXT_PUBLIC_INVITE_ONLY === 'true' || process.env.INVITE_ONLY === 'true';

interface LogoTextProps extends React.HTMLAttributes<HTMLHeadElement> {}
export function LogoText({ ...rest }: LogoTextProps) {
  if (isHQ) {
    return (
      <h1 {...rest} className={cn('font-bold text-primary', rest.className)}>
        Case Builder<span className="text-foreground/40 text-[0.5em] ml-1">HQ</span>
      </h1>
    );
  }
  return (
    <h1 {...rest} className={cn('font-bold text-primary', rest.className)}>
      {instanceName}
    </h1>
  );
}
